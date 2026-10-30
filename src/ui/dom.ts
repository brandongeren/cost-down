import { themeVars, type ThemeColors } from './styles.ts'

/** Tiny element builder: h('div', {class: 'x', onclick}, child, 'text'). */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> | null = null,
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined || v === null || v === false) continue
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener)
    else if (k === 'class') el.className = String(v)
    else el.setAttribute(k, String(v))
  }
  append(el, ...children)
  return el
}

/** el.append, skipping false/null/undefined (for conditional children). */
export function append(el: Element, ...children: (Node | string | null | undefined | false)[]): void {
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c)
}

/** A shadow root with Cost Down's styles, attached to host (and the Firefox theme's colors, kept up to date). */
export function shadow(host: HTMLElement, css: string): ShadowRoot {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
  const theme = h('style', { 'data-theme': '' })
  root.replaceChildren(h('style', null, css), theme)
  void followTheme((cssText) => (theme.textContent = cssText))
  return root
}

/** Calls apply with themeVars() for the current Firefox theme now and whenever it changes ('' = no theme colors). */
export async function followTheme(apply: (css: string) => void): Promise<void> {
  apply(themeVars((await chrome.storage.local.get('theme')).theme as ThemeColors | undefined))
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'theme' in changes) apply(themeVars(changes.theme.newValue as ThemeColors | undefined))
  })
}

/** Opens a page in a new tab (works from content scripts and extension pages). */
export function openTab(url: string): void {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) void chrome.tabs.create({ url })
  else window.open(url, '_blank', 'noopener')
}

/** The Cost Down icon (the card's artwork). Content scripts can load it because the manifest lists it as web-accessible. */
export const logo = () => h('img', { class: 'logo', src: chrome.runtime.getURL('icons/32.png'), alt: '', title: 'Cost Down' })
