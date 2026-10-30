// Konami's card database deck pages (Yu-Gi-Oh! Neuron): www.db.yugioh-card.com/yugiohdb/member_deck.action.
// Neuron share links (neuron.konami.net/link/...) redirect here. Two kinds of page (DESIGN.md §7):
//
// Deck page (ope=1), observed 2026-10-30:
// - The deck is in the page three times (Gallery, List, Detailed List; one shown at a time).
// - List view: tables #monster_list, #spell_list, #trap_list (Main), #extra_list, #side_list. Each card is a
//   `tr.row` with a hidden `input.link_value` (".../card_search.action?ope=2&cid=<Konami id>") and `td.num` (copies).
// - Detailed List: `.t_row` inside #detailtext_main / _ext / _side, `input.cid` and `.box_card_name`.
//
// Deck editor (ope=2, signed in), from a recording of an edit + Save (2026-10-30):
// - The same five tables hold fixed slots (65 Monster, Spell and Trap rows, 20 Extra and 20 Side). Each `tr.row` has
//   a name input (monm / spnm / trnm / exnm / sinm), a count input `.cnum` (monum / ...; "0" when empty, 1-3), a hidden
//   Konami id (monsterCardId / spellCardId / trapCardId / extraCardId / sideCardId; "" when empty) and a hidden `.imgs`
//   artwork value ("<id>_1_1_1" = default art for each copy, "null_null_null_null" when empty).
// - Picking a search result fills name, count 1 and id, then calls Calc(type), which the `.cnum` change handler also
//   calls. Save (Regist()) posts the whole form; the server goes by the ids (a stale `.imgs` value saved fine).
//
// Both have the "Total in Main / Extra / Side Deck" counters (`a.navbtn.hex.btn` in #num_total).
// Cards map to passcodes through YGOPRODeck's Konami id (every id matched in Chaos Catalog's checks).

import { emptyDeck, parseDeck, type DeckSection } from '../core/deck.ts'
import { money, type PriceCard, type PricedDeck, type PriceIndex } from '../core/prices.ts'
import { h } from '../ui/dom.ts'
import { MARK, pageStyle, runSite } from './common.ts'

type Table = 'MONSTER' | 'SPELL' | 'TRAP' | 'EXTRA' | 'SIDE'

const TABLES: Record<Table, { sel: string; section: DeckSection; name: string; num: string; id: string; rows: number }> = {
  MONSTER: { sel: '#monster_list', section: 'main', name: 'monm', num: 'monum', id: 'monsterCardId', rows: 65 },
  SPELL: { sel: '#spell_list', section: 'main', name: 'spnm', num: 'spnum', id: 'spellCardId', rows: 65 },
  TRAP: { sel: '#trap_list', section: 'main', name: 'trnm', num: 'trnum', id: 'trapCardId', rows: 65 },
  EXTRA: { sel: '#extra_list', section: 'extra', name: 'exnm', num: 'exnum', id: 'extraCardId', rows: 20 },
  SIDE: { sel: '#side_list', section: 'side', name: 'sinm', num: 'sinum', id: 'sideCardId', rows: 20 },
}
const TABLE_KEYS = Object.keys(TABLES) as Table[]
const DETAIL: Record<DeckSection, string> = { main: '#detailtext_main', extra: '#detailtext_ext', side: '#detailtext_side' }

const isEditor = () => !!document.querySelector('input[name="monm"]')

const input = (row: Element, name: string) => row.querySelector<HTMLInputElement>(`input[name="${name}"]`)
/** Card rows: `tr.row` on deck pages; in the editor every slot row (Extra and Side slots have no "row" class). */
const rowsOf = (t: Table) =>
  [...document.querySelectorAll(`${TABLES[t].sel} tr`)].filter((r) => r.classList.contains('row') || input(r, TABLES[t].name))

/** One card row: its Konami id and copies, on either kind of page. */
function rowCard(t: Table, row: Element): { kid: number; qty: number } {
  const c = TABLES[t]
  const idInput = input(row, c.id)
  if (idInput)
    return { kid: Number(idInput.value || 0), qty: Number(input(row, c.num)?.value || 0) }
  const kid = Number(/[?&]cid=(\d+)/.exec(row.querySelector<HTMLInputElement>('input.link_value')?.value ?? '')?.[1] ?? 0)
  return { kid, qty: Number(row.querySelector('td.num')?.textContent?.trim() || 0) }
}

function deckName(): string {
  const typed = document.querySelector<HTMLInputElement>('input#dnm')?.value.trim()
  if (typed) return typed
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content
  return (og ?? document.title).split(' | ')[0].trim() || 'Neuron deck'
}

/** cgid (the owner) + dno (deck number) identify a deck; the rest of the URL varies (language, view, edit). */
function deckKey(): string {
  const q = new URLSearchParams(location.search)
  return `konami:${q.get('cgid') ?? ''}:${q.get('dno') ?? location.pathname}`
}

