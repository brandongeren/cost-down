// The toolbar popup: price a pasted decklist (works for any builder that exports .ydk / ydke://), and the order list.

import { parseDeck } from '../core/deck.ts'
import { loadPrices } from '../core/store.ts'
import { shadow } from '../ui/dom.ts'
import { OrderList } from '../ui/order.ts'
import { DeckPanel } from '../ui/panel.ts'
import { STYLES } from '../ui/styles.ts'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

for (const b of document.querySelectorAll<HTMLButtonElement>('nav button'))
  b.addEventListener('click', () => {
    for (const o of document.querySelectorAll<HTMLButtonElement>('nav button')) o.classList.toggle('on', o === b)
    for (const s of document.querySelectorAll('section')) s.hidden = s.id !== b.dataset.tab
  })

const panel = new DeckPanel()
shadow($('panel'), STYLES).append(panel.el)

// A pasted deck gets one key per paste session, so "Update in order list" replaces it rather than adding twice.
const pasteKey = `paste:${crypto.randomUUID()}`

async function main() {
  let index
  try {
    index = await loadPrices()
  } catch (e) {
    panel.setPrices(undefined, (e as Error).message)
    return
  }
  panel.setPrices(index)
  shadow($('orderlist'), STYLES).append(new OrderList(index).el)

  const input = $<HTMLTextAreaElement>('input')
  const name = $<HTMLInputElement>('name')
  const update = () => {
    const text = input.value.trim()
    if (!text) return panel.setDeck(undefined)
    try {
      const deck = parseDeck(text, index)
      panel.setDeck({ deck, name: name.value.trim() || deck.name || 'Pasted deck', key: pasteKey })
    } catch (e) {
      panel.setPrices(index, (e as Error).message)
    }
  }
  input.addEventListener('input', update)
  name.addEventListener('input', update)
  $<HTMLInputElement>('file').addEventListener('change', async (ev) => {
    const f = (ev.target as HTMLInputElement).files?.[0]
    if (!f) return
    input.value = await f.text()
    if (!name.value) name.value = f.name.replace(/\.(ydk|txt)$/i, '')
    update()
  })
}

void main()
