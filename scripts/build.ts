// Builds the extension for both browsers: dist/chrome and dist/firefox (same code, different manifest).
//
// Usage: npm run build            one build
//        npm run watch            rebuild on every change
//
// Each entry is bundled into one classic script (IIFE): content scripts can't be ES modules, and the same file
// runs as Chrome's background service worker and Firefox's background script.

import { build, context, type BuildOptions } from 'esbuild'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf-8')) as { version: string }
const watch = process.argv.includes('--watch')

/** Content scripts per deck-builder site (filled in by phases 2-4). */
const CONTENT_SCRIPTS: { matches: string[]; js: string }[] = []

const ENTRIES: Record<string, string> = {
  background: 'src/background.ts',
  popup: 'src/popup/popup.ts',
  ...Object.fromEntries(CONTENT_SCRIPTS.map((c) => [c.js.replace(/\.js$/, ''), `src/sites/${c.js.replace(/\.js$/, '.ts')}`])),
}

function manifest(browser: 'chrome' | 'firefox') {
  return {
    manifest_version: 3,
    name: 'Cost Down',
    version: pkg.version,
    description: 'Yu-Gi-Oh! deck prices on the deck builder you use, and one click to TCGplayer Mass Entry.',
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    action: { default_popup: 'popup.html', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
    permissions: ['storage'],
    // Prices are Chaos Catalog's published file (DESIGN.md §4).
    host_permissions: ['https://brandongeren.github.io/*'],
    background: browser === 'chrome' ? { service_worker: 'background.js' } : { scripts: ['background.js'] },
    content_scripts: CONTENT_SCRIPTS.map((c) => ({ matches: c.matches, js: [c.js], run_at: 'document_idle' })),
    web_accessible_resources: CONTENT_SCRIPTS.length
      ? [{ resources: ['icons/32.png'], matches: [...new Set(CONTENT_SCRIPTS.flatMap((c) => c.matches))] }]
      : undefined,
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'cost-down@brandongeren.github.io',
              strict_min_version: '140.0',
              // Required for new Firefox add-ons: Cost Down collects and sends nothing.
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }
}

async function writeStatic() {
  for (const browser of ['chrome', 'firefox'] as const) {
    const out = path.join(root, 'dist', browser)
    await mkdir(out, { recursive: true })
    await cp(path.join(root, 'static'), out, { recursive: true })
    await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest(browser), null, 2) + '\n', 'utf-8')
  }
}

const options = (browser: 'chrome' | 'firefox'): BuildOptions => ({
  entryPoints: ENTRIES,
  outdir: path.join(root, 'dist', browser),
  bundle: true,
  format: 'iife',
  target: ['chrome120', 'firefox140'],
  logLevel: 'info',
})

await rm(path.join(root, 'dist'), { recursive: true, force: true })
await writeStatic()
if (watch) {
  for (const b of ['chrome', 'firefox'] as const) await (await context(options(b))).watch()
  console.log('watching (static/ changes need a restart)')
} else {
  await Promise.all([build(options('chrome')), build(options('firefox'))])
  console.log(`built Cost Down ${pkg.version}: dist/chrome, dist/firefox`)
}
