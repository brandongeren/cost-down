// Duelingbook's deck constructor (www.duelingbook.com). The deck comes from duelingbook-page.ts (page world), which
// posts it here. On the page, like Limitless: the deck's price sits next to Duelingbook's card counters (the column of
// numbers left of the deck grid), and the Cost Down panel fills the empty area above the deck buttons on the left.

import { money, type PricedDeck } from '../core/prices.ts'
import { h } from '../ui/dom.ts'
import { pageDeck } from './bridge.ts'
import { MARK, pageStyle, runSite } from './common.ts'

const page = pageDeck('duelingbook')

pageStyle(`
.cd-db-total { position: fixed; z-index: 2147482000; box-sizing: border-box; padding: 4px 8px; border-radius: 6px;
  background: rgba(10, 10, 20, .88); border: 2px solid #1a9b7e; color: #fff; font: 700 15px/1.2 system-ui, sans-serif;
  text-align: right; cursor: pointer; white-space: nowrap; }
.cd-db-total small { display: block; font-size: 10px; font-weight: 400; color: #a9e8d8; }
`)

const rect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect()

void runSite({
  read() {
    const latest = page.latest()
    if (!latest) return undefined
    const { main, extra, side, name, id } = latest
    return { deck: { main, extra, side }, name: name || 'Duelingbook deck', key: `duelingbook:${id || name || 'unsaved'}` }
  },
  subscribe: page.subscribe,
  watch: () => document.querySelector('#deck_constructor .deck_bg'),

  decorate(priced, panel) {
    totalBadge(priced, () => panel.expand())
  },

  // The left column between the counters' height and the deck buttons is empty in the constructor.
  placePanel(host) {
    const deckArea = rect('#deck_constructor .deck_bg')
    const buttons = rect('#deck_constructor #import_btn, #deck_constructor input[value="Import Deck"]')
    if (!deckArea || !deckArea.width) return
    const left = 8
    const top = deckArea.top + 70
    const width = Math.max(220, Math.min(300, deckArea.left - left - 8))
    const bottom = buttons?.top ? buttons.top - 10 : deckArea.bottom
    host.toggleAttribute('data-narrow', width < 320)
    Object.assign(host.style, {
      left: `${left}px`,
      top: `${top}px`,
      right: 'auto',
      bottom: 'auto',
      width: `${width}px`,
      maxHeight: `${Math.max(160, bottom - top)}px`,
    })
  },
})

/** "$x" next to the total-cards counter, left of the deck grid. */
function totalBadge(priced: PricedDeck | undefined, onClick: () => void) {
  document.querySelector(`[${MARK}="total"]`)?.remove()
  const counter = rect('#deck_constructor .total_bg')
  if (!priced || !priced.cards || !counter?.width) return
  const owns = priced.needTotal !== priced.fullTotal
  const badge = h(
    'div',
    {
      class: 'cd-db-total',
      [MARK]: 'total',
      title: owns ? `Whole deck ${money(priced.fullTotal)}; this is what you still need` : 'TCGplayer market price (Cost Down)',
      onclick: onClick,
    },
    money(priced.needTotal),
    h('small', null, owns ? 'still to buy' : 'TCGplayer'),
  )
  document.body.append(badge)
  const w = badge.getBoundingClientRect().width
  Object.assign(badge.style, { left: `${counter.left - w - 6}px`, top: `${counter.top + 2}px` })
}
