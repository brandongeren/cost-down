// Shared styles for the panel and the order list. They live in a shadow root on deck-builder pages, so the site's
// CSS can't reach in (and ours can't leak out). Accent: Spell Card green, after the card Cost Down.
// Colors are variables: light by default, dark when the browser prefers dark (prefers-color-scheme), and Firefox's
// theme colors on top when one is applied (themeVars(), from the background script).

export const STYLES = `
:host { all: initial; }
.cd {
  --cd-bg: #fafafa; --cd-surface: #fff; --cd-text: #1c2024; --cd-muted: #6b737a; --cd-faint: #9aa1a7;
  --cd-border: #d5d9dd; --cd-line: #eef0f2; --cd-section: #e9ecef; --cd-btn: #eef0f2; --cd-btn-hover: #e3e6e9;
  --cd-price: #0b7f99; --cd-accent: #1a9b7e; --cd-accent-hover: #158569; --cd-warn: #a5530a; --cd-link: #1a5fb4;
  color-scheme: light;
  font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--cd-text); background: var(--cd-bg);
  border: 1px solid var(--cd-border); border-radius: 10px; box-shadow: 0 4px 18px rgba(0,0,0,.18); overflow: hidden;
  display: flex; flex-direction: column; max-height: inherit; }
@media (prefers-color-scheme: dark) {
  .cd {
    --cd-bg: #1f2226; --cd-surface: #272a2f; --cd-text: #e6e8ea; --cd-muted: #a3aab0; --cd-faint: #737a80;
    --cd-border: #3b4046; --cd-line: #32363c; --cd-section: #32363c; --cd-btn: #353a40; --cd-btn-hover: #40454c;
    --cd-price: #5cc8e0; --cd-warn: #f0a35a; --cd-link: #8ab4f8;
    color-scheme: dark; box-shadow: 0 4px 18px rgba(0,0,0,.5); }
}
.cd * { box-sizing: border-box; }
.cd a { color: var(--cd-link); }
.head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--cd-surface); border-bottom: 1px solid var(--cd-line); }
.head .logo { width: 22px; height: 22px; border-radius: 4px; flex: none; }
.head .title { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.head .count { font-weight: 700; white-space: nowrap; }
.head .total { font-weight: 700; color: var(--cd-price); white-space: nowrap; }
.head .full { color: var(--cd-muted); text-decoration: line-through; white-space: nowrap; }
.head .grow { flex: 1; }
button { font: inherit; cursor: pointer; border: 1px solid var(--cd-border); background: var(--cd-btn); color: inherit;
  border-radius: 7px; padding: 4px 9px; }
button:hover { background: var(--cd-btn-hover); }
button.primary { background: var(--cd-accent); border-color: var(--cd-accent); color: #fff; font-weight: 700; }
button.primary:hover { background: var(--cd-accent-hover); }
button.link { background: none; border: none; padding: 2px 4px; color: var(--cd-muted); }
button:disabled { opacity: .5; cursor: default; }
.body { overflow-y: auto; padding: 6px 10px; flex: 1; min-height: 0; }
.hint { margin: 2px 0 6px; padding: 5px 8px; border-radius: 6px; background: var(--cd-section); color: var(--cd-text);
  font-size: 12px; line-height: 1.35; }
.bulk { display: flex; gap: 6px; margin: 2px 0 4px; }
.bulk button { flex: 1; padding: 3px 6px; font-size: 12px; }
.section { margin: 6px 0 10px; }
.section h3 { margin: 0 0 4px; font-size: 12px; font-weight: 700; background: var(--cd-section); border-radius: 6px; padding: 4px 8px;
  display: flex; justify-content: space-between; }
.line { display: grid; grid-template-columns: 26px 1fr auto 64px; align-items: center; gap: 6px; padding: 3px 4px;
  border-bottom: 1px solid var(--cd-line); }
.line:last-child { border-bottom: none; }
.line .qty { font-weight: 700; text-align: right; }
.line .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* The rarity sits on its own row under the name, as wide as the name, own and price columns. */
.line .rarity { grid-column: 2 / -1; justify-self: start; max-width: 100%; margin-top: -2px; font: inherit; font-size: 11px;
  color: var(--cd-muted); }
.line select.rarity { padding: 0 2px; border: 1px solid var(--cd-border); border-radius: 5px; background: var(--cd-surface);
  color: var(--cd-muted); cursor: pointer; }
.line select.rarity.picked { color: var(--cd-text); border-color: var(--cd-accent); }
.line.done .name, .line.done .qty { color: var(--cd-faint); }
.line .price { text-align: right; color: var(--cd-price); font-variant-numeric: tabular-nums; }
.line .price.none { color: var(--cd-faint); }
.own { display: inline-flex; align-items: center; gap: 2px; color: var(--cd-muted); font-size: 11px; }
.own button { padding: 0 6px; border-radius: 5px; line-height: 18px; }
.own .n { min-width: 14px; text-align: center; font-weight: 700; color: var(--cd-text); }
.own button.all { padding: 0 4px; font-size: 10px; font-weight: 700; }
:host([data-narrow]) .line { grid-template-columns: 16px 1fr auto 46px; gap: 3px; }
:host([data-narrow]) .bulk button { font-size: 11px; padding: 3px 3px; }
:host([data-narrow]) .own .lbl { display: none; }
:host([data-narrow]) .body, :host([data-narrow]) .head, :host([data-narrow]) .foot { padding-left: 7px; padding-right: 7px; }
.foot { padding: 8px 10px; background: var(--cd-surface); border-top: 1px solid var(--cd-line); display: flex; flex-wrap: wrap; gap: 6px;
  align-items: center; }
.note { color: var(--cd-muted); font-size: 11px; width: 100%; }
.warn { color: var(--cd-warn); font-size: 11px; margin: 4px 0; }
.empty { color: var(--cd-muted); padding: 14px 4px; text-align: center; }
.sub { margin: 8px 0 3px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--cd-muted); }
.deckrow { display: grid; grid-template-columns: auto 1fr auto auto; gap: 6px; align-items: center; padding: 5px 2px;
  border-bottom: 1px solid var(--cd-line); }
.deckcards { margin: 0 0 6px 26px; padding: 2px 0; border-left: 2px solid var(--cd-line); }
.mini { display: grid; grid-template-columns: 22px 1fr auto 56px; gap: 6px; padding: 1px 6px; font-size: 12px; }
.mini .qty { font-weight: 700; text-align: right; }
.mini .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini .sec { color: var(--cd-muted); font-size: 11px; }
.mini .price { text-align: right; color: var(--cd-price); font-variant-numeric: tabular-nums; }
.buy { display: grid; grid-template-columns: 26px 1fr 64px; gap: 6px; align-items: start; padding: 4px 4px;
  border-bottom: 1px solid var(--cd-line); }
.buy .qty { font-weight: 700; text-align: right; }
.buy .name { min-width: 0; }
.buy .name > span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.buy .meta { color: var(--cd-muted); font-size: 11px; }
.buy .price { text-align: right; color: var(--cd-price); font-variant-numeric: tabular-nums; }
.buy.done .qty, .buy.done .name > span, .buy.done .price { color: var(--cd-faint); }
.deckrow .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.deckrow .meta { color: var(--cd-muted); font-size: 11px; }
.deckrow .price { color: var(--cd-price); font-weight: 700; }
`

/** Firefox theme colors, as the background script stores them (null fields = the theme doesn't set that color). */
export interface ThemeColors {
  /** Popup/menu background, text and border, from the theme's `popup`, `popup_text`, `popup_border`. */
  bg: string | null
  text: string | null
  border: string | null
  /** A secondary surface (the theme's `toolbar_field` or `toolbar`), for headers and sections. */
  surface: string | null
}

/** CSS that applies a Firefox theme's colors over the light/dark defaults ('' when there's no theme to apply). */
export function themeVars(t: ThemeColors | undefined): string {
  if (!t || !t.bg || !t.text) return ''
  const v = [`--cd-bg: ${t.bg}`, `--cd-text: ${t.text}`, `--cd-surface: ${t.surface ?? t.bg}`, `--cd-section: ${t.surface ?? t.bg}`]
  if (t.border) v.push(`--cd-border: ${t.border}`, `--cd-line: ${t.border}`)
  return `.cd { ${v.join('; ')}; }`
}
