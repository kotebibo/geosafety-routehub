#!/usr/bin/env node
/**
 * Applies a SQL migration to ALL Supabase instances (or one with --only).
 *
 * The three instances share a schema but hold separate data — a migration
 * applied to only one instance is a production bug on the other two.
 *
 * Usage:
 *   node scripts/run-migration.mjs 101_my_migration.sql
 *   node scripts/run-migration.mjs 101_my_migration.sql --only=Team3
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

const file = process.argv[2]
const only = process.argv.find(a => a.startsWith('--only='))?.split('=')[1]
if (!file) {
  console.error('usage: node scripts/run-migration.mjs <migration-file> [--only=Name]')
  process.exit(1)
}

const sqlPath = path.isAbsolute(file) ? file : path.join(__dirname, '..', 'supabase', 'migrations', file)
const sql = fs.readFileSync(sqlPath, 'utf8')
console.log('Applying', path.basename(sqlPath), only ? `(only ${only})` : `to ${instances.length} instances`)

let failed = false
for (const inst of instances) {
  if (only && inst.name !== only) continue
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
