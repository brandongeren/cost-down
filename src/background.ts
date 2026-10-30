// Background script: downloads Chaos Catalog's price file into storage.local, at most once every 20 hours (the file
// changes once a day). Content scripts and the popup ask for it with {type: 'ensurePrices'}.

import { PRICE_URL, type PriceFile } from './core/prices.ts'
import type { StoredPrices } from './core/store.ts'

const MAX_AGE_MS = 20 * 60 * 60 * 1000

let inFlight: Promise<void> | undefined

async function refresh(): Promise<void> {
  const stored = (await chrome.storage.local.get('prices')).prices as StoredPrices | undefined
  // Files from before frame types were added (2026-10-30) are refetched within the hour: the Konami deck filler needs them.
  const current = !!stored && 'f' in (stored.file.cards[0] ?? {})
  if (stored && Date.now() - stored.fetchedAt < (current ? MAX_AGE_MS : 60 * 60 * 1000)) return
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

// Firefox only: the applied theme's colors, so Cost Down's panel and popup can match it (Chrome has no theme API;
// there it follows light/dark only). Stored as `theme` in storage.local; null when the theme sets no colors.
const ffTheme = (globalThis as unknown as { browser?: { theme?: { getCurrent(): Promise<{ colors?: Record<string, unknown> | null }>; onUpdated: { addListener(f: () => void): void } } } }).browser?.theme
async function storeTheme() {
  if (!ffTheme) return
  const c = (await ffTheme.getCurrent()).colors ?? {}
  const color = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : Array.isArray(c[k]) ? `rgb(${(c[k] as number[]).join(',')})` : null)
  const bg = color('popup') ?? color('frame')
  const text = color('popup_text') ?? color('tab_background_text') ?? color('toolbar_text')
  await chrome.storage.local.set({
    theme: bg && text ? { bg, text, border: color('popup_border'), surface: color('toolbar_field') ?? color('toolbar') } : null,
  })
}
if (ffTheme) {
  void storeTheme()
  ffTheme.onUpdated.addListener(() => void storeTheme())
}
