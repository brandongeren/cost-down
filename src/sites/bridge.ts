// Page-world scripts (manifest `world: "MAIN"`) can read a site's own JavaScript but not use extension APIs; content
// scripts are the opposite. Page scripts post the deck with postDeck(); the content script reads it with pageDeck().

import type { RawDeck } from '../core/deck.ts'

export interface PageDeck extends RawDeck {
  name: string
  /** Stable id for the order list (the site's deck id, if it has one). */
  id: string
}

const TAG = 'costDown'

/** Page side: posts the deck (or null when there's no deck on screen) whenever it changes. */
export function postDeckWhenChanged(site: string, read: () => PageDeck | null, opts: { everyMs: number; events?: string[] }) {
  let last = ''
  const tick = () => {
    let deck: PageDeck | null = null
    try {
      deck = read()
    } catch {
      deck = null
    }
    const sig = JSON.stringify(deck)
    if (sig === last) return
    last = sig
    window.postMessage({ [TAG]: site, deck }, location.origin)
  }
  setInterval(tick, opts.everyMs)
  for (const e of opts.events ?? []) window.addEventListener(e, () => setTimeout(tick, 0))
  tick()
}

/** Content-script side: the latest deck the page posted, and a way to hear about changes. */
export function pageDeck(site: string) {
  let latest: PageDeck | null = null
  const listeners: (() => void)[] = []
  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.[TAG] !== site) return
    latest = e.data.deck as PageDeck | null
    for (const f of listeners) f()
  })
  return { latest: () => latest, subscribe: (cb: () => void) => void listeners.push(cb) }
}
