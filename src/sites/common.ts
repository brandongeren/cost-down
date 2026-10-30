// Shared plumbing for site content scripts: a floating Cost Down panel (shadow root, bottom right), price loading,
// and re-reading the deck whenever the page changes it. Each site supplies how to read its deck and, optionally,
// how to put prices onto its own page (the Limitless-style total and per-line prices, DESIGN.md §1).

import { deckSize, type RawDeck } from '../core/deck.ts'
import type { PricedDeck, PriceIndex } from '../core/prices.ts'
import { loadPrices } from '../core/store.ts'
import { h, shadow } from '../ui/dom.ts'
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
}

const PANEL_CSS = `${STYLES}
:host { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; width: 380px; max-height: 70vh; display: block; }
`

/** Marks elements Cost Down added to the page, so decorate() can find and replace its own work. */
export const MARK = 'data-cost-down'

export async function runSite(adapter: SiteAdapter): Promise<void> {
  let index: PriceIndex | undefined
  const host = h('div', { [MARK]: 'panel' })
  document.body.append(host)
  const panel: DeckPanel = new DeckPanel({
    collapsible: true,
    startCollapsed: true,
    onClose: () => host.remove(),
    onPriced: (priced) => index && adapter.decorate?.(priced, panel, index),
  })
  shadow(host, PANEL_CSS).append(panel.el)

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
    host.style.display = !d || !deckSize(d.deck) ? 'none' : ''
    panel.setDeck(d && { ...d, source: location.href })
  }
  refresh()

  // Re-read after the page edits the deck; ignore mutations Cost Down made itself.
  let timer: number | undefined
  new MutationObserver((records) => {
    if (records.every((r) => (r.target as Element).closest?.(`[${MARK}]`) || [...r.addedNodes].every(isOurs))) return
    clearTimeout(timer)
    timer = window.setTimeout(refresh, 250)
  }).observe(adapter.watch?.() ?? document.body, { childList: true, subtree: true, characterData: true })
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
