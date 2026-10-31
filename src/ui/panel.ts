// The price panel: Limitless-style deck pricing (DESIGN.md §1). The header has the card count and total; each line
// has its price, and "own" counts that take copies off the order. Buttons: TCGplayer Mass Entry, add to multi-deck order list.

import { SECTION_LABEL, SECTIONS, deckSize, type RawDeck } from '../core/deck.ts'
import { massEntryUrl } from '../core/massentry.ts'
import { money, priceDeck, shoppingList, type Owned, type PricedDeck, type PriceIndex } from '../core/prices.ts'
import { addToOrder, getOrder, getOwned, onStoreChange, setOwnedCount, type OrderDeck } from '../core/store.ts'
import { append, h, logo, openTab } from './dom.ts'

export interface PanelDeck {
  deck: RawDeck
  name: string
  /** Key for the order list (the page URL on deck sites; adding again replaces the old copy). */
  key: string
  source?: string
}

export class DeckPanel {
  readonly el = h('div', { class: 'cd' })
  private index?: PriceIndex
  private error?: string
  private owned: Owned = {}
  private order: OrderDeck[] = []
  private current?: PanelDeck
  private collapsed = false

  constructor(
    private readonly opts: {
      collapsible?: boolean
      startCollapsed?: boolean
      onClose?: () => void
      /** Called by expand() (on-page totals), so a closed panel can come back. */
      onExpand?: () => void
      /** Called after every render with the priced deck (site adapters use it to put prices on the page). */
      onPriced?: (priced: PricedDeck | undefined) => void
    } = {},
  ) {
    this.collapsed = !!opts.startCollapsed
    onStoreChange((keys) => {
      if (keys.includes('owned') || keys.includes('order')) void this.reload()
    })
    void this.reload()
  }

  setPrices(index: PriceIndex | undefined, error?: string) {
    this.index = index
    this.error = error
    this.render()
  }

  setDeck(d: PanelDeck | undefined) {
    this.current = d
    this.render()
  }

  private async reload() {
    ;[this.owned, this.order] = await Promise.all([getOwned(), getOrder()])
    this.render()
  }

  private render() {
    // Re-rendering replaces the card list; keep it scrolled where it was (an own +/− shouldn't jump to the top).
    const scroll = this.el.querySelector('.body')?.scrollTop ?? 0
    this.draw()
    const body = this.el.querySelector('.body')
    if (body) body.scrollTop = scroll
  }

