// Prices: Chaos Catalog's daily cost-down.json (TCGplayer market prices via TCGCSV; shape in Chaos Catalog's
// scripts/games/ygo-cost-down.ts). Per card, the cheapest TCGplayer product of each rarity. A card's price is its
// cheapest rarity unless the user picked one; Mass Entry gets that exact product id (DESIGN.md §5).
//
// Passcodes: a card's `id` here is its real passcode. Chaos Catalog checks YGOPRODeck's against Yugipedia and sends
// `pw` where YGOPRODeck's is wrong (Theorealize and Artmage Academic Arcane Arts Acropolis were swapped, 2026-11-10);
// the index uses `pw` as the id and keeps YGOPRODeck's as `yid` for sites built on YGOPRODeck data (Fuwa Lab).

import { SECTIONS, type DeckSection, type RawDeck } from './deck.ts'

export const PRICE_URL = 'https://brandongeren.github.io/chaos-catalog/data/ygo/cost-down.json'

/** One rarity of a card in the file: index into PriceFile.rarities, cheapest TCGplayer product, price (USD). */
export type FileRarity = [rarity: number, productId: number, price: number]

export interface PriceCard {
  /** Passcode. In the file it's YGOPRODeck's; in a PriceIndex it's the real one (`pw` when the file has it). */
  id: number
  /** File only: the real passcode when YGOPRODeck's is wrong. */
  pw?: number
  /** Index only: YGOPRODeck's passcode (what Fuwa Lab's card data uses). */
  yid?: number
  /** Per rarity, cheapest first (files from 2026-11-10 on). */
  r?: FileRarity[]
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
  /** Rarity names CostDownCard.r points into (files from 2026-11-10 on). */
  rarities?: string[]
  cards: PriceCard[]
}

/** A rarity a card can be bought in: the cheapest TCGplayer product of that rarity. */
export interface RarityOption {
  rarity: string
  productId: number
  price: number
}

/** Rarity picked per card (by passcode); cards not in it get their cheapest rarity. */
export type RarityChoice = Record<number, string>

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
  private readonly yids = new Map<number, PriceCard>()
  private readonly kids = new Map<number, PriceCard>()
  private readonly names = new Map<string, PriceCard>()
  private readonly rarities = new Map<number, RarityOption[]>()

  constructor(file: PriceFile) {
    this.date = file.date
    const cards = file.cards.map(({ pw, r, ...c }): [PriceCard, FileRarity[] | undefined] => [pw ? { ...c, id: pw, yid: c.id } : c, r])
    // Corrected passcodes go in last: in a swap, each card's real passcode is the other's YGOPRODeck one.
    for (const fixed of [false, true])
      for (const [c] of cards)
        if (!!c.yid === fixed) {
          this.ids.set(c.id, c)
          for (const a of c.alt ?? []) if (!this.ids.has(a) || fixed) this.ids.set(a, c)
        }
    for (const [c, r] of cards) {
      this.yids.set(c.yid ?? c.id, c)
      if (c.kid) this.kids.set(c.kid, c)
      this.names.set(normalize(c.n), c)
      const opts = (r ?? []).flatMap(([ri, productId, price]) => (file.rarities?.[ri] ? [{ rarity: file.rarities[ri], productId, price }] : []))
      if (opts.length) this.rarities.set(c.id, opts)
    }
  }

  /** By passcode (the real one), alternate artworks included. */
  card = (id: number) => this.ids.get(id)
  /** By YGOPRODeck's passcode (sites built on YGOPRODeck's data, e.g. Fuwa Lab). */
  byYgoprodeckId = (id: number) => this.yids.get(id)
  byKonamiId = (kid: number) => this.kids.get(kid)
  byName = (name: string) => this.names.get(normalize(name))
  /** The rarities a card is sold in, cheapest first (empty for files older than 2026-11-10). */
  options = (id: number): RarityOption[] => this.rarities.get(id) ?? []

  /** What one copy costs and which product Mass Entry gets: the picked rarity, else the cheapest. */
  pick(id: number, choice: RarityChoice = {}): { unit?: number; option?: RarityOption; picked: boolean } {
    const opts = this.options(id)
    const want = choice[id]
    const chosen = want ? opts.find((o) => o.rarity === want) : undefined
    const option = chosen ?? opts[0]
    return { unit: option?.price ?? this.card(id)?.p, option, picked: !!chosen }
  }
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
  /** The rarity priced and sent to Mass Entry (undefined for older price files). */
  option?: RarityOption
  /** True when the user picked the rarity (not the cheapest default). */
  picked: boolean
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
export function priceDeck(deck: RawDeck, index: PriceIndex, owned: Owned = {}, choice: RarityChoice = {}): PricedDeck {
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
      const { unit, option, picked } = index.pick(id, choice)
      lines.push({ section, id, name: c.n, qty, owned: used, need, unit, total: need * (unit ?? 0), option, picked })
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

/** One Mass Entry line: a TCGplayer product when the price file has one for the card, else its name. */
export interface ShoppingItem {
  name: string
  qty: number
  productId?: number
}

/** What to buy: one line per card (sections merged), quantity still needed. */
export function shoppingList(priced: PricedDeck): ShoppingItem[] {
  const byId = new Map<number, ShoppingItem>()
  for (const l of priced.lines) {
    if (!l.need) continue
    const e = byId.get(l.id) ?? { name: l.name, qty: 0, ...(l.option ? { productId: l.option.productId } : {}) }
    e.qty += l.need
    byId.set(l.id, e)
  }
  return [...byId.values()]
}

export const money = (v: number) => `$${v.toFixed(2)}`
