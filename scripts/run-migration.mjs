#!/usr/bin/env node
/**
 * Applies SQL migrations to Supabase instances, staging-first, and tracks
 * which migration has landed on which instance in a per-instance ledger table
 * (public._applied_migrations). That ledger is the source of truth for the
 * --status matrix and for --pending (apply only what an instance is missing).
 *
 * Flow: everything lands on STAGE first (tested there), then --prod ships the
 * stage-approved migrations to the three prod instances. A migration on stage
 * but not on a prod instance is what --pending --prod will apply.
 *
 * Each entry in scripts/instances.json has an `env`: "stage" | "prod".
 *
 * Usage:
 *   node scripts/run-migration.mjs --status                     # applied/pending matrix
 *   node scripts/run-migration.mjs 108_x.sql --stage            # one file → stage
 *   node scripts/run-migration.mjs --pending --stage            # every file stage is missing
 *   node scripts/run-migration.mjs --pending --prod             # ship stage-approved files to all prod
 *   node scripts/run-migration.mjs 108_x.sql --only=Team3       # one file → a single instance
 *
 * Requires scripts/instances.json (gitignored — copy scripts/instances.example.json).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')

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
const status = args.includes('--status')
const pending = args.includes('--pending')
const baseline = args.includes('--baseline')
const upto = args.find(a => a.startsWith('--upto='))?.split('=')[1]

// Numeric prefix of a migration filename ("104_foo.sql" → 104).
function numPrefix(f) {
  const m = f.match(/^(\d+)/)
  return m ? parseInt(m[1], 10) : Infinity
}

function targetsFor() {
  return instances.filter(inst => {
    if (only) return inst.name === only
    if (all) return true
    if (stage) return inst.env === 'stage'
    if (prod) return inst.env === 'prod'
    return false
  })
}

// All migration files in the repo, lexically sorted (NNN_ prefix → correct order).
function repoMigrations() {
  return fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()
}

async function runSql(inst, sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${inst.ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${inst.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const d = await r.json().catch(() => null)
  if (d && !Array.isArray(d) && (d.message || d.error)) {
    return { error: d.message || d.error }
  }
  return { rows: Array.isArray(d) ? d : [] }
}

const LEDGER_DDL = `CREATE TABLE IF NOT EXISTS public._applied_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);`

async function ensureLedger(inst) {
  const { error } = await runSql(inst, LEDGER_DDL)
  if (error) throw new Error(`${inst.name}: cannot create ledger — ${error}`)
}

async function appliedOn(inst) {
  const { rows, error } = await runSql(inst, 'SELECT filename FROM public._applied_migrations;')
  if (error) throw new Error(`${inst.name}: cannot read ledger — ${error}`)
  return new Set(rows.map(r => r.filename))
}

function esc(s) {
  return s.replace(/'/g, "''")
}

async function record(inst, filename) {
  await runSql(
    inst,
    `INSERT INTO public._applied_migrations (filename) VALUES ('${esc(filename)}') ON CONFLICT (filename) DO NOTHING;`
  )
}

// Apply one migration file to one instance and record it in the ledger.
async function applyFile(inst, filename) {
  const sqlPath = path.isAbsolute(filename) ? filename : path.join(migrationsDir, filename)
  const base = path.basename(sqlPath)
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const { error } = await runSql(inst, sql)
  if (error) {
    console.log(`  ${inst.name} → ERROR: ${String(error).substring(0, 250)}`)
    return false
  }
  await record(inst, base)
  console.log(`  ${inst.name} → OK (${base})`)
  return true
}

// ─── --status: applied/pending matrix ──────────────────────────────────────
if (status) {
  const files = repoMigrations()
  const appliedByInst = {}
  for (const inst of instances) {
    await ensureLedger(inst)
    appliedByInst[inst.name] = await appliedOn(inst)
  }
  const names = instances.map(i => i.name)
  const w = Math.max(...files.map(f => f.length), 10)
  console.log('migration'.padEnd(w), names.map(n => n.padEnd(8)).join(''))
  for (const f of files) {
    const cells = instances.map(i => (appliedByInst[i.name].has(f) ? '✓' : '·').padEnd(8))
    console.log(f.padEnd(w), cells.join(''))
  }
  // Flag ledger entries whose file no longer exists in the repo.
  for (const inst of instances) {
    const orphans = [...appliedByInst[inst.name]].filter(f => !files.includes(f))
    if (orphans.length) console.log(`\n⚠️  ${inst.name} ledger has files not in repo:`, orphans.join(', '))
  }
  process.exit(0)
}

// ─── --baseline: record existing migrations as applied WITHOUT running them ─
// One-time adoption of the ledger for instances that already have migrations.
//   --baseline --prod --upto=104   (prod already has 001–104)
//   --baseline --stage             (stage has every repo migration)
if (baseline) {
  const targets = targetsFor()
  if (targets.length === 0) {
    console.error('usage: --baseline (--stage | --prod | --only=Name | --all) [--upto=N]')
    process.exit(1)
  }
  const cutoff = upto ? parseInt(upto, 10) : Infinity
  const files = repoMigrations().filter(f => numPrefix(f) <= cutoff)
  for (const inst of targets) {
    await ensureLedger(inst)
    for (const f of files) await record(inst, f)
    console.log(`${inst.name}: baselined ${files.length} migration(s)${upto ? ` (≤ ${upto})` : ''}`)
  }
  process.exit(0)
}

// ─── --pending: apply everything a target is missing ───────────────────────
if (pending) {
  if (!stage && !prod && !only && !all) {
    console.error('usage: --pending (--stage | --prod | --only=Name)')
    process.exit(1)
  }
  const targets = targetsFor()
  if (targets.length === 0) {
    console.error('No matching instances. Check scripts/instances.json `env` fields.')
    process.exit(1)
  }

  const repoFiles = repoMigrations()

  // For prod targets, the "source of truth" of what MAY ship is what stage has
  // applied — enforcing stage-first. For stage itself, the source is the repo.
  let stageApplied = null
  if (targets.some(t => t.env === 'prod')) {
    const stageInst = instances.find(i => i.env === 'stage')
    if (!stageInst) {
      console.error('No stage instance defined — cannot compute prod-pending safely.')
      process.exit(1)
    }
    await ensureLedger(stageInst)
    stageApplied = await appliedOn(stageInst)
  }

  let failed = false
  for (const inst of targets) {
    await ensureLedger(inst)
    const applied = await appliedOn(inst)
    const source = inst.env === 'prod' ? repoFiles.filter(f => stageApplied.has(f)) : repoFiles
    const missing = source.filter(f => !applied.has(f))
    if (missing.length === 0) {
      console.log(`${inst.name}: up to date`)
      continue
    }
    console.log(`${inst.name}: applying ${missing.length} migration(s)`)
    for (const f of missing) {
      const ok = await applyFile(inst, f)
      if (!ok) {
        failed = true
        console.log(`  ↳ stopping ${inst.name} at ${f} (fix and re-run)`)
        break // don't apply later migrations on top of a failed one
      }
    }
  }
  process.exit(failed ? 1 : 0)
}

// ─── single-file apply (backwards compatible) ──────────────────────────────
if (!file || (!only && !stage && !prod && !all)) {
  console.error('usage:')
  console.error('  node scripts/run-migration.mjs --status')
  console.error('  node scripts/run-migration.mjs <file.sql> (--stage | --prod | --only=Name | --all)')
  console.error('  node scripts/run-migration.mjs --pending (--stage | --prod | --only=Name)')
  process.exit(1)
}

const targets = targetsFor()
if (targets.length === 0) {
  console.error('No matching instances for that target. Check scripts/instances.json `env` fields.')
  process.exit(1)
}

if (prod || all) {
  console.log(`⚠️  Applying to ${targets.length} PROD instance(s): ${targets.map(t => t.name).join(', ')}`)
}
console.log('Applying', path.basename(file), 'to:', targets.map(t => t.name).join(', '))

let failed = false
for (const inst of targets) {
  await ensureLedger(inst)
  const ok = await applyFile(inst, file)
  if (!ok) failed = true
}
process.exit(failed ? 1 : 0)
