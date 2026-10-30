# Cost Down: design (living document; last updated 2026-10-30)

A browser extension (Chrome and Firefox) for Yu-Gi-Oh deck building: while you build a deck on the site you already
use, it shows what the deck costs on TCGplayer, lets you mark cards you already own so the price drops, and sends the
rest to TCGplayer Mass Entry with one click.

Name and icon: **Cost Down**, after the card (it lowers what monsters cost to summon). Icon: the card's artwork.

---

## 1. Why (the request, 2026-10-30)

Mascis is building a batch of decks and wants to (a) build a deck, (b) see its estimated price, (c) click one button
that puts the list into TCGplayer Mass Entry. Today that takes a detour: build, copy ydke, paste it into YGOPRODeck,
and export from there (YGOPRODeck's builder keeps logging people out, so decks can't be saved there). The model is
Limitless TCG's Pokémon builder, which shows card prices as you build and has a buy button. Fuwa Lab is a nice
builder, but its prices are Cardmarket (EU). The point of a live price is editing: drop cards you already own and
watch the total go down.

### What Limitless does (observed 2026-10-30, my.limitlesstcg.com/builder, Pokémon)

Cost Down copies this behavior:
- **Deck total next to the card count** in the deck's header bar ("11 cards  $20.64"), updating on every add/remove.
  Hovering the total shows a cart icon.
- **List view: a price on every line**, right-aligned, for the line (quantity × price: "4 Ultra Ball  $20.08").
  Cards with no TCGplayer price (Japanese prints) show no price and count as $0.
- **Tools menu → "TCGplayer Mass Entry"** opens a new tab:
  `tcgplayer.com/massentry?productline=Pokemon&c=4-676076||4-642533` (quantity-productId, `||` between lines; plus
  Limitless's affiliate tags). Unpriced cards are left out. TCGplayer then shows its "Item Options" dialog (printings,
  conditions; Heavily Played and Damaged unchecked) with "Add to Cart" / "Edit Items".
- Cards are added from search with -1 / +1 in a card dialog; nothing else is needed to see prices (no account).

## 2. Goals and non-goals

Goals
- Behaves like Limitless (§1): total by the card count, per-line prices, a Mass Entry button.
- Works on **Duelingbook** (deck constructor), **Fuwa Lab**, and **Neuron** deck pages (Neuron share links open a
  `db.yugioh-card.com` deck page), chosen by the user 2026-10-30.
- A price panel on the page: total, per-line prices, "I own N" per card, with the total updating as you edit.
  Main, extra **and side** deck all count (user decision 2026-10-30).
- One button: open TCGplayer Mass Entry in a new tab with what you still need.
- An **order list**: add several decks, and Mass Entry gets one combined list (quantities summed, minus what you
  own) for a single order (user request 2026-10-30; Mascis builds many decks and buys once).
- One codebase for Chrome and Firefox.

Non-goals (for now)
- No accounts, no server of its own. No buying or checkout automation: Mass Entry is where it hands off.
- No Cardmarket / EU prices.
- No calls to TCGCSV, TCGplayer's API or the YGOPRODeck API from the extension.

## 3. Architecture

- **WebExtension, Manifest V3**, TypeScript, built with Vite (same stack as Chaos Catalog). The build writes one folder
  per browser: Chrome uses a background service worker; Firefox's manifest gets `background.scripts` and
  `browser_specific_settings.gecko.id`. Everything else is shared.
- **Site adapters** (content scripts, one per site): each knows how to read the current deck from that site's page
  (`main`, `extra`, `side` as passcodes or names) and where to put the panel. When the site changes the deck, the
  adapter reports the new list.
