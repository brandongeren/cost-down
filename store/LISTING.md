# Store listing text (Chrome Web Store and Firefox Add-ons)

**Name:** Cost Down

**Summary** (132 characters max):
See what your Yu-Gi-Oh! deck costs on TCGplayer while you build it, drop the cards you own, and buy the rest with one click.

**Category:** Chrome: Shopping (or Tools). Firefox: Shopping.

**Description:**

Cost Down puts TCGplayer prices on the Yu-Gi-Oh! deck builder you already use, the way the Limitless builder does for
Pokémon.

• The deck's price appears right next to the builder's card counts, and every card shows its price.
• Mark the copies you already own: the total drops to what you still need to buy, and your owned counts carry over
  to every deck.
• One click opens TCGplayer Mass Entry with exactly the cards you still need.
• Order list: add several decks and buy them all in one Mass Entry (cards you own count once for the whole order).
• Works on Yu-Gi-Oh! Neuron / the Konami card database (deck pages and the deck editor), Duelingbook's deck
  constructor and Fuwa Lab, and with any ydke:// code, .ydk file or text list pasted into the toolbar popup.
• On the Neuron deck editor, paste a ydke:// code to fill the whole deck; you check it and press Save yourself.

Prices are TCGplayer market prices (USD) for each card's cheapest printing, updated daily from TCGCSV by way of the
free Chaos Catalog project. Cost Down collects no data: no accounts, no tracking, nothing uploaded.

Not affiliated with Konami, TCGplayer, Duelingbook or Fuwa Lab. Yu-Gi-Oh! is a trademark of Konami.

**Privacy policy URL:** https://github.com/brandongeren/cost-down/blob/main/PRIVACY.md
**Homepage / support:** https://github.com/brandongeren/cost-down

## Chrome Web Store "Privacy practices" answers

- **Single purpose:** Show TCGplayer prices for the Yu-Gi-Oh! deck on supported deck-builder pages and send the
  cards you still need to TCGplayer Mass Entry.
- **storage:** keeps the daily price file, the cards you mark as owned and your order list on your computer.
- **Host permissions** (brandongeren.github.io, www.db.yugioh-card.com, www.duelingbook.com, fuwalab.fr): download
  the price file; read the deck shown on those deck-builder pages to price it.
- **Remote code:** No. All code is in the package; the price file is data (JSON).
- **Data usage:** collects none of the listed data types. Certify: not sold, not used for unrelated purposes, not used
  for credit.

## Firefox Add-ons notes for reviewers

The package is built from this repository with esbuild (bundling only, not minified). To rebuild: Node 20+,
`npm ci`, `npm run build`; the Firefox build is `dist/firefox`. Source bundle: `npm run package:source`.
The Duelingbook page script (`src/sites/duelingbook-page.ts`, `world: "MAIN"`) only reads the deck constructor's
variables and posts the deck (card passcodes) to the content script with `window.postMessage`.
