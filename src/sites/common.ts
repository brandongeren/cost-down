// Shared plumbing for site content scripts: a floating Cost Down panel (shadow root, bottom right), price loading,
// and re-reading the deck whenever the page changes it. Each site supplies how to read its deck and, optionally,
// how to put prices onto its own page (the Limitless-style total and per-line prices, DESIGN.md §1).

import { deckSize, type RawDeck } from '../core/deck.ts'
import type { PricedDeck, PriceIndex } from '../core/prices.ts'
import { getPanelHidden, loadPrices } from '../core/store.ts'
import { h, logo, shadow } from '../ui/dom.ts'
import { DeckPanel } from '../ui/panel.ts'
import { STYLES } from '../ui/styles.ts'

export interface SiteDeck {
  deck: RawDeck
  name: string
  /** Order-list key: the same deck page always gets the same key. */
  key: string
}

export interface SiteAdapter {
  /** Reads the deck on the page now (undefined if the page has none). */
  read(index: PriceIndex): SiteDeck | undefined
  /** Puts prices on the page (called after every panel render). Must be idempotent. */
  decorate?(priced: PricedDeck | undefined, panel: DeckPanel, index: PriceIndex): void
  /** Element whose changes mean the deck may have changed (default: document.body). */
  watch?(): Element | null
  /** For sites that report deck changes themselves (e.g. a page-world script): call cb when the deck may have changed. */
  subscribe?(cb: () => void): void
  /** Positions the panel's host element (default: fixed, bottom right). Called after every render. */
  placePanel?(host: HTMLElement): void
}

const PANEL_CSS = `${STYLES}
:host { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; width: 380px; max-height: 70vh; display: block; }
.head { cursor: grab; user-select: none; touch-action: none; }
:host([data-dragging]) .head { cursor: grabbing; }
`

// The small round button left after the panel is closed; clicking it brings the panel back. It sits above the
// bottom-right corner, where sites keep their own buttons (Konami's back-to-top).
const REOPEN_CSS = `
:host { all: initial; position: fixed; right: 16px; bottom: 76px; z-index: 2147483000; }
button { width: 38px; height: 38px; padding: 3px; border-radius: 50%; border: 2px solid #1a9b7e; background: #fff;
  box-shadow: 0 3px 12px rgba(0,0,0,.3); cursor: pointer; display: grid; place-items: center; }
button:hover { transform: scale(1.08); }
.logo { width: 28px; height: 28px; border-radius: 50%; display: block; }
`

/** Marks elements Cost Down added to the page, so decorate() can find and replace its own work. */
export const MARK = 'data-cost-down'

