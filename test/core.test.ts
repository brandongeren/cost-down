import { describe, expect, it } from 'vitest'
import { parseDeck, parseYdke, toYdke } from '../src/core/deck.ts'
import { massEntryUrl } from '../src/core/massentry.ts'
import { PriceIndex, combineDecks, priceDeck, shoppingList } from '../src/core/prices.ts'

const index = new PriceIndex({
  date: '2026-10-29',
  dbVersion: '1',
  cards: [
    { id: 14558127, n: 'Ash Blossom & Joyous Spring', p: 4.24, kid: 12950, alt: [14558128] },
    { id: 24224830, n: 'Called by the Grave', p: 0.5 },
    { id: 23265313, n: 'Cost Down', p: 0.14 },
    { id: 999, n: 'Unpriced Card' },
  ],
})

describe('decks', () => {
  it('reads ydke round trip', () => {
    const raw = { main: [14558127, 14558127], extra: [], side: [24224830] }
    expect(parseYdke(toYdke(raw))).toEqual(raw)
  })

  it('reads text with sections and alternate spellings', () => {
    const d = parseDeck('Main\n3x Ash Blossom & Joyous Spring\nCost Down x2\nSide\n1 called by the grave\nNope Card', index)
    expect(d.main).toEqual([14558127, 14558127, 14558127, 23265313, 23265313])
    expect(d.side).toEqual([24224830])
    expect(d.unknown).toEqual(['Nope Card'])
  })

  it('reads .ydk', () => {
    expect(parseDeck('#created by x\n#main\n14558127\n#extra\n!side\n24224830\n', index)).toEqual({
      main: [14558127],
      extra: [],
      side: [24224830],
    })
  })
})

describe('pricing', () => {
  it('totals a deck, folding alternate artworks into their card', () => {
    const p = priceDeck({ main: [14558127, 14558128, 14558127], extra: [], side: [24224830] }, index)
    expect(p.lines.map((l) => [l.section, l.qty])).toEqual([['main', 3], ['side', 1]])
    expect(p.fullTotal).toBeCloseTo(3 * 4.24 + 0.5)
    expect(p.needTotal).toBeCloseTo(p.fullTotal)
  })

  it('takes owned copies off Main first, then Side', () => {
    const p = priceDeck({ main: [14558127, 14558127, 14558127], extra: [], side: [14558127] }, index, { 14558127: 3 })
    expect(p.lines.map((l) => [l.section, l.need])).toEqual([['main', 0], ['side', 1]])
    expect(p.needTotal).toBeCloseTo(4.24)
    expect(shoppingList(p)).toEqual([{ name: 'Ash Blossom & Joyous Spring', qty: 1 }])
  })

  it('counts owned copies once across an order of several decks', () => {
    const a = { main: [14558127, 14558127], extra: [], side: [] }
    const b = { main: [14558127, 999], extra: [], side: [] }
    const p = priceDeck(combineDecks([a, b]), index, { 14558127: 1 })
    expect(shoppingList(p)).toEqual([
      { name: 'Ash Blossom & Joyous Spring', qty: 2 },
      { name: 'Unpriced Card', qty: 1 },
    ])
    expect(p.unpriced).toBe(1)
  })

  it('reports passcodes missing from the price data', () => {
    expect(priceDeck({ main: [1], extra: [], side: [] }, index).unknown).toEqual([1])
  })
})

describe('mass entry', () => {
  it('builds the TCGplayer link with names and "||"', () => {
    expect(massEntryUrl([{ name: 'Ash Blossom & Joyous Spring', qty: 3 }, { name: 'Called by the Grave', qty: 2 }, { name: 'X', qty: 0 }])).toBe(
      'https://www.tcgplayer.com/massentry?productline=YuGiOh&c=3%20Ash%20Blossom%20%26%20Joyous%20Spring||2%20Called%20by%20the%20Grave',
    )
  })
})

describe('rarities and passcode fixes (price files from 2026-11-10)', () => {
  const idx = new PriceIndex({
    date: '2026-11-09',
    dbVersion: '1',
    rarities: ['Super Rare', 'Common', 'Rare'],
    cards: [
      // TCGplayer names the cheapest listing "Gaia Knight, the Force of Earth (Super Rare)"; Mass Entry gets its id.
      { id: 97204936, n: 'Gaia Knight, the Force of Earth', p: 1.13, r: [[0, 27600, 1.13], [1, 35370, 1.39], [2, 80572, 3]] },
      // YGOPRODeck had these two passcodes swapped; `pw` is the real one.
      { id: 74733322, pw: 48739627, n: 'Artmage Academic Arcane Arts Acropolis', p: 0.19 },
      { id: 48739627, pw: 74733322, n: 'Theorealize', p: 0.16 },
    ],
  })

  it('reads deck codes with the real passcodes and keeps YGOPRODeck lookups for Fuwa Lab', () => {
    expect(idx.card(74733322)?.n).toBe('Theorealize')
    expect(idx.card(48739627)?.n).toBe('Artmage Academic Arcane Arts Acropolis')
    expect(idx.byYgoprodeckId(48739627)?.n).toBe('Theorealize')
    const p = priceDeck(parseDeck('#main\n74733322\n', idx), idx)
    expect(p.lines.map((l) => l.name)).toEqual(['Theorealize'])
  })

  it('prices the cheapest rarity by default and sends its product id', () => {
    const p = priceDeck({ main: [97204936, 97204936], extra: [], side: [] }, idx)
    expect(p.needTotal).toBeCloseTo(2.26)
    expect(shoppingList(p)).toEqual([{ name: 'Gaia Knight, the Force of Earth', qty: 2, productId: 27600 }])
    expect(massEntryUrl(shoppingList(p))).toBe('https://www.tcgplayer.com/massentry?productline=YuGiOh&c=2-27600')
  })

  it('uses a picked rarity, and falls back to the cheapest when it no longer exists', () => {
    const p = priceDeck({ main: [97204936], extra: [], side: [] }, idx, {}, { 97204936: 'Rare' })
    expect([p.needTotal, p.lines[0].picked, shoppingList(p)[0].productId]).toEqual([3, true, 80572])
    const gone = priceDeck({ main: [97204936], extra: [], side: [] }, idx, {}, { 97204936: 'Ghost Rare' })
    expect([gone.needTotal, gone.lines[0].picked]).toEqual([1.13, false])
  })

  it('mixes product-id and name lines in one Mass Entry link', () => {
    expect(massEntryUrl([{ name: 'A', qty: 1, productId: 5 }, { name: 'No Product', qty: 2 }])).toBe(
      'https://www.tcgplayer.com/massentry?productline=YuGiOh&c=1-5||2%20No%20Product',
    )
  })
})
