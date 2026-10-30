// Signs the Firefox build with Mozilla (addons.mozilla.org), using web-ext.
//
// Usage: npm run sign:firefox                 unlisted: a signed .xpi to hand out (usually ready in minutes)
//        npm run sign:firefox -- --listed     listed: submits to the public Firefox Add-ons site (Mozilla reviews it)
//
// Credentials: create an API key at https://addons.mozilla.org/developers/addon/api/key/ and save it in
// .amo-credentials.json (gitignored) as {"issuer": "user:...", "secret": "..."}. They're passed to web-ext through
// its environment variables, never on the command line or printed.
// Listed submissions also send store/amo-metadata.json (listing text) and the source bundle Mozilla's reviewers
// need for bundled code (npm run package:source).

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const credFile = path.join(root, '.amo-credentials.json')
if (!existsSync(credFile)) {
  console.error(`Missing ${credFile}: create an API key at https://addons.mozilla.org/developers/addon/api/key/ and save {"issuer": "...", "secret": "..."}`)
  process.exit(2)
}
const { issuer, secret } = JSON.parse(readFileSync(credFile, 'utf-8')) as { issuer?: string; secret?: string }
if (!issuer || !secret) {
  console.error(`${credFile} needs "issuer" and "secret"`)
  process.exit(2)
}
const listed = process.argv.includes('--listed')
const version = (JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8')) as { version: string }).version

const run = (cmd: string, args: string[], env: NodeJS.ProcessEnv = process.env) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', env, shell: process.platform === 'win32' })

run('npm', ['run', 'build'])
const args = ['web-ext', 'sign', '-s', 'dist/firefox', '-a', 'dist/packages', '--channel', listed ? 'listed' : 'unlisted']
if (listed) {
  run('npm', ['run', 'package:source'])
  args.push('--amo-metadata', 'store/amo-metadata.json', '--upload-source-code', `dist/packages/cost-down-source-${version}.zip`)
}
run('npx', args, { ...process.env, WEB_EXT_API_KEY: issuer, WEB_EXT_API_SECRET: secret })