  private draw() {
    const { index, current } = this
    const header = h('div', { class: 'head', title: this.opts.collapsible ? 'Drag to move · double-click to put it back' : null }, logo())
    const children: Node[] = [header]

    if (!index) {
      header.append(h('span', { class: 'title' }, 'Cost Down'))
      children.push(h('div', { class: 'body' }, h('div', { class: 'empty' }, this.error ?? 'Loading prices…')))
      this.el.replaceChildren(...children)
      return
    }
    if (!current || !deckSize(current.deck)) {
      header.append(h('span', { class: 'title' }, 'Cost Down'))
      children.push(h('div', { class: 'body' }, h('div', { class: 'empty' }, 'No cards in this deck yet.')))
      this.el.replaceChildren(...children)
      this.opts.onPriced?.(undefined)
      return
    }

    const priced = priceDeck(current.deck, index, this.owned)
    const ownsSome = priced.needTotal !== priced.fullTotal
    append(
      header,
      h('span', { class: 'count' }, `${priced.cards} cards`),
      h('span', { class: 'total', title: ownsSome ? 'What you still need to buy' : 'TCGplayer market price' }, money(priced.needTotal)),
      ownsSome && h('span', { class: 'full', title: 'Whole deck' }, money(priced.fullTotal)),
      h('span', { class: 'grow' }),
      this.opts.collapsible &&
        h('button', { class: 'link', title: this.collapsed ? 'Show cards' : 'Hide cards', onclick: () => this.toggle() }, this.collapsed ? '▸' : '▾'),
      this.opts.onClose && h('button', { class: 'link', title: 'Close', onclick: this.opts.onClose }, '×'),
    )

    if (!this.collapsed) {
      const body = h('div', { class: 'body' })
      for (const s of SECTIONS) {
        const lines = priced.lines.filter((l) => l.section === s)
        if (!lines.length) continue
        const subtotal = lines.reduce((n, l) => n + l.total, 0)
        body.append(
          h(
            'div',
            { class: 'section' },
            h('h3', null, h('span', null, `${SECTION_LABEL[s]} (${lines.reduce((n, l) => n + l.qty, 0)})`), h('span', null, money(subtotal))),
            ...lines.map((l) =>
              h(
                'div',
                { class: `line${l.need ? '' : ' done'}` },
                h('span', { class: 'qty' }, String(l.qty)),
                h('span', { class: 'name', title: l.name }, l.name),
                this.ownControl(l.id, priced.lines.filter((x) => x.id === l.id).reduce((n, x) => n + x.qty, 0)),
                l.unit === undefined
                  ? h('span', { class: 'price none', title: 'No TCGplayer price' }, '—')
                  : h('span', { class: 'price', title: `${money(l.unit)} each` }, money(l.total)),
              ),
            ),
          ),
        )
      }
      if (priced.unknown.length)
        body.append(h('div', { class: 'warn' }, `${priced.unknown.length} card(s) not recognized (too new for the price data?).`))
      if (current.deck.unknown?.length)
        body.append(h('div', { class: 'warn' }, `Not matched: ${current.deck.unknown.slice(0, 5).join(', ')}${current.deck.unknown.length > 5 ? '…' : ''}`))
      children.push(body)
    }

    const list = shoppingList(priced)
    const inOrder = this.order.some((o) => o.key === current.key)
    children.push(
      h(
        'div',
        { class: 'foot' },
        h(
          'button',
          {
            class: 'primary',
            disabled: !list.length,
            title: list.length ? 'Open TCGplayer Mass Entry with the cards you still need' : 'You own everything in this deck',
            onclick: () => openTab(massEntryUrl(list)),
          },
          'TCGplayer Mass Entry',
        ),
        h(
          'button',
          {
            title: 'Save this deck to buy later together with other decks, in one Mass Entry',
            onclick: () => void addToOrder({ key: current.key, name: current.name, deck: current.deck, source: current.source }),
          },
          inOrder ? 'Update in multi-deck order list' : 'Add to multi-deck order list',
        ),
        h(
          'div',
          { class: 'note' },
          `TCGplayer market prices, cheapest printing${index.date ? `, ${index.date}` : ''}.` +
            (priced.unpriced ? ` ${priced.unpriced} card(s) have no price.` : ''),
        ),
      ),
    )
    this.el.replaceChildren(...children)
    this.opts.onPriced?.(priced)
  }

  /** Opens the card list (site adapters call it when their on-page total is clicked). */
  expand() {
    this.collapsed = false
    this.opts.onExpand?.()
    this.render()
  }

  /** own − n + All: copies you own (for every deck); All = every copy of this card in this deck (all sections). */
  private ownControl(id: number, inDeck: number) {
    const n = this.owned[id] ?? 0
    return h(
      'span',
      { class: 'own', title: 'Copies you own (for every deck)' },
      h('span', { class: 'lbl' }, 'own'),
      h('button', { disabled: !n, onclick: () => void setOwnedCount(id, n - 1) }, '−'),
      h('span', { class: 'n' }, String(n)),
      h('button', { onclick: () => void setOwnedCount(id, n + 1) }, '+'),
      h(
        'button',
        { class: 'all', disabled: n === inDeck, title: `I own all ${inDeck} in this deck`, onclick: () => void setOwnedCount(id, inDeck) },
        'All',
      ),
    )
  }

  private toggle() {
    this.collapsed = !this.collapsed
    this.render()
  }
}
