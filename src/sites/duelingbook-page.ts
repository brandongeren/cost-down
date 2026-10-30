// Runs in Duelingbook's own page JavaScript (manifest `world: "MAIN"`), because the deck lives in the app's variables,
// not in the DOM. Observed in main.js and checked in a browser (2026-10-30, DESIGN.md §7):
// - `currentLabel` is "deck_constructor" while the deck constructor is open.
// - `deck_filled_arr`, `extra_filled_arr`, `side_filled_arr`: arrays of jQuery card elements; `.data('id')` is
//   Duelingbook's card id and `.data('serial_number')` (also `passcode`) the passcode, a string. `getCard(id)` only
//   works where the full card list `Cards` is loaded (not on deck link pages), so it's the fallback.
// - `currentDeckId` and `deck.deckData` (the loaded deck's data) identify the saved deck.
// - Deck link pages (`/deck?id=<id>`) use the same deck screen and variables (`currentLabel` is "deck_constructor"
//   there too) once Cloudflare's human check lets the cards load; their id comes from the link.
// Twice a second it posts {main, extra, side, name, id} (passcodes) to the extension's content script when it
// changes, or null when the constructor isn't open. It only reads; it never calls anything that changes the deck.

import { postDeckWhenChanged } from './bridge.ts'

const w = window as any

const passcodes = new Map<number, number>()
function passcode(id: number): number {
  let p = passcodes.get(id)
  if (p === undefined) {
    p = Number(w.getCard?.(id)?.serial_number) || 0
    passcodes.set(id, p)
  }
  return p
}

const list = (arr: unknown): number[] =>
  Array.isArray(arr)
    ? arr
        .map((el: any) => Number(el?.data?.('serial_number') || el?.data?.('passcode')) || passcode(Number(el?.data?.('id'))))
        .filter((p) => p > 0)
    : []

function deckName(): string {
  const data = w.deck?.deckData
  const fromData = typeof data?.name === 'string' ? data.name : ''
  // The deck dropdown in the constructor shows the loaded deck's name.
  const shown = (document.querySelector('#deck_constructor .decklist_cb, #deck_constructor select') as HTMLSelectElement | null)?.value ?? ''
  return (fromData || shown || '').trim()
}

postDeckWhenChanged(
  'duelingbook',
  () =>
    w.currentLabel === 'deck_constructor'
      ? {
          main: list(w.deck_filled_arr),
          extra: list(w.extra_filled_arr),
          side: list(w.side_filled_arr),
          name: deckName(),
          id: String(w.currentDeckId || new URLSearchParams(location.search).get('id') || ''),
        }
      : null,
  { everyMs: 500 },
)
