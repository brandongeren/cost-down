# Cost Down

A Chrome and Firefox extension for Yu-Gi-Oh! deck building: see what a deck costs on TCGplayer, mark the cards you
already own, and send the rest to TCGplayer Mass Entry in one click. Several decks can go on a multi-deck order list and be
bought in one Mass Entry.

Named after the card [Cost Down](https://ygoprodeck.com/card/cost-down-5575) (its artwork is the icon).

Design and status: [DESIGN.md](DESIGN.md).

## Install (from source)

```bash
npm install
npm run build        # writes dist/chrome and dist/firefox
```

- **Chrome / Edge / Brave:** open `chrome://extensions`, turn on **Developer mode**, **Load unpacked**, pick
  `dist/chrome`.
- **Firefox (140+):** open `about:debugging#/runtime/this-firefox`, **Load Temporary Add-on**, pick
  `dist/firefox/manifest.json`. (Temporary add-ons go away when Firefox restarts; a signed build comes with phase 5.)

Then click the Cost Down icon in the toolbar.

## Use

- **Price a deck:** paste a `ydke://` link, a `.ydk` file, or a text list (`3 Ash Blossom & Joyous Spring`, optional
  `Main` / `Extra` / `Side` headings). Any builder that exports one of these works (Duelingbook, EDOPro, YGOPRODeck,
  ...).
- **Neuron / Konami deck pages** (`db.yugioh-card.com`, where Neuron share links open): the deck's TCGplayer price
  appears next to "Total in Main / Extra / Side Deck", each card row shows its price, and the Cost Down panel (bottom
  right) has the owned counts and buttons.
- **Duelingbook** deck constructor: the deck's price appears next to the card counters on the left, with the Cost Down
  panel under it. (Firefox: if the popup shows "Allow on deck sites" again, click it; each new site needs it once.)
- **Fuwa Lab** builder: the TCGplayer price appears next to Fuwa Lab's own € price, for each section and on each
  card's hover overlay.
- **Neuron deck editor** (signed in, editing a deck): prices follow your edits, and a **Cost Down box** above the deck
  counters fills the whole deck from a pasted `ydke://` code. It replaces every card and saves nothing; check the
  deck, then press Konami's **Save**.
- **own None / − / + / All** on a card: copies you own (None = 0, All = every copy in this deck). They're remembered for
  every deck and taken off the price and the order. **Add all to order** / **Remove all from order** above the list do
  the same for every card at once.
- **× closes the on-page panel**; the small round Cost Down button that's left (or the toolbar popup's "Show the
  Cost Down panel on this page") brings it back. Drag that button anywhere; it remembers the spot per site.
- The deck total Cost Down adds to the page ("still to buy") shows only while the panel's card list is open;
  minimizing or closing the panel hides it.
- **Drag the panel** by its header wherever you like (remembered per site; double-click the header to put it back).
  The popup's **"Keep the panel hidden until I open it"** switch starts every deck page with just the small Cost Down
  button.
- **TCGplayer Mass Entry:** opens TCGplayer's Mass Entry with what you still need. Check the printing and condition
  options there, then **Add to Cart**.
- **Multi-deck order list:** **Add to multi-deck order list** on any deck, then the popup's **Multi-deck order list**
  tab sends every deck at once (owned copies
  count once for the whole order).

Cost Down follows your browser's light / dark setting, and in Firefox the colors of the theme you've applied.

## Prices

TCGplayer market prices (USD), the cheapest printing of each card, from [TCGCSV](https://tcgcsv.com) by way of
[Chaos Catalog](https://github.com/brandongeren/chaos-catalog)'s daily data build (`data/ygo/cost-down.json`). The
extension downloads that one file at most once a day and calls nothing else: no TCGplayer, TCGCSV or YGOPRODeck APIs.
Nothing you do is sent anywhere; owned counts and the order list stay in your browser.

## Packaging

```bash
npm run package      # dist/packages/cost-down-chrome-<version>.zip and cost-down-firefox-<version>.zip
```

The Chrome zip can be uploaded to the Chrome Web Store, or unzipped and loaded unpacked. Firefox only installs
permanently from a Mozilla-signed file: `npm run sign:firefox` (signed file to hand out) or
`npm run sign:firefox -- --listed` (submit to Firefox Add-ons); both need a Mozilla API key in `.amo-credentials.json`
(see the script's header). Store text, screenshots and the privacy policy are in `store/` and `PRIVACY.md`.

## Development

```bash
npm test             # unit tests (deck parsing, pricing, Mass Entry links)
npm run typecheck
npm run watch        # rebuild on change; reload the extension in the browser
npx web-ext lint -s dist/firefox   # Mozilla's add-on checks
```

Code map: `src/core/` (decklists, prices, Mass Entry, storage), `src/ui/` (panel, order list), `src/popup/`,
`src/background.ts` (price download), `src/sites/` (one content script per deck-builder site), `scripts/build.ts`
(both browsers' builds and manifests), `static/` (popup page, icons).
