// Decklist formats: .ydk, ydke:// and plain text. Adapted from Chaos Catalog (src/games/ygo/decks.ts), where they
// were verified against EDOPro, YGOPRODeck and Duelingbook exports (2026-10-26).

import type { PriceIndex } from './prices.ts'

export type DeckSection = 'main' | 'extra' | 'side'
export const SECTIONS: DeckSection[] = ['main', 'extra', 'side']
export const SECTION_LABEL: Record<DeckSection, string> = { main: 'Main', extra: 'Extra', side: 'Side' }

/** A decklist as passcodes, one entry per copy (the way .ydk and ydke store it). */
export interface RawDeck {
  main: number[]
  extra: number[]
  side: number[]
  /** Lines of a text list that couldn't be matched to a card. */
  unknown?: string[]
  name?: string
}

export const emptyDeck = (): RawDeck => ({ main: [], extra: [], side: [] })
export const deckSize = (d: RawDeck) => d.main.length + d.extra.length + d.side.length

export function parseYdk(text: string): RawDeck {
  const deck = emptyDeck()
  let section: DeckSection = 'main'
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (/^#main/i.test(line)) section = 'main'
    else if (/^#extra/i.test(line)) section = 'extra'
    else if (/^!side/i.test(line)) section = 'side'
    else if (/^\d+$/.test(line)) deck[section].push(Number(line))
  }
  return deck
}

const fromBase64 = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
}
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))

const readUint32s = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return Array.from({ length: Math.floor(bytes.length / 4) }, (_, i) => view.getUint32(i * 4, true))
}
const writeUint32s = (ids: number[]) => {
  const out = new Uint8Array(ids.length * 4)
  const view = new DataView(out.buffer)
  ids.forEach((id, i) => view.setUint32(i * 4, id, true))
  return out
}

/** ydke://<main>!<extra>!<side>! each base64 of little-endian uint32 passcodes (EDOPro, YGOPRODeck, Duelingbook). */
export function parseYdke(url: string): RawDeck {
  const parts = url.trim().replace(/^ydke:\/\//i, '').split('!')
  if (parts.length < 3) throw new Error('That ydke:// link is incomplete')
  const [main, extra, side] = parts.map((p) => (p ? readUint32s(fromBase64(p)) : []))
  return { main, extra, side }
}

export const toYdke = (d: RawDeck) =>
  `ydke://${[d.main, d.extra, d.side].map((ids) => (ids.length ? toBase64(writeUint32s(ids)) : '')).join('!')}!`

/** Plain text: "3 Ash Blossom", "3x Ash Blossom", "Ash Blossom x3", with optional Main/Extra/Side headings. */
export function parseText(text: string, index: PriceIndex): RawDeck {
  const deck: RawDeck = { ...emptyDeck(), unknown: [] }
  let section: DeckSection = 'main'
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || /^(\/\/|#(?!\w))/.test(line)) continue
    const heading = /^(main|extra|side)(\s*deck)?\s*:?(\s*\(\d+\))?\s*$/i.exec(line)
    if (heading) {
      section = heading[1].toLowerCase() as DeckSection
      continue
    }
    if (/^(lf|monsters?|spells?|traps?)\s*:?\s*(\(\d+\))?$/i.test(line)) continue
    const m = /^(\d+)\s*x?\s+(.+)$/i.exec(line) ?? /^(.+?)\s+x\s*(\d+)$/i.exec(line)
    const [qty, name] = m ? (/^\d+$/.test(m[1]) ? [Number(m[1]), m[2]] : [Number(m[2]), m[1]]) : [1, line]
    const card = index.byName(name) ?? (/^\d{4,9}$/.test(name) ? index.card(Number(name)) : undefined)
    if (!card) {
      deck.unknown!.push(line)
      continue
    }
    for (let i = 0; i < Math.min(qty, 60); i++) deck[section].push(card.id)
  }
  return deck
}

/** Reads a pasted .ydk, ydke:// link or text list. */
export function parseDeck(input: string, index: PriceIndex): RawDeck {
  const s = input.trim()
  if (/^ydke:\/\//i.test(s)) return parseYdke(s)
  if (/^\s*(#created|#main|#extra|!side)/im.test(s) && /^\d{3,9}\s*$/m.test(s)) return parseYdk(s)
  return parseText(s, index)
}
