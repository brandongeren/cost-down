// Everything Cost Down keeps lives in the extension's storage.local (this browser only; no account):
//   prices  the downloaded price file and when it was fetched (refreshed by the background script, at most daily)
//   owned   copies you own, by passcode; they apply to every deck
//   order   the order list: decks to buy together in one Mass Entry

import type { RawDeck } from './deck.ts'
import { PriceIndex, type Owned, type PriceFile } from './prices.ts'

export interface StoredPrices {
  fetchedAt: number
  file: PriceFile
}

export interface OrderDeck {
  /** Stable id: the page it came from, or a random id for pasted lists. Adding the same page again replaces it. */
  key: string
  name: string
  deck: RawDeck
  /** Page the deck came from, if any. */
  source?: string
  addedAt: number
}

export async function getOwned(): Promise<Owned> {
  return ((await chrome.storage.local.get('owned')).owned as Owned | undefined) ?? {}
}

export async function setOwnedCount(id: number, count: number): Promise<void> {
  const owned = await getOwned()
  if (count > 0) owned[id] = count
  else delete owned[id]
  await chrome.storage.local.set({ owned })
}

export async function getOrder(): Promise<OrderDeck[]> {
  return ((await chrome.storage.local.get('order')).order as OrderDeck[] | undefined) ?? []
}

export async function setOrder(order: OrderDeck[]): Promise<void> {
  await chrome.storage.local.set({ order })
}

export async function addToOrder(d: Omit<OrderDeck, 'addedAt'>): Promise<void> {
  const order = (await getOrder()).filter((o) => o.key !== d.key)
  order.push({ ...d, addedAt: Date.now() })
  await setOrder(order)
}

export async function removeFromOrder(key: string): Promise<void> {
  await setOrder((await getOrder()).filter((o) => o.key !== key))
}

/** Asks the background script to make sure prices are downloaded (fetching if missing or a day old), then loads them. */
export async function loadPrices(): Promise<PriceIndex> {
  const reply = (await chrome.runtime.sendMessage({ type: 'ensurePrices' })) as { ok: boolean; error?: string } | undefined
  const stored = (await chrome.storage.local.get('prices')).prices as StoredPrices | undefined
  if (!stored) throw new Error(reply?.error ?? "Couldn't download prices")
  return new PriceIndex(stored.file)
}

/** Calls back whenever owned counts or the order list change (in any tab). */
export function onStoreChange(fn: (keys: string[]) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') fn(Object.keys(changes))
  })
}
