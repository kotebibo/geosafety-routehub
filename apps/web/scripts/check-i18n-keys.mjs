#!/usr/bin/env node
/**
 * Fails if messages/ka.json and messages/en.json have different key sets.
 * A key present in only one locale is a bug (next-intl silently falls back to
 * the other language, so the gap is invisible at runtime). Run before commit:
 *   node scripts/check-i18n-keys.mjs   (or: npm run check-i18n)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const messagesDir = path.join(__dirname, '..', 'messages')

function load(locale) {
  const file = path.join(messagesDir, `${locale}.json`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

// Flatten to dotted leaf-key paths ("settings.language.title").
function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? keys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  )
}

const ka = new Set(keys(load('ka')))
const en = new Set(keys(load('en')))

const onlyKa = [...ka].filter(k => !en.has(k)).sort()
const onlyEn = [...en].filter(k => !ka.has(k)).sort()

if (onlyKa.length === 0 && onlyEn.length === 0) {
  console.log(`✓ i18n keys in sync (${ka.size} keys)`)
  process.exit(0)
}

console.error('✗ i18n key sets differ between ka.json and en.json\n')
if (onlyKa.length) console.error(`Only in ka.json (${onlyKa.length}):\n  ${onlyKa.join('\n  ')}\n`)
if (onlyEn.length) console.error(`Only in en.json (${onlyEn.length}):\n  ${onlyEn.join('\n  ')}\n`)
console.error('Add the missing keys to BOTH files (same commit).')
process.exit(1)
