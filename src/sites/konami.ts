// Konami's card database deck pages (Yu-Gi-Oh! Neuron): www.db.yugioh-card.com/yugiohdb/member_deck.action.
// Neuron share links (neuron.konami.net/link/...) redirect here. Observed 2026-10-30 (DESIGN.md §7):
// - The page holds the deck three times (Gallery, List, Detailed List; one shown at a time).
// - List view: tables #monster_list, #spell_list, #trap_list (Main), #extra_list, #side_list. Each card is a
//   `tr.row` with a hidden `input.link_value` (".../card_search.action?ope=2&cid=<Konami id>") and `td.num` (copies).
// - Detailed List: `.t_row` inside #detailtext_main / _ext / _side, `input.cid` and `.box_card_name`.
// - Counters "Total in Main Deck 42" are `a.navbtn.hex.btn` inside #num_total.
// Cards map to passcodes through YGOPRODeck's Konami id (every id matched in Chaos Catalog's checks).

import { emptyDeck, type DeckSection } from '../core/deck.ts'
import { money, type PricedDeck } from '../core/prices.ts'
import { h } from '../ui/dom.ts'
import { MARK, pageStyle, runSite } from './common.ts'

const TABLES: Record<DeckSection, string[]> = {
  main: ['#monster_list', '#spell_list', '#trap_list'],
  extra: ['#extra_list'],
  side: ['#side_list'],
}
const DETAIL: Record<DeckSection, string> = { main: '#detailtext_main', extra: '#detailtext_ext', side: '#detailtext_side' }

const kidOfRow = (row: Element) => Number(/[?&]cid=(\d+)/.exec(row.querySelector<HTMLInputElement>('input.link_value')?.value ?? '')?.[1] ?? 0)
const kidOfDetail = (row: Element) => Number(row.querySelector<HTMLInputElement>('input.cid')?.value ?? 0)

function deckName(): string {
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content
  return (og ?? document.title).split(' | ')[0].trim() || 'Neuron deck'
}

/** cgid (the owner) + dno (deck number) identify a deck; the rest of the URL varies (language, view). */
function deckKey(): string {
  const q = new URLSearchParams(location.search)
  return `konami:${q.get('cgid') ?? ''}:${q.get('dno') ?? location.pathname}`
}

pageStyle(`
.cd-price { float: right; margin-left: 8px; color: #7fe3ff; font-weight: 700; font-variant-numeric: tabular-nums; }
.cd-price.cd-none { color: #8aa0b4; font-weight: 400; }
#num_total .cd-total { cursor: pointer; }
#num_total .cd-total span { min-width: 4.5em; }
`)

void runSite({
  read(index) {
    const deck = { ...emptyDeck(), unknown: [] as string[] }
    let found = false
    for (const [section, selectors] of Object.entries(TABLES) as [DeckSection, string[]][]) {
      for (const sel of selectors)
        for (const row of document.querySelectorAll(`${sel} tr.row`)) {
          const kid = kidOfRow(row)
          const qty = Number(row.querySelector('td.num')?.textContent?.trim() ?? 0)
          if (!kid || !qty) continue
          found = true
          const card = index.byKonamiId(kid)
          if (!card) deck.unknown.push(row.getAttribute('title') ?? `Konami id ${kid}`)
          else for (let i = 0; i < qty; i++) deck[section].push(card.id)
        }
    }
    if (!found) return undefined
    return { deck, name: deckName(), key: deckKey() }
  },

  decorate(priced, panel, index) {
    const byKey = new Map((priced?.lines ?? []).map((l) => [`${l.section}:${l.id}`, l]))
    const label = (section: DeckSection, kid: number) => {
      const card = kid ? index.byKonamiId(kid) : undefined
      const line = card ? byKey.get(`${section}:${card.id}`) : undefined
      if (!line) return undefined
      return line.unit === undefined
        ? h('span', { class: 'cd-price cd-none', [MARK]: 'price', title: 'No TCGplayer price' }, '—')
        : h('span', { class: 'cd-price', [MARK]: 'price', title: `${money(line.unit)} each` }, money(line.total))
    }
    for (const old of document.querySelectorAll(`[${MARK}="price"]`)) old.remove()
    if (priced) {
      for (const [section, selectors] of Object.entries(TABLES) as [DeckSection, string[]][])
        for (const sel of selectors)
          for (const row of document.querySelectorAll(`${sel} tr.row`)) {
            const el = label(section, kidOfRow(row))
            if (el) row.querySelector('td.card_name .icon')?.append(el)
          }
      for (const [section, sel] of Object.entries(DETAIL) as [DeckSection, string][])
        for (const row of document.querySelectorAll(`${sel} .t_row`)) {
          const el = label(section, kidOfDetail(row))
          if (el) row.querySelector('.box_card_name')?.append(el)
        }
    }
    totalBox(priced, () => panel.expand())
  },

  watch: () => document.querySelector('#deck_text')?.parentElement ?? document.body,
})

/** The fourth counter next to "Total in Main / Extra / Side Deck", in the site's own button style. */
function totalBox(priced: PricedDeck | undefined, onClick: () => void) {
  const row = document.querySelector('#num_total')
  if (!row) return
  row.querySelector(`[${MARK}="total"]`)?.remove()
  if (!priced) return
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
