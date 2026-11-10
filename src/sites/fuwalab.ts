// Fuwa Lab's deck builder (fuwalab.fr/builder; a single-page app). The deck comes from fuwalab-page.ts (page world).
// Fuwa Lab shows Cardmarket prices (€): a subtotal in each section header (`.sec-block[data-sec] .sec-hd-price`) and
// each card's price in its hover overlay (`.dc-card[data-card-id] .dc-card-price`). Cost Down adds the TCGplayer price
// next to each, like Limitless; the panel floats bottom right (collapsed).

import type { DeckSection } from '../core/deck.ts'
import { money, type PricedDeck, type PriceIndex } from '../core/prices.ts'
import { h } from '../ui/dom.ts'
import { pageDeck } from './bridge.ts'
import { MARK, TOTAL, pageStyle, runSite } from './common.ts'

const page = pageDeck('fuwalab')

pageStyle(`
.cd-fuwa-sec { margin-left: 6px; padding: 0 6px; border-radius: 5px; background: #1a9b7e; color: #fff; font-weight: 700;
  font-variant-numeric: tabular-nums; cursor: pointer; white-space: nowrap; }
.cd-fuwa-card { display: block; color: #7fe3c8; font-weight: 700; font-size: 11px; font-variant-numeric: tabular-nums; }
`)

void runSite({
  read(index) {
    const d = page.latest()
    if (!d) return undefined
    // Fuwa Lab's card objects are YGOPRODeck's: match by name, else YGOPRODeck's passcode, so a passcode
    // YGOPRODeck has wrong still finds the right card (DESIGN.md §4).
    const resolve = (ids: number[], names: string[] = []) =>
      ids.map((id, i) => {
        const c = (names[i] && index.byName(names[i])) || index.byYgoprodeckId(id)
        return c ? c.id : id
      })
    return {
      deck: { main: resolve(d.main, d.names?.main), extra: resolve(d.extra, d.names?.extra), side: resolve(d.side, d.names?.side) },
      name: d.name || 'Fuwa Lab deck',
      key: `fuwalab:${d.id || d.name || 'unsaved'}`,
    }
  },
  subscribe: page.subscribe,
  watch: () => document.getElementById('dscroll'),
  decorate(priced, panel, index) {
    decorate(priced, index, () => panel.expand())
  },
})

function decorate(priced: PricedDeck | undefined, index: PriceIndex, onClick: () => void) {
  for (const old of document.querySelectorAll(`[${MARK}="price"]`)) old.remove()
  if (!priced || !priced.cards) return
  for (const block of document.querySelectorAll<HTMLElement>('#dscroll .sec-block[data-sec]')) {
    const section = block.dataset.sec as DeckSection
    const lines = priced.lines.filter((l) => l.section === section)
    if (!lines.length) continue
    const need = lines.reduce((n, l) => n + l.total, 0)
    const full = lines.reduce((n, l) => n + l.qty * (l.unit ?? 0), 0)
    const euros = block.querySelector<HTMLElement>('.sec-hd-price')
    const badge = h(
      'span',
      {
        class: 'cd-fuwa-sec',
        [MARK]: 'price',
        [TOTAL]: '',
        title: need !== full ? `TCGplayer, still to buy (whole section ${money(full)})` : 'TCGplayer market price (Cost Down)',
        onclick: onClick,
      },
      money(need),
    )
    if (euros) {
      // The header is a flex row whose items are placed with CSS `order`; sit right after the € price.
      badge.style.order = getComputedStyle(euros).order
      euros.after(badge)
    }
    // Fuwa Lab's cards carry YGOPRODeck's passcode; the price is the line's (the picked rarity, else the cheapest).
    const unitOf = new Map(lines.map((l) => [l.id, l.unit]))
    for (const card of block.querySelectorAll<HTMLElement>('.dc-card[data-card-id]')) {
      const c = index.byYgoprodeckId(Number(card.dataset.cardId))
      const unit = c && (unitOf.has(c.id) ? unitOf.get(c.id) : index.pick(c.id).unit)
      if (unit === undefined) continue
      card.querySelector('.dc-card-price')?.append(h('span', { class: 'cd-fuwa-card', [MARK]: 'price', title: 'TCGplayer (Cost Down)' }, money(unit)))
    }
  }
}
