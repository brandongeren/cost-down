// The order list: several decks bought together. One Mass Entry gets every deck's cards summed, minus what you own
// (owned copies count once across the whole order, not once per deck).

import { deckSize } from '../core/deck.ts'
import { massEntryUrl } from '../core/massentry.ts'
import { combineDecks, money, priceDeck, shoppingList, type PriceIndex } from '../core/prices.ts'
import { getOrder, getOwned, onStoreChange, removeFromOrder, setOrder } from '../core/store.ts'
import { h, logo, openTab } from './dom.ts'

export class OrderList {
  readonly el = h('div', { class: 'cd' })

  constructor(private readonly index: PriceIndex) {
    onStoreChange((keys) => {
      if (keys.includes('owned') || keys.includes('order')) void this.render()
    })
    void this.render()
  }

  async render() {
    const [order, owned] = await Promise.all([getOrder(), getOwned()])
    const combined = priceDeck(combineDecks(order.map((o) => o.deck)), this.index, owned)
    const list = shoppingList(combined)
    const header = h(
      'div',
      { class: 'head' },
      logo(),
      h('span', { class: 'title' }, 'Order list'),
      h('span', { class: 'count' }, `${order.length} deck${order.length === 1 ? '' : 's'}`),
      h('span', { class: 'total', title: 'What you still need to buy' }, money(combined.needTotal)),
      combined.needTotal !== combined.fullTotal && h('span', { class: 'full', title: 'Everything' }, money(combined.fullTotal)),
    )
    const body = h('div', { class: 'body' })
    if (!order.length) body.append(h('div', { class: 'empty' }, 'No decks yet. Use "Add to order list" on a deck.'))
    for (const o of order) {
      const p = priceDeck(o.deck, this.index, owned)
      body.append(
        h(
          'div',
          { class: 'deckrow' },
          h(
            'div',
            { class: 'name', title: o.source ?? o.name },
            o.source ? h('a', { href: o.source, target: '_blank', rel: 'noopener' }, o.name) : o.name,
            h('div', { class: 'meta' }, `${deckSize(o.deck)} cards · on its own ${money(p.needTotal)}`),
          ),
          h('span', { class: 'price' }, money(p.fullTotal)),
          h('button', { class: 'link', title: 'Remove from the order list', onclick: () => void removeFromOrder(o.key) }, '×'),
        ),
      )
    }
    const foot = h(
      'div',
      { class: 'foot' },
      h(
        'button',
        { class: 'primary', disabled: !list.length, onclick: () => openTab(massEntryUrl(list)) },
        `TCGplayer Mass Entry (${combined.needCards} cards)`,
      ),
      order.length > 0 && h('button', { onclick: () => confirm('Remove every deck from the order list?') && void setOrder([]) }, 'Clear'),
      h(
        'div',
        { class: 'note' },
        'Cards you own are counted once for the whole order.' + (combined.unpriced ? ` ${combined.unpriced} card(s) have no price.` : ''),
      ),
    )
    this.el.replaceChildren(header, body, foot)
  }
}