- **Panel**: shared UI injected by the adapter (in a shadow root so site styles don't leak in).
- **Prices**: the background script downloads Chaos Catalog's price file once a day, keeps it in
  `storage.local`, and answers price lookups for the content scripts.
- **Owned counts**: kept in `storage.local` per card, so "I own 2 Ash Blossom" carries over to every deck.

## 4. Prices

Source: **Chaos Catalog's published data** (user decision 2026-10-30), which is TCGplayer market prices from TCGCSV,
rebuilt daily, at `https://brandongeren.github.io/chaos-catalog/data/ygo/`.

The full catalog there is 11.6 MB (with the TCGplayer product map another 2.8 MB), too heavy to download every day.
Chaos Catalog's daily build writes **`cost-down.json`** (built 2026-10-30, Chaos Catalog commit e94894f): per card,
passcode `id`, name `n`, cheapest market price `p` (absent if unpriced), Konami id `kid`, alternate passcodes `alt`,
plus the price `date`. 912 KB, 285 KB compressed; 14,131 of 14,645 cards priced.

A card's price = the cheapest market price across its printings, since Mass Entry by name lets TCGplayer pick the
listing. Shown as "estimated".

## 5. TCGplayer Mass Entry

Open `https://www.tcgplayer.com/massentry?productline=YuGiOh&c=<lines>`, lines joined by `||`. Two line forms work
(verified 2026-10-30): `3 Ash Blossom & Joyous Spring` (name; TCGplayer picks among all printings) and `3-184763`
(quantity-productId; one exact printing, what Limitless sends). Cost Down sends **names**, matching its
cheapest-printing price. Unpriced cards are still sent (TCGplayer may know them). URL length limit: to check with a
big combined order.

## 6. Phases

| Phase | What | Status |
|---|---|---|
| 1 | Skeleton: Chrome + Firefox builds, price download, panel, Mass Entry button, order list; a popup where you paste a .ydk / ydke:// list to test it all without a site | built 2026-10-30 |
| 2 | Neuron / Konami deck pages | deck pages built 2026-10-30; the logged-in builder (edit page) not yet checked |
| 3 | Duelingbook deck constructor | planned |
| 4 | Fuwa Lab | planned |
| 5 | Sharing it: store listings or a signed Firefox file + Chrome unpacked | planned |

### Phase 1 as built (2026-10-30)

- `scripts/build.ts` bundles each entry with esbuild into one classic script (content scripts can't be ES modules) and
  writes a manifest per browser: Chrome `background.service_worker`; Firefox `background.scripts` plus
  `browser_specific_settings.gecko` (id `cost-down@brandongeren.github.io`, Firefox 140+, `data_collection_permissions:
  none`). Permissions: `storage`, host `brandongeren.github.io` only.
- Background script: downloads `cost-down.json` into `storage.local` when missing or 20+ hours old.
- Owned counts are per card (passcode) and shared by every deck; within a deck they cover Main, then Extra, then Side.
  On the order list they count once for the whole order.
- Each line shows its quantity and the price of the copies still needed; the header shows the card count, the total
  still needed, and the whole deck crossed out when you own some.
- Mass Entry gets names, one line per card (sections merged). Unpriced cards are still sent.
- Popup: paste box (ydke://, .ydk text or file, text list) + order list tab. Text lists match names exactly (after
  normalizing case and punctuation); others are listed as not matched.

### Phase 2 as built (2026-10-30): Neuron / Konami deck pages

- Content script `src/sites/konami.ts` on `www.db.yugioh-card.com/yugiohdb/member_deck.action*`; shared plumbing in
  `src/sites/common.ts` (floating panel bottom right, starts collapsed to header + buttons; re-reads the deck when the
  page changes; everything Cost Down adds carries `data-cost-down`).
- Reads the List view tables (present in the page whatever view is shown): Konami id from each row's
  `input.link_value`, copies from `td.num`, mapped to passcodes by `kid`.
- On the page, like Limitless: a fourth counter "TCGplayer Price $x" (or "Still to buy") in the site's own hex-button
  style next to "Total in Main/Extra/Side Deck" (it opens the panel), and a price on every row of the List and Detailed
  List views. The Gallery view has none (the panel lists everything).
- Order-list key `konami:<cgid>:<dno>`, so the language or view in the URL doesn't make a second copy.

## 7. Verified facts

- 2026-10-30: Chaos Catalog's live data is at `/chaos-catalog/data/ygo/` (`meta.json` lists the price days; 14,645
  cards, 46,932 printings). Chaos Catalog already reads .ydk, ydke://, YGO Omega, text, YGOPRODeck and Neuron/Konami
  decks (`src/games/ygo/decks.ts`); Neuron card ids map through YGOPRODeck's `konami_id`.
- 2026-10-26 (Chaos Catalog): Duelingbook deck *links* can't be fetched from outside (Turnstile check). A content script
  running inside the open Duelingbook page doesn't have that problem.

- 2026-10-30: TCGplayer Mass Entry (YuGiOh) fills its list from `c=` with names or quantity-productId (§5).
- 2026-10-30: Fuwa Lab is https://fuwalab.fr/en. Mascis uses Neuron both ways: share links in a browser and the deck
  builder on `db.yugioh-card.com`.

- 2026-10-30: the Chrome build, loaded in Chromium: prices download, a 12-card deck prices (Cost Down $0.14 each),
  owning 2 of 5 Ash Blossom leaves 3 in the Mass Entry link, the order list totals and sends the deck. Firefox build:
  `web-ext lint` 0 errors (one warning: Firefox for Android needs 142+, not a target). Not yet run in Firefox itself.

- 2026-10-30: Konami deck page (sample Neuron link `neuron.konami.net/link/ftxszr4z0w4b701l`, 42/15/15): all 46
  cards priced ($577.07), 92 row prices placed (List + Detailed List), the total box and the panel work in Chromium.
  Chrome rejects a manifest whose `web_accessible_resources.matches` has a path other than `/*` (the extension
  silently doesn't load), so the build uses origin-wide patterns there.

## 8. Still open

- Fuwa Lab: how it holds the deck.
- Duelingbook: how to read the deck the constructor is editing (page DOM vs its own data).
- Neuron / Konami: the logged-in deck builder (edit page, `member_deck.action?ope=2...`): whether it uses the same
  List tables (then it already works) or needs its own reader. Needs a Konami ID login to check.
- Mass Entry URL length limit (§5).
- How Mascis installs it (see phase 5); a Chrome Web Store listing costs a one-time $5.
- Text lists only match exact names; fuzzy matching (Chaos Catalog's search) if pasted lists often miss.
- GitHub repo `brandongeren/cost-down`: the user creates it (no `gh` CLI here); then push `main`.
