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
- A **multi-deck order list** (renamed from "order list" 2026-10-30, user request): add several decks, and Mass Entry gets one combined list (quantities summed, minus what you
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
| 2 | Neuron / Konami deck pages | built 2026-10-30 (deck pages and the logged-in builder) |
| 3 | Duelingbook deck constructor | built 2026-10-30; a signed-in check with a saved deck is the user's |
| 4 | Fuwa Lab | built 2026-10-30 |
| 5 | Sharing: Chrome Web Store + Firefox Add-ons listings, and a signed Firefox file to hand out | prepared 2026-10-30; submitting needs the user's accounts |

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

### Neuron deck editor: prices and "Fill deck" from a ydke code (2026-10-30, user request)

- The signed-in editor (`member_deck.action?ope=2`) is read from its own slots, so the total follows edits live
  (Cost Down also re-reads on every input/change event; value changes aren't DOM mutations).
- How the editor works was learned from a recording the user made in their own signed-in Chrome (DevTools, sanitized
  HAR, no cookies) while adding cards and saving, because Konami's sign-in returned 403 in the automated recorder
  window. Slots: 65 Monster / Spell / Trap rows, 20 Extra, 20 Side; each has a name, a count `.cnum` ("0" empty, 1-3),
  a hidden Konami id and an artwork value (`<id>_1_1_1`, or `null_null_null_null` when empty). Save posts the whole
  form (plus the page's `ytkn` token); the server goes by the ids.
- A **Cost Down box above the deck counters** takes a ydke:// code (or .ydk / text list) and **replaces every slot**:
  Main cards go to Monster / Spell / Trap by frame type (`f`, added to `cost-down.json` 2026-10-30), Extra and Side by
  section; one row per card, up to 3 copies; default artwork. It then fires the page's own count-change handler so
  Konami's totals update. It asks before replacing a non-empty deck, and **never saves**: the user checks and presses
  Konami's Save. Cards with no Konami id, more than 3 copies or more distinct cards than rows are reported, not
  guessed.
- Row prices in the editor sit on a small line under the card name (the name boxes are too narrow to share).

### Phase 3 as built (2026-10-30): Duelingbook

- Duelingbook is one page (`www.duelingbook.com`) driven by its own `main.js`; the deck isn't in the DOM. A page-world
  script (`src/sites/duelingbook-page.ts`, manifest `world: "MAIN"`, Chrome 111+ / Firefox 128+) reads the app's
  variables twice a second and posts the deck (passcodes) to the content script (`src/sites/duelingbook.ts`) when it
  changes: `currentLabel === "deck_constructor"`; `deck_filled_arr` / `extra_filled_arr` / `side_filled_arr` hold
  jQuery card elements whose `.data('id')` is Duelingbook's card id; `getCard(id).serial_number` is the passcode.
  It only reads.
- On the page: a "$x TCGplayer" badge left of the counters column (total / effect / spell / trap), and the panel in
  the empty left column between the counters and the Import / Export buttons (compact layout when narrow).
- Order-list key `duelingbook:<currentDeckId>`; the name is the loaded deck's (`deck.deckData.name`, else the deck
  dropdown), else "Duelingbook deck".
- Duelingbook's own Import Deck takes ydke codes already, so there's no Cost Down filler there.

### Phase 5: sharing (decided 2026-10-30)

- The user wants both browsers, for anyone ("other people will want to use this"): a **Chrome Web Store** listing, a
  **Firefox Add-ons** listing, and a **signed Firefox file** to hand out directly.
- Prepared in the repo: `PRIVACY.md` (the privacy policy URL both stores ask for), `store/LISTING.md` (listing text and
  Chrome's "privacy practices" answers), `store/amo-metadata.json` (Mozilla listing), `store/screenshots/` (1280x800,
  taken from the real build on Neuron and Duelingbook), `store/promo-tile-440x280.png`.
- `npm run package` zips both builds; `npm run package:source` zips the source (`git archive HEAD`) for Mozilla's
  reviewers; `npm run sign:firefox [-- --listed]` signs through Mozilla with the user's API key from
  `.amo-credentials.json` (gitignored).
- Chrome Web Store uploads are done by the user in the developer dashboard, under a friend's developer account.
- License: MIT (user decision 2026-10-30). Artwork: keep the Cost Down card art for the icon and promo tile (user
  decision 2026-10-30; noted in LICENSE as Konami's, not covered).
- Before the store: Mascis tests a local build (`cost-down-for-testing.zip`: unpacked Chrome folder, Firefox zip,
  install steps).

### Phase 4 as built (2026-10-30): Fuwa Lab

- Fuwa Lab (`fuwalab.fr/builder`) is a single-page app whose builder core is plain scripts (`/js/deck.js` etc.). The
  deck module is `window.A`: `A.getDeck()` returns {main, extra, side} as YGOPRODeck card objects (`id` = passcode),
  and `ygo:deck-rendered` fires on window after each redraw. Same page-world pattern as Duelingbook
  (`src/sites/fuwalab-page.ts` + `src/sites/fuwalab.ts`, shared handoff in `src/sites/bridge.ts`).
- Scripts match the whole site (`https://fuwalab.fr/*`) because moving to the builder from Fuwa Lab's other pages
  doesn't load a new page; they do nothing until the deck column (#dscroll) is on screen.
- Fuwa Lab shows Cardmarket € prices: a subtotal per section header (`.sec-block[data-sec] .sec-hd-price`) and per
  card in the hover overlay (`.dc-card[data-card-id] .dc-card-price`). Cost Down puts the TCGplayer $ right after
  each (same CSS `order` as the € so it lands next to it); the panel floats bottom right, collapsed.
- Order-list key `fuwalab:<share code>` for a saved deck, else the deck name.

### Closing and reopening the on-page panel (2026-10-30, user request)

- × on the panel hides it for that page and leaves a small round Cost Down button (bottom right, above the corner;
  on Duelingbook where the panel was). Clicking it brings the panel back.
- **On-page totals show only while the panel's card list is open** (2026-11-09, user request): minimizing (▾) or
  closing (×) the panel hides the deck total Cost Down puts on the page (Neuron's "Still to buy / TCGplayer Price" box,
  Duelingbook's "$x still to buy" badge, Fuwa Lab's per-section totals; `[data-cost-down="total"]` or
  `[data-cost-down-total]`). Per-card prices stay. Since the panel starts minimized, a page first shows no total.
  Verified 2026-11-09 on a Neuron deck page in Chromium (start, expand, minimize, close, reopen).
- The toolbar popup shows "Show the Cost Down panel on this page" when the current tab is a supported deck page
  (it asks the tab's content script; no `tabs` permission needed).

### Moving and hiding the on-page panel (2026-10-30, user requests)

- Drag the panel by its header anywhere on screen; the spot is remembered per site (`panelPos` by hostname) and
  overrides the site's default placement; double-click the header to put it back. The reopen button follows it,
  until the user drags the button itself (2026-11-09, user request): then it stays at its own spot (`reopenPos` by
  hostname). A press that moves under 5 px is a click (opens the panel); more is a drag. Verified 2026-11-09 on a
  Neuron deck page: dragged, kept its spot after a reload, a click still opened the panel.
- Popup switch **"Keep the panel hidden until I open it"** (`panelHidden`): deck pages start with only the small
  reopen button; it or the popup's "Show the Cost Down panel on this page" opens the panel.
  Per-card prices on the page stay visible; the deck total doesn't (see above).
- Nothing shows on a site's pages until a deck is on screen (Duelingbook: only in the deck constructor, and on deck
  link pages `/deck?id=`, which use the same deck screen; the id comes from the link). Card elements carry their
  passcode (`.data('serial_number')`), which works there too; deck link pages don't load the full card list.
- Owned counts: **None − n + All** per line; None sets the count to 0, All to every copy of that card in the loaded
  deck (all sections). Above the list, **Add all to order** (None for every card in the deck) and **Remove all from
  order** (owned raised to the deck's copies for every card; never lowered) (2026-10-30, user request).
- The card list starts with the instruction "Enter how many copies of each card you own; the rest can be added to your
  cart." (the number on each line is copies owned, not copies to buy; user request 2026-10-30). The card list keeps its scroll position when the panel redraws (it used to jump to the top on +/−).

### Light / dark and browser themes (2026-10-30, user request)

- The panel, order list and popup use CSS variables: light by default, dark under `prefers-color-scheme: dark`
  (Chrome: the system or Chrome's Appearance setting; Firefox: its website appearance setting).
- Firefox themes: the background script reads `browser.theme.getCurrent()` (Firefox manifest adds the `theme`
  permission) and stores `theme` {bg, text, border, surface} from the theme's popup / toolbar colors; every Cost Down
  shadow root and the popup apply them over light/dark, and follow `theme.onUpdated`. Chrome has no theme API for
  extensions, so Chrome follows light/dark only.

### Multi-deck order list view (2026-10-30, user request)

- Renamed from "order list" (button "Add to multi-deck order list", popup tab "Multi-deck order list").
- The popup shows **Decks** (each opens with ▸ to list its own cards and prices) and **What you'll buy**: every card
  once, copies to buy, price, and where they come from ("Snake-Eye ×3 · Yubel ×3 · you own 3"). Cards fully covered
  by what you own stay listed, greyed, "covered by what you own", instead of disappearing. Most expensive first.

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

- 2026-10-30: works in Firefox on a Neuron deck page (checked by the user). Firefox doesn't grant an add-on's website
  access at install, so content scripts don't run until it's allowed; the popup shows "Allow on deck sites"
  (`chrome.permissions.request`) when it's missing, and that fixed it.
- 2026-10-30: the logged-in Konami deck builder (edit page) shows the prices too (checked by the user in Firefox).

- 2026-10-30: editor filler, tested on the user's recorded editor page served in place of the live one (saves
  blocked): a 9/1/2 ydke code filled Main, Extra and Side with the right names, counts, ids and artwork values, and
  Konami's own totals updated (9 / 1 / 2). With frame types live, the same code put Ash Blossom in Monsters and Called
  by the Grave, Cost Down and Terraforming in Spells (Konami's table totals 3 / 6).
- 2026-10-30: saved on the real site by the user: a filled deck saves, and **Konami re-sorts cards into the right
  table on Save** (spells and traps put in the Monster table, before frame types were live, came back correct). So the
  frame-type split is for a correct view before saving, not something Save depends on.

- 2026-10-30: Duelingbook, signed out, in Chromium: the constructor opens without an account; a deck put on screen
  with the app's own functions (`newCardFront().initializeAndLimit(card)`, `addCardToMain/Extra/Side`) priced
  ($2.48 for 9 cards), followed an added card ($2.62), and the badge and panel went away on leaving the constructor.
  Its Import Deck asks for a new deck name first (a saved deck, needs an account), so it wasn't used for testing.

- 2026-10-30: Fuwa Lab answers HTTP 429 to headless browsers that say "HeadlessChrome" in their user agent (fonts,
  scripts and API calls all blocked); with an ordinary Chrome user agent the same page loaded with no 429s. Tests use
  one load at a time, with pauses.
- 2026-10-30: Fuwa Lab, signed out, in Chromium: a deck set with the app's own `A._setDeck()` showed $1.83 / $0.22 /
  $0.43 next to 1.86€ / 0.02€ / 0.51€, and adding a card the same way moved Main to $1.97. Its Import menu needs a
  deck created first; signed out, "Initialize deck" made no server call.

- 2026-10-30: reopen tested on a Neuron deck page: × hides the panel and shows the button; the button, the page's
  price total and the popup's message each bring it back.

- 2026-10-30: drag tested on a Neuron deck page: dragged 400 px left and 300 px up, the same spot after a reload,
  double-click put it back; with the switch on, a new page load showed only the reopen button (page price still shown)
  and clicking it opened the panel.

- 2026-10-30: Duelingbook deck link page (behind Cloudflare's human check, so cards were put on screen with the
  app's functions): priced ($1.79), × then the corner TCGplayer badge reopened the panel; nothing shows on the front
  page or before cards load. Neuron: scrolled list stayed at 600 px after +; All on Ash Blossom set owned to 3.

- 2026-10-30: dark mode checked in Chromium (panel and popup), and stored theme colors restyled both live. A real
  Firefox theme isn't tested yet (no Firefox automation here).

## 8. Still open

- **2026-11-09: Firefox 0.1.1 submitted too** (on-page totals hide with the panel, draggable reopen button), and a
  Chrome Web Store bundle for 0.1.1 made (`~/Downloads/cost-down-chrome-web-store-0.1.1.zip`); its instructions
  (`HOW TO SUBMIT.txt`: which file goes where in the dashboard, then the steps) are `store/CHROME-SUBMIT.txt`.
- **Status 2026-11-09: Firefox listed version 0.1.0 submitted** (`npm run sign:firefox -- --listed`; AMO slug `cost-down`,
  version 6685236, awaiting Mozilla review; web-ext's approval wait timed out, which is expected). Screenshots added to the
  AMO listing by the user (2026-11-09). Still to do: the Chrome Web Store upload under the user's friend's account.

- Fuwa Lab signed in: a saved deck's key (share code) and name, and a check with the real Import of a ydke code.
- Duelingbook signed in: a saved deck's name shows in the panel (where `deck.deckData` keeps it is a guess), and the
  order-list key stays the same across reloads.
- Neuron / Konami builder: does the total follow live edits (adding/removing a card without reloading)?
- Mass Entry URL length limit (§5).
- Text lists only match exact names; fuzzy matching (Chaos Catalog's search) if pasted lists often miss.
- GitHub repo `brandongeren/cost-down`: the user creates it (no `gh` CLI here); then push `main`.