pageStyle(`
.cd-price { float: right; margin-left: 8px; color: #7fe3ff; font-weight: 700; font-variant-numeric: tabular-nums; }
.cd-price.cd-none { color: #8aa0b4; font-weight: 400; }
.card_name .cd-price { float: none; display: block; width: 100%; margin: 1px 0 0; text-align: right; font-size: 11px;
  line-height: 12px; }
#num_total .cd-total { cursor: pointer; }
#num_total .cd-total span { min-width: 4.5em; }
.cd-loader { margin: 12px auto; max-width: 960px; padding: 10px 12px; border: 1px solid #3c6e91; border-radius: 6px;
  background: rgba(8, 30, 50, .85); color: #e6f1fa; font: 14px/1.4 sans-serif; }
.cd-loader b { color: #7fe3ff; }
.cd-loader .cd-row { display: flex; gap: 8px; margin-top: 6px; }
.cd-loader textarea { flex: 1; height: 38px; resize: vertical; font: 12px monospace; border-radius: 4px; border: 1px solid #3c6e91;
  padding: 4px 6px; }
.cd-loader button { cursor: pointer; border: none; border-radius: 4px; background: #1a9b7e; color: #fff; font-weight: 700;
  padding: 0 14px; }
.cd-loader .cd-msg { margin-top: 6px; font-size: 13px; }
.cd-loader .cd-msg.cd-warn { color: #ffc46b; }
`)

void runSite({
  read(index) {
    const deck = { ...emptyDeck(), unknown: [] as string[] }
    let found = false
    for (const t of TABLE_KEYS)
      for (const row of rowsOf(t)) {
        const { kid, qty } = rowCard(t, row)
        if (!kid || !qty) continue
        found = true
        const card = index.byKonamiId(kid)
        const label = input(row, TABLES[t].name)?.value || row.getAttribute('title') || `Konami id ${kid}`
        if (!card) deck.unknown.push(label)
        else for (let i = 0; i < qty; i++) deck[TABLES[t].section].push(card.id)
      }
    if (!found && !isEditor()) return undefined
    return { deck, name: deckName(), key: deckKey() }
  },

  decorate(priced, panel, index) {
    if (isEditor()) loader(index)
    for (const old of document.querySelectorAll(`[${MARK}="price"]`)) old.remove()
    if (priced) {
      const byKey = new Map(priced.lines.map((l) => [`${l.section}:${l.id}`, l]))
      const label = (section: DeckSection, kid: number) => {
        const card = kid ? index.byKonamiId(kid) : undefined
        const line = card ? byKey.get(`${section}:${card.id}`) : undefined
        if (!line) return undefined
        return line.unit === undefined
          ? h('span', { class: 'cd-price cd-none', [MARK]: 'price', title: 'No TCGplayer price' }, '—')
          : h('span', { class: 'cd-price', [MARK]: 'price', title: `${money(line.unit)} each` }, money(line.total))
      }
      for (const t of TABLE_KEYS)
        for (const row of rowsOf(t)) {
          const el = label(TABLES[t].section, rowCard(t, row).kid)
          if (el) row.querySelector('td.card_name .icon, td .card_name')?.append(el)
        }
      for (const [section, sel] of Object.entries(DETAIL) as [DeckSection, string][])
        for (const row of document.querySelectorAll(`${sel} .t_row`)) {
          const el = label(section, Number(row.querySelector<HTMLInputElement>('input.cid')?.value ?? 0))
          if (el) row.querySelector('.box_card_name')?.append(el)
        }
    }
    totalBox(priced, () => panel.expand())
  },
})

/** The fourth counter next to "Total in Main / Extra / Side Deck", in the site's own button style. */
function totalBox(priced: PricedDeck | undefined, onClick: () => void) {
  const row = document.querySelector('#num_total')
  if (!row) return
  row.querySelector(`[${MARK}="total"]`)?.remove()
  if (!priced || !priced.cards) return
  const owns = priced.needTotal !== priced.fullTotal
  row.append(
    h(
      'a',
      {
        class: 'navbtn hex btn cd-total',
        [MARK]: 'total',
        href: 'javascript:void(0)',
        title: owns ? `Whole deck ${money(priced.fullTotal)}; this is what you still need` : 'TCGplayer market price (Cost Down)',
        onclick: (e: Event) => {
          e.preventDefault()
          onClick()
        },
      },
      h('h4', null, owns ? 'Still to buy' : 'TCGplayer Price'),
      h('span', null, money(priced.needTotal)),
    ),
  )
}

// ------------------------------------------------------------------ ydke loader (deck editor only)

