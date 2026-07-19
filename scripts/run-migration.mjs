#!/usr/bin/env node
/**
 * Applies a SQL migration to Supabase instances, staging-first.
 *
 * Flow: run on STAGING, verify, then run on the three PROD instances.
 * A migration applied to only some prod instances is a bug on the others.
 *
 * Each entry in scripts/instances.json has an `env`: "stage" | "prod".
 *
 * Usage (pick a target — no default, on purpose):
 *   node scripts/run-migration.mjs 106_x.sql --stage        # staging only (do this first)
 *   node scripts/run-migration.mjs 106_x.sql --prod         # all three prod instances
 *   node scripts/run-migration.mjs 106_x.sql --only=Team3   # a single named instance
 *   node scripts/run-migration.mjs 106_x.sql --all          # every instance (rarely needed)
 *
 * Requires scripts/instances.json (gitignored — copy instances.example.json
 * and fill in the Supabase Management API tokens).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const instancesPath = path.join(__dirname, 'instances.json')
if (!fs.existsSync(instancesPath)) {
  console.error('scripts/instances.json not found — copy scripts/instances.example.json and fill in tokens')
  process.exit(1)
}
const instances = JSON.parse(fs.readFileSync(instancesPath, 'utf8'))

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
const only = args.find(a => a.startsWith('--only='))?.split('=')[1]
const stage = args.includes('--stage')
const prod = args.includes('--prod')
const all = args.includes('--all')

if (!file || (!only && !stage && !prod && !all)) {
  console.error('usage: node scripts/run-migration.mjs <migration-file> (--stage | --prod | --only=Name | --all)')
  console.error('  run --stage first, verify, then --prod')
  process.exit(1)
}

const targets = instances.filter(inst => {
  if (only) return inst.name === only
  if (all) return true
  if (stage) return inst.env === 'stage'
  if (prod) return inst.env === 'prod'
  return false
})

if (targets.length === 0) {
  console.error('No matching instances for that target. Check scripts/instances.json `env` fields.')
  process.exit(1)
}

const sqlPath = path.isAbsolute(file) ? file : path.join(__dirname, '..', 'supabase', 'migrations', file)
const sql = fs.readFileSync(sqlPath, 'utf8')

if (prod || all) {
  console.log(`⚠️  Applying to ${targets.length} PROD instance(s): ${targets.map(t => t.name).join(', ')}`)
}
console.log('Applying', path.basename(sqlPath), 'to:', targets.map(t => t.name).join(', '))

let failed = false
for (const inst of targets) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${inst.ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${inst.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const d = await r.json().catch(() => ({}))
  const err = d?.message || d?.error
  console.log(inst.name, '→', err ? 'ERROR: ' + String(err).substring(0, 250) : 'OK')
  if (err) failed = true
}
process.exit(failed ? 1 : 0)
