// The multi-deck order list: several decks bought together. One Mass Entry gets every deck's cards summed, minus what
// you own (owned copies count once across the whole order, not once per deck). The popup shows each deck (open it
// to see its cards) and "What you'll buy": every card once, how many to buy, and which decks it comes from, so cards
// covered by what you own are visible rather than silently missing.

import { deckSize } from '../core/deck.ts'
import { massEntryUrl } from '../core/massentry.ts'
import { combineDecks, money, priceDeck, shoppingList, type Owned, type PriceIndex, type RarityChoice } from '../core/prices.ts'
import { getOrder, getOwned, getRarityChoice, onStoreChange, removeFromOrder, setOrder, type OrderDeck } from '../core/store.ts'
import { h, logo, openTab } from './dom.ts'

interface BuyLine {
  id: number
  name: string
  unit?: number
  /** The rarity, when the user picked one. */
  rarity?: string
  /** Copies across all decks. */
  qty: number
  /** Copies still to buy after what you own. */
  need: number
  owned: number
  from: { deck: string; qty: number }[]
}

/** Every card once, across the order: copies per deck, what you own, what's left to buy. */
function buyLines(order: OrderDeck[], index: PriceIndex, owned: Owned, choice: RarityChoice): BuyLine[] {
  const lines = new Map<number, BuyLine>()
  for (const o of order) {
    const perCard = new Map<number, number>()
    for (const l of priceDeck(o.deck, index).lines) perCard.set(l.id, (perCard.get(l.id) ?? 0) + l.qty)
    for (const [id, qty] of perCard) {
      const card = index.card(id)!
      const { unit, option, picked } = index.pick(id, choice)
      const line = lines.get(id) ?? { id, name: card.n, unit, rarity: picked ? option?.rarity : undefined, qty: 0, need: 0, owned: 0, from: [] }
      line.qty += qty
      line.from.push({ deck: o.name, qty })
      lines.set(id, line)
    }
  }
  for (const l of lines.values()) {
    l.owned = Math.min(l.qty, Math.max(0, owned[l.id] ?? 0))
    l.need = l.qty - l.owned
  }
  // Most expensive still-to-buy first; fully covered cards last.
  return [...lines.values()].sort((a, b) => (b.need ? 1 : 0) - (a.need ? 1 : 0) || b.need * (b.unit ?? 0) - a.need * (a.unit ?? 0))
}

export class OrderList {
  readonly el = h('div', { class: 'cd' })
  private open = new Set<string>()

  constructor(private readonly index: PriceIndex) {
    onStoreChange((keys) => {
      if (keys.includes('owned') || keys.includes('order') || keys.includes('rarity')) void this.render()
    })
    void this.render()
  }

  async render() {
    const scroll = this.el.querySelector('.body')?.scrollTop ?? 0
    const [order, owned, choice] = await Promise.all([getOrder(), getOwned(), getRarityChoice()])
    const combined = priceDeck(combineDecks(order.map((o) => o.deck)), this.index, owned, choice)
    const list = shoppingList(combined)
    const header = h(
      'div',
      { class: 'head' },
      logo(),
      h('span', { class: 'title' }, 'Multi-deck order list'),
      h('span', { class: 'count' }, `${order.length} deck${order.length === 1 ? '' : 's'}`),
      h('span', { class: 'total', title: 'What you still need to buy' }, money(combined.needTotal)),
      combined.needTotal !== combined.fullTotal && h('span', { class: 'full', title: 'Everything' }, money(combined.fullTotal)),
    )
    const body = h('div', { class: 'body' })
    if (!order.length) body.append(h('div', { class: 'empty' }, 'No decks yet. Use "Add to multi-deck order list" on a deck.'))
    else {
      body.append(h('h4', { class: 'sub' }, 'Decks'))
      for (const o of order) body.append(this.deckRow(o, owned, choice))
      body.append(h('h4', { class: 'sub' }, "What you'll buy"))
      for (const l of buyLines(order, this.index, owned, choice)) body.append(buyRow(l, order.length > 1))
    }
    const foot = h(
      'div',
      { class: 'foot' },
      h(
        'button',
        { class: 'primary', disabled: !list.length, onclick: () => openTab(massEntryUrl(list)) },
        `TCGplayer Mass Entry (${combined.needCards} cards)`,
      ),
      order.length > 0 &&
        h('button', { onclick: () => confirm('Remove every deck from the multi-deck order list?') && void setOrder([]) }, 'Clear'),
      h(
        'div',
        { class: 'note' },
        'Cards you own are counted once for the whole order.' + (combined.unpriced ? ` ${combined.unpriced} card(s) have no price.` : ''),
      ),
    )
    this.el.replaceChildren(header, body, foot)
    body.scrollTop = scroll
  }

  /** A deck in the order: name (link to its page), size, price; ▸ opens its own card list. */
  private deckRow(o: OrderDeck, owned: Owned, choice: RarityChoice) {
    const p = priceDeck(o.deck, this.index, owned, choice)
    const isOpen = this.open.has(o.key)
    const toggle = () => {
      if (isOpen) this.open.delete(o.key)
      else this.open.add(o.key)
      void this.render()
    }
    const row = h(
      'div',
      { class: 'deckrow' },
      h('button', { class: 'link', title: isOpen ? 'Hide its cards' : 'Show its cards', onclick: toggle }, isOpen ? '▾' : '▸'),
      h(
        'div',
        { class: 'name', title: o.source ?? o.name },
        o.source ? h('a', { href: o.source, target: '_blank', rel: 'noopener' }, o.name) : o.name,
        h('div', { class: 'meta' }, `${deckSize(o.deck)} cards · on its own ${money(p.needTotal)} still to buy`),
      ),
      h('span', { class: 'price' }, money(p.fullTotal)),
      h('button', { class: 'link', title: 'Remove from the multi-deck order list', onclick: () => void removeFromOrder(o.key) }, '×'),
    )
    if (!isOpen) return row
    const cards = h('div', { class: 'deckcards' })
    for (const l of priceDeck(o.deck, this.index, {}, choice).lines)
      cards.append(
        h(
          'div',
          { class: 'mini' },
          h('span', { class: 'qty' }, String(l.qty)),
          h('span', { class: 'name', title: l.name }, l.name),
          h('span', { class: 'sec' }, l.section === 'main' ? '' : l.section),
          h('span', { class: 'price' }, l.unit === undefined ? '—' : money(l.qty * l.unit)),
        ),
      )
    return h('div', null, row, cards)
  }
}

/** One card in "What you'll buy": copies to buy, name, price, and where the copies come from. */
function buyRow(l: BuyLine, manyDecks: boolean) {
  const parts = (l.rarity ? [l.rarity] : [])
    .concat(manyDecks ? l.from.map((f) => `${f.deck} ×${f.qty}`) : [])
    .concat(l.owned ? [`you own ${l.owned}`] : [])
  return h(
    'div',
    { class: `buy${l.need ? '' : ' done'}` },
    h('span', { class: 'qty' }, String(l.need)),
    h(
      'div',
      { class: 'name' },
      h('span', { title: l.name }, l.name),
      parts.length > 0 && h('div', { class: 'meta' }, l.need ? parts.join(' · ') : `${parts.join(' · ')} · covered by what you own`),
    ),
    h('span', { class: 'price' }, l.unit === undefined ? '—' : money(l.need * l.unit)),
  )
}