/** Which editor table a card goes in: Extra and Side by section; Main by the card's frame type. */
function tableFor(section: DeckSection, card: PriceCard): Table {
  if (section === 'extra') return 'EXTRA'
  if (section === 'side') return 'SIDE'
  return card.f === 'spell' ? 'SPELL' : card.f === 'trap' ? 'TRAP' : 'MONSTER'
}

/** Adds the "Load a ydke code" box above the deck counters, once. */
function loader(index: PriceIndex) {
  if (document.querySelector(`[${MARK}="loader"]`)) return
  const anchor = document.querySelector('#num_total')
  if (!anchor) return
  const text = h('textarea', { placeholder: 'ydke://…  (or a .ydk file’s text, or lines like “3 Ash Blossom & Joyous Spring”)' })
  const msg = h('div', { class: 'cd-msg' })
  const say = (s: string, warn = false) => {
    msg.textContent = s
    msg.className = `cd-msg${warn ? ' cd-warn' : ''}`
  }
  const box = h(
    'div',
    { class: 'cd-loader', [MARK]: 'loader' },
    h('b', null, 'Cost Down: '),
    'paste a ydke code to fill this deck. It replaces every card below; nothing is saved until you press Save.',
    h('div', { class: 'cd-row' }, text, h('button', { type: 'button', onclick: () => fill(index, text.value, say) }, 'Fill deck')),
    msg,
  )
  anchor.before(box)
}

function fill(index: PriceIndex, raw: string, say: (s: string, warn?: boolean) => void) {
  if (!raw.trim()) return say('Paste a ydke:// code first.', true)
  let deck
  try {
    deck = parseDeck(raw, index)
  } catch (e) {
    return say((e as Error).message, true)
  }

  // Group copies into rows: one row per card per table, in the order the code lists them.
  const rows: Record<Table, { card: PriceCard; qty: number }[]> = { MONSTER: [], SPELL: [], TRAP: [], EXTRA: [], SIDE: [] }
  const problems: string[] = [...(deck.unknown ?? []).map((u) => `not recognized: ${u}`)]
  for (const section of ['main', 'extra', 'side'] as DeckSection[]) {
    const seen = new Map<number, { card: PriceCard; qty: number }>()
    for (const id of deck[section]) {
      const card = index.card(id)
      if (!card) {
        problems.push(`unknown passcode ${id}`)
        continue
      }
      const row = seen.get(card.id)
      if (row) row.qty++
      else {
        const r = { card, qty: 1 }
        seen.set(card.id, r)
        rows[tableFor(section, card)].push(r)
      }
    }
  }
  const total = TABLE_KEYS.reduce((n, t) => n + rows[t].reduce((m, r) => m + r.qty, 0), 0)
  if (!total) return say("That code doesn't contain any cards Cost Down knows.", true)

  const current = TABLE_KEYS.some((t) => rowsOf(t).some((row) => rowCard(t, row).qty > 0))
  if (current && !confirm('Replace every card in this deck with the pasted list? (Nothing is saved until you press Save.)')) return

  for (const t of TABLE_KEYS) {
    const c = TABLES[t]
    const slots = rowsOf(t)
    const list = rows[t].filter((r) => {
      if (r.card.kid) return true
      problems.push(`${r.card.n}: no Konami id (left out)`)
      return false
    })
    if (list.length > slots.length) {
      problems.push(`${t.toLowerCase()}: ${list.length} different cards, only ${slots.length} rows (the rest left out)`)
      list.length = slots.length
    }
    slots.forEach((row, i) => {
      const r = list[i]
      const qty = r ? Math.min(r.qty, 3) : 0
      if (r && r.qty > 3) problems.push(`${r.card.n}: ${r.qty} copies, a deck allows 3`)
      setValue(input(row, c.name), r ? r.card.n : '')
      setValue(input(row, c.num), String(qty))
      setValue(input(row, c.id), r ? String(r.card.kid) : '')
      setValue(row.querySelector<HTMLInputElement>('input.imgs'), r ? `${r.card.kid}_1_1_1` : 'null_null_null_null')
      row.classList.remove('forbidden', 'limited', 'semi_limited')
      row.querySelector('.inpError')?.classList.remove('inpError')
    })
    // The page's own handler on count changes recalculates this table's totals (Calc).
    slots[0]?.querySelector('.cnum')?.dispatchEvent(new Event('change', { bubbles: true }))
  }

  const counts = (['main', 'extra', 'side'] as DeckSection[]).map((s) =>
    TABLE_KEYS.filter((t) => TABLES[t].section === s).reduce((n, t) => n + rowsOf(t).reduce((m, row) => m + rowCard(t, row).qty, 0), 0),
  )
  say(
    `Filled Main ${counts[0]} / Extra ${counts[1]} / Side ${counts[2]}. Check it, then press Save.` +
      (problems.length ? ` Problems: ${problems.join('; ')}.` : ''),
    problems.length > 0,
  )
}

function setValue(el: HTMLInputElement | null, value: string) {
  if (el) el.value = value
}
