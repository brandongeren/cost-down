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

## 2. Goals and non-goals

Goals
- Works on **Duelingbook** (deck constructor), **Fuwa Lab**, and **Neuron** deck pages (Neuron share links open a
  `db.yugioh-card.com` deck page), chosen by the user 2026-10-30.
- A price panel on the page: total, per-card prices, "I own N" per card, with the total updating as you edit.
- One button: open TCGplayer Mass Entry in a new tab with what you still need.
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
Plan: Chaos Catalog's daily build also writes a small `cost-down.json` keyed by passcode: name (as TCGplayer spells it),
and the cheapest printing's market price. Proposed, not built.

A card's price = the cheapest market price across its printings, since Mass Entry by name lets TCGplayer pick the
listing. Shown as "estimated".

## 5. TCGplayer Mass Entry

Open `https://www.tcgplayer.com/massentry?productline=YuGiOh&c=<lines>`, lines like `3 Ash Blossom & Joyous Spring`
joined by `||`, URL-encoded. **To verify** before relying on it (format, URL length limit, names TCGplayer doesn't
match).

## 6. Phases

| Phase | What | Status |
|---|---|---|
| 1 | Skeleton: Chrome + Firefox builds, price download, panel, Mass Entry button; a popup where you paste a .ydk / ydke:// list to test it all without a site | planned |
| 2 | Neuron / Konami deck pages | planned |
| 3 | Duelingbook deck constructor | planned |
| 4 | Fuwa Lab | planned |
| 5 | Sharing it: store listings or a signed Firefox file + Chrome unpacked | planned |

## 7. Verified facts

- 2026-10-30: Chaos Catalog's live data is at `/chaos-catalog/data/ygo/` (`meta.json` lists the price days; 14,645
  cards, 46,932 printings). Chaos Catalog already reads .ydk, ydke://, YGO Omega, text, YGOPRODeck and Neuron/Konami
  decks (`src/games/ygo/decks.ts`); Neuron card ids map through YGOPRODeck's `konami_id`.
- 2026-10-26 (Chaos Catalog): Duelingbook deck *links* can't be fetched from outside (Turnstile check). A content script
  running inside the open Duelingbook page doesn't have that problem.

## 8. Still open

- Fuwa Lab: its URL and how it holds the deck.
- Duelingbook: how to read the deck the constructor is editing (page DOM vs its own data).
- Neuron: whether Mascis uses Neuron share links in a browser, or the deck builder on `db.yugioh-card.com`.
- Side deck: count it in the price and the export, or main + extra only by default?
- Mass Entry format and limits (§5).
- How Mascis installs it (see phase 5); a Chrome Web Store listing costs a one-time $5.
- GitHub repo `brandongeren/cost-down`: not created yet.
