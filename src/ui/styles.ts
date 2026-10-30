// Shared styles for the panel and the order list. They live in a shadow root on deck-builder pages, so the site's
// CSS can't reach in (and ours can't leak out). Accent: Spell Card green, after the card Cost Down.

export const STYLES = `
:host { all: initial; }
.cd { font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2024; background: #fafafa;
  border: 1px solid #d5d9dd; border-radius: 10px; box-shadow: 0 4px 18px rgba(0,0,0,.18); overflow: hidden;
  display: flex; flex-direction: column; max-height: inherit; }
.cd * { box-sizing: border-box; }
.head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #fff; border-bottom: 1px solid #e3e6e9; }
.head .logo { width: 22px; height: 22px; border-radius: 4px; flex: none; }
.head .title { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.head .count { font-weight: 700; white-space: nowrap; }
.head .total { font-weight: 700; color: #0b7f99; white-space: nowrap; }
.head .full { color: #6b737a; text-decoration: line-through; white-space: nowrap; }
.head .grow { flex: 1; }
button { font: inherit; cursor: pointer; border: 1px solid #d5d9dd; background: #eef0f2; color: inherit;
  border-radius: 7px; padding: 4px 9px; }
button:hover { background: #e3e6e9; }
button.primary { background: #1a9b7e; border-color: #1a9b7e; color: #fff; font-weight: 700; }
button.primary:hover { background: #158569; }
button.link { background: none; border: none; padding: 2px 4px; color: #6b737a; }
button:disabled { opacity: .5; cursor: default; }
.body { overflow-y: auto; padding: 6px 10px; flex: 1; min-height: 0; }
.section { margin: 6px 0 10px; }
.section h3 { margin: 0 0 4px; font-size: 12px; font-weight: 700; background: #e9ecef; border-radius: 6px; padding: 4px 8px;
  display: flex; justify-content: space-between; }
.line { display: grid; grid-template-columns: 26px 1fr auto 64px; align-items: center; gap: 6px; padding: 3px 4px;
  border-bottom: 1px solid #eef0f2; }
.line:last-child { border-bottom: none; }
.line .qty { font-weight: 700; text-align: right; }
.line .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.line.done .name, .line.done .qty { color: #9aa1a7; }
.line .price { text-align: right; color: #0b7f99; font-variant-numeric: tabular-nums; }
.line .price.none { color: #9aa1a7; }
.own { display: inline-flex; align-items: center; gap: 2px; color: #6b737a; font-size: 11px; }
.own button { padding: 0 6px; border-radius: 5px; line-height: 18px; }
.own .n { min-width: 14px; text-align: center; font-weight: 700; color: #1c2024; }
.foot { padding: 8px 10px; background: #fff; border-top: 1px solid #e3e6e9; display: flex; flex-wrap: wrap; gap: 6px;
  align-items: center; }
.note { color: #6b737a; font-size: 11px; width: 100%; }
.warn { color: #a5530a; font-size: 11px; margin: 4px 0; }
.empty { color: #6b737a; padding: 14px 4px; text-align: center; }
.deckrow { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; padding: 5px 4px;
  border-bottom: 1px solid #eef0f2; }
.deckrow .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.deckrow .meta { color: #6b737a; font-size: 11px; }
.deckrow .price { color: #0b7f99; font-weight: 700; }
`
