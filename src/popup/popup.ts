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

// Firefox doesn't grant an add-on's website access at install (Chrome does), so content scripts don't run until
// the user allows it. Ask here, where a button click counts as the user gesture the request needs.
async function checkSiteAccess() {
  const origins = [...new Set((chrome.runtime.getManifest().content_scripts ?? []).flatMap((c) => c.matches ?? []))]
  if (!origins.length || (await chrome.permissions.contains({ origins }))) return
  const box = $('perm')
  box.hidden = false
  $('permbtn').addEventListener('click', async () => {
    if (await chrome.permissions.request({ origins })) box.hidden = true
  })
}

// On a supported deck page, offer to bring back the on-page panel (after it was closed with ×).
async function offerShowPanel() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id === undefined) return
  const reply = (await chrome.tabs.sendMessage(tab.id, { type: 'costDownPing' }).catch(() => undefined)) as { hasDeck?: boolean } | undefined
  if (!reply?.hasDeck) return
  $('showpanel').hidden = false
  $('showpanelbtn').addEventListener('click', async () => {
    await chrome.tabs.sendMessage(tab.id!, { type: 'costDownShowPanel' }).catch(() => undefined)
    window.close()
  })
}

async function main() {
  void checkSiteAccess()
  void offerShowPanel()
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