export async function runSite(adapter: SiteAdapter): Promise<void> {
  let index: PriceIndex | undefined
  let hasDeck = false
  // Closed (with ×, or from the start when the popup's "Keep the panel hidden until I open it" is on): the panel hides
  // and the small reopen button takes its place, until reopened. Prices on the page stay either way.
  let closed = await getPanelHidden()
  const host = h('div', { [MARK]: 'panel' })
  const reopenHost = h('div', { [MARK]: 'reopen' })
  document.body.append(host, reopenHost)
  const show = () => {
    host.style.display = hasDeck && !closed ? '' : 'none'
    reopenHost.style.display = hasDeck && closed ? '' : 'none'
  }
  // Turning the switch on hides an open panel right away; turning it off leaves things as they are.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || changes.panelHidden?.newValue !== true) return
    closed = true
    show()
  })
  const reopen = () => {
    closed = false
    show()
    panel.expand()
  }
  // Where the user dragged the panel on this site (kept in storage.local per hostname); undefined = the site's default.
  let userPos = await savedPosition()
  const applyUserPos = () => {
    if (!userPos) return false
    const r = host.getBoundingClientRect()
    const left = Math.min(Math.max(0, userPos.left), window.innerWidth - Math.min(r.width || 120, window.innerWidth))
    const top = Math.min(Math.max(0, userPos.top), window.innerHeight - 40)
    Object.assign(host.style, { left: `${left}px`, top: `${top}px`, right: 'auto', bottom: 'auto' })
    return true
  }
  const placeReopen = () => {
    if (host.style.left) Object.assign(reopenHost.style, { left: host.style.left, top: host.style.top, right: 'auto', bottom: 'auto' })
  }
  const panel: DeckPanel = new DeckPanel({
    collapsible: true,
    startCollapsed: true,
    onClose: () => {
      closed = true
      show()
    },
    // On-page totals call panel.expand(); that reopens a closed panel too.
    onExpand: () => {
      if (closed) reopen()
    },
    onPriced: (priced) => {
      if (index) adapter.decorate?.(priced, panel, index)
      if (!applyUserPos()) adapter.placePanel?.(host)
      // The reopen button sits where the panel's top-left corner is, once the panel has been placed or dragged.
      placeReopen()
    },
  })
  shadow(host, PANEL_CSS).append(panel.el)
  makeDraggable(host, panel.el, {
    moved: (pos) => {
      userPos = pos
      placeReopen()
      void savePosition(pos)
    },
    reset: () => {
      userPos = undefined
      Object.assign(host.style, { left: '', top: '', right: '', bottom: '' })
      Object.assign(reopenHost.style, { left: '', top: '', right: '', bottom: '' })
      void savePosition(undefined)
      adapter.placePanel?.(host)
      placeReopen()
    },
  })
  window.addEventListener('resize', () => applyUserPos() && placeReopen())
  shadow(reopenHost, REOPEN_CSS).append(h('button', { title: 'Show Cost Down', onclick: reopen }, logo()))
  show()

  // The toolbar popup's "Show the panel on this page" (and its check for whether this page has one).
  chrome.runtime.onMessage.addListener((msg: { type?: string }, _sender, sendResponse) => {
    if (msg?.type === 'costDownPing') sendResponse({ hasDeck })
    else if (msg?.type === 'costDownShowPanel') {
      reopen()
      sendResponse({ ok: hasDeck })
    }
    return false
  })

  let loaded: PriceIndex
  try {
    loaded = index = await loadPrices()
  } catch (e) {
    panel.setPrices(undefined, (e as Error).message)
    return
  }
  panel.setPrices(loaded)

  let last = ''
  const refresh = () => {
    const d = adapter.read(loaded)
    const sig = d ? JSON.stringify([d.name, d.deck.main, d.deck.extra, d.deck.side]) : ''
    if (sig === last) return
    last = sig
    hasDeck = !!d && deckSize(d.deck) > 0
    show()
    panel.setDeck(d && { ...d, source: location.href })
  }
  refresh()

  // Re-read after the page edits the deck; ignore mutations Cost Down made itself. Form fields changing value don't
  // show up as mutations, so changes to inputs count too.
  let timer: number | undefined
  const later = () => {
    clearTimeout(timer)
    timer = window.setTimeout(refresh, 250)
  }
  new MutationObserver((records) => {
    if (records.every((r) => (r.target as Element).closest?.(`[${MARK}]`) || [...r.addedNodes].every(isOurs))) return
    later()
  }).observe(adapter.watch?.() ?? document.body, { childList: true, subtree: true, characterData: true })
  document.addEventListener('change', later, true)
  document.addEventListener('input', later, true)
  adapter.subscribe?.(later)
}

type Pos = { left: number; top: number }

async function savedPosition(): Promise<Pos | undefined> {
  const all = ((await chrome.storage.local.get('panelPos')).panelPos ?? {}) as Record<string, Pos>
  return all[location.hostname]
}

async function savePosition(pos: Pos | undefined): Promise<void> {
  const all = ((await chrome.storage.local.get('panelPos')).panelPos ?? {}) as Record<string, Pos>
  if (pos) all[location.hostname] = pos
  else delete all[location.hostname]
  await chrome.storage.local.set({ panelPos: all })
}

/** Drag the panel by its header (not its buttons); double-click the header to put it back where the site places it. */
function makeDraggable(host: HTMLElement, panelEl: HTMLElement, on: { moved: (p: Pos) => void; reset: () => void }) {
  const onHeader = (e: Event) => {
    const t = e.target as Element
    return !!t.closest?.('.head') && !t.closest('button')
  }
  panelEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !onHeader(e)) return
    e.preventDefault()
    const r = host.getBoundingClientRect()
    const dx = e.clientX - r.left
    const dy = e.clientY - r.top
    host.setAttribute('data-dragging', '')
    let pos: Pos = { left: r.left, top: r.top }
    const move = (ev: PointerEvent) => {
      pos = {
        left: Math.min(Math.max(0, ev.clientX - dx), window.innerWidth - r.width),
        top: Math.min(Math.max(0, ev.clientY - dy), window.innerHeight - 40),
      }
      Object.assign(host.style, { left: `${pos.left}px`, top: `${pos.top}px`, right: 'auto', bottom: 'auto' })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      host.removeAttribute('data-dragging')
      if (pos.left !== r.left || pos.top !== r.top) on.moved(pos)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  })
  panelEl.addEventListener('dblclick', (e) => {
    if (onHeader(e)) on.reset()
  })
}

const isOurs = (n: Node) => n instanceof Element && n.hasAttribute(MARK)

/** Adds (or replaces) Cost Down's styles for elements it puts directly on a site's page. */
export function pageStyle(css: string): void {
  let el = document.querySelector<HTMLStyleElement>(`style[${MARK}]`)
  if (!el) {
    el = h('style', { [MARK]: 'style' })
    document.head.append(el)
  }
  el.textContent = css
}
