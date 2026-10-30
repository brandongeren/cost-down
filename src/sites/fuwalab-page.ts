// Runs in Fuwa Lab's own page JavaScript (manifest `world: "MAIN"`). Read from its /js/deck.js and checked in a
// browser (2026-10-30, DESIGN.md §7): the builder exposes `window.A.getDeck()` -> {main, extra, side}, arrays of
// YGOPRODeck card objects (`id` is the passcode), and fires `ygo:deck-rendered` on window after every redraw. The deck
// is on screen when #dscroll (the deck column) exists. The deck name is the #dname input; a saved deck's share code is
// `window._currentShareCode`. Posts the deck as passcodes when it changes. Only reads.

import { postDeckWhenChanged } from './bridge.ts'

const w = window as any

const ids = (list: unknown): number[] =>
  Array.isArray(list) ? list.map((c: any) => Number(c?.id) || 0).filter((id) => id > 0) : []

postDeckWhenChanged(
  'fuwalab',
  () => {
    const deck = w.A?.getDeck?.()
    if (!deck || !document.getElementById('dscroll')) return null
    return {
      main: ids(deck.main),
      extra: ids(deck.extra),
      side: ids(deck.side),
      name: ((document.getElementById('dname') as HTMLInputElement | null)?.value ?? '').trim(),
      id: String(w._currentShareCode ?? ''),
    }
  },
  { everyMs: 1000, events: ['ygo:deck-rendered'] },
)
