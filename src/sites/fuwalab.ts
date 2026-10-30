// Fuwa Lab's deck builder (fuwalab.fr/builder; a single-page app). The deck comes from fuwalab-page.ts (page world).
// Fuwa Lab shows Cardmarket prices (€): a subtotal in each section header (`.sec-block[data-sec] .sec-hd-price`) and
// each card's price in its hover overlay (`.dc-card[data-card-id] .dc-card-price`). Cost Down adds the TCGplayer price
// next to each, like Limitless; the panel floats bottom right (collapsed).

import type { DeckSection } from '../core/deck.ts'
import { money, type PricedDeck, type PriceIndex } from '../core/prices.ts'
import { h } from '../ui/dom.ts'
import { pageDeck } from './bridge.ts'
import { MARK, pageStyle, runSite } from './common.ts'

const page = pageDeck('fuwalab')

pageStyle(`
.cd-fuwa-sec { margin-left: 6px; padding: 0 6px; border-radius: 5px; background: #1a9b7e; color: #fff; font-weight: 700;
  font-variant-numeric: tabular-nums; cursor: pointer; white-space: nowrap; }
.cd-fuwa-card { display: block; color: #7fe3c8; font-weight: 700; font-size: 11px; font-variant-numeric: tabular-nums; }
`)

void runSite({
  read() {
    const d = page.latest()
    if (!d) return undefined
    return {
      deck: { main: d.main, extra: d.extra, side: d.side },
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
    for (const card of block.querySelectorAll<HTMLElement>('.dc-card[data-card-id]')) {
      const unit = index.card(Number(card.dataset.cardId))?.p
      if (unit === undefined) continue
      card.querySelector('.dc-card-price')?.append(h('span', { class: 'cd-fuwa-card', [MARK]: 'price', title: 'TCGplayer (Cost Down)' }, money(unit)))
    }
  }
}
