// Background script: downloads Chaos Catalog's price file into storage.local, at most once every 20 hours (the file
// changes once a day). Content scripts and the popup ask for it with {type: 'ensurePrices'}.

import { PRICE_URL, type PriceFile } from './core/prices.ts'
import type { StoredPrices } from './core/store.ts'

const MAX_AGE_MS = 20 * 60 * 60 * 1000

let inFlight: Promise<void> | undefined

async function refresh(): Promise<void> {
  const stored = (await chrome.storage.local.get('prices')).prices as StoredPrices | undefined
  if (stored && Date.now() - stored.fetchedAt < MAX_AGE_MS) return
  const res = await fetch(PRICE_URL, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`Price download failed: ${res.status}`)
  const file = (await res.json()) as PriceFile
  if (!Array.isArray(file.cards) || !file.cards.length) throw new Error('Price file is empty')
  await chrome.storage.local.set({ prices: { fetchedAt: Date.now(), file } satisfies StoredPrices })
}

const ensure = () => (inFlight ??= refresh().finally(() => (inFlight = undefined)))

chrome.runtime.onMessage.addListener((msg: { type?: string }, _sender, sendResponse) => {
  if (msg?.type !== 'ensurePrices') return false
  ensure().then(
    () => sendResponse({ ok: true }),
    // A failed refresh still leaves yesterday's prices usable; the caller decides.
    (err: Error) => sendResponse({ ok: false, error: err.message }),
  )
  return true // answer asynchronously
})

chrome.runtime.onInstalled.addListener(() => void ensure().catch(() => {}))
chrome.runtime.onStartup.addListener(() => void ensure().catch(() => {}))
