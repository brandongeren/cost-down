// Prices: Chaos Catalog's daily cost-down.json (TCGplayer market prices via TCGCSV; shape in Chaos Catalog's
// scripts/games/ygo-cost-down.ts). A card's price is its cheapest printing, since Mass Entry by name lets TCGplayer
// pick the printing.

import { SECTIONS, type DeckSection, type RawDeck } from './deck.ts'

export const PRICE_URL = 'https://brandongeren.github.io/chaos-catalog/data/ygo/cost-down.json'

export interface PriceCard {
  /** Passcode. */
  id: number
  /** Name, as given to Mass Entry. */
  n: string
  /** Cheapest market price in USD; absent if unpriced. */
  p?: number
  /** Konami database id (Neuron / db.yugioh-card.com). */
  kid?: number
  /** Alternate-artwork passcodes. */
  alt?: number[]
  /** YGOPRODeck frame type ("effect", "spell", "trap", "fusion", ...); added 2026-10-30, so older files lack it. */
  f?: string
}

export interface PriceFile {
  /** Price day (TCGCSV's update date). */
  date: string | null
  dbVersion: string
  cards: PriceCard[]
}

export const normalize = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export class PriceIndex {
  readonly date: string | null
  private readonly ids = new Map<number, PriceCard>()
  private readonly kids = new Map<number, PriceCard>()
  private readonly names = new Map<string, PriceCard>()

  constructor(file: PriceFile) {
    this.date = file.date
    for (const c of file.cards) {
      this.ids.set(c.id, c)
      for (const a of c.alt ?? []) this.ids.set(a, c)
      if (c.kid) this.kids.set(c.kid, c)
      this.names.set(normalize(c.n), c)
    }
  }

  /** By passcode, alternate artworks included. */
  card = (id: number) => this.ids.get(id)
  byKonamiId = (kid: number) => this.kids.get(kid)
  byName = (name: string) => this.names.get(normalize(name))
}

/** One card in one section of a deck, after taking away the copies you own. */
export interface PricedLine {
  section: DeckSection
  /** Base passcode (alternate artworks fold into their card). */
  id: number
  name: string
  qty: number
  /** Copies of this line covered by what you own. */
  owned: number
  /** qty - owned: what Mass Entry gets. */
  need: number
  /** Price of one copy; undefined if unpriced. */
  unit?: number
  /** need × unit (0 if unpriced). */
  total: number
}

export interface PricedDeck {
  lines: PricedLine[]
  /** Passcodes not in the price data. */
  unknown: number[]
  cards: number
  needCards: number
  /** Everything, ignoring what you own. */
  fullTotal: number
  /** What you still need to buy. */
  needTotal: number
  /** Cards (by base passcode) with at least one copy needed but no price. */
  unpriced: number
}

export type Owned = Record<number, number>

/**
 * Prices a deck. Owned copies are per card, not per section: they cover Main first, then Extra, then Side, so
 * owning 2 of a card that's in Main ×3 and Side ×1 leaves 1 to buy in Main and 1 in Side.
 */
export function priceDeck(deck: RawDeck, index: PriceIndex, owned: Owned = {}): PricedDeck {
  const lines: PricedLine[] = []
  const unknown: number[] = []
  const left = new Map<number, number>()
  for (const section of SECTIONS) {
    const counts = new Map<number, number>()
    for (const raw of deck[section]) {
      const c = index.card(raw)
      if (!c) unknown.push(raw)
      else counts.set(c.id, (counts.get(c.id) ?? 0) + 1)
    }
    for (const [id, qty] of counts) {
      const c = index.card(id)!
      const have = left.has(id) ? left.get(id)! : Math.max(0, owned[id] ?? 0)
      const used = Math.min(have, qty)
      left.set(id, have - used)
      const need = qty - used
      lines.push({ section, id, name: c.n, qty, owned: used, need, unit: c.p, total: need * (c.p ?? 0) })
    }
  }
  const unpricedIds = new Set(lines.filter((l) => l.need > 0 && l.unit === undefined).map((l) => l.id))
  return {
    lines,
    unknown,
    cards: lines.reduce((n, l) => n + l.qty, 0) + unknown.length,
    needCards: lines.reduce((n, l) => n + l.need, 0),
    fullTotal: lines.reduce((n, l) => n + l.qty * (l.unit ?? 0), 0),
    needTotal: lines.reduce((n, l) => n + l.total, 0),
    unpriced: unpricedIds.size,
  }
}

/** Several decks as one deck (sections kept), for the order list. */
export function combineDecks(decks: RawDeck[]): RawDeck {
  const out: RawDeck = { main: [], extra: [], side: [] }
  for (const d of decks) for (const s of SECTIONS) out[s].push(...d[s])
  return out
}

/** What to buy: one line per card (sections merged), quantity still needed. */
export function shoppingList(priced: PricedDeck): { name: string; qty: number }[] {
  const byId = new Map<number, { name: string; qty: number }>()
  for (const l of priced.lines) {
    if (!l.need) continue
    const e = byId.get(l.id) ?? { name: l.name, qty: 0 }
    e.qty += l.need
    byId.set(l.id, e)
  }
  return [...byId.values()]
}

export const money = (v: number) => `$${v.toFixed(2)}`
