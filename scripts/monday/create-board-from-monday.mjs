#!/usr/bin/env node
/**
 * Creates a brand-new RouteHub board from a Monday.com board:
 * board row + columns + groups + all items, with __monday_id stamped so the
 * board is immediately syncable via sync-from-monday.mjs.
 *
 * DRY RUN by default — prints exactly what would be created. --apply writes.
 *
 * Usage:
 *   node scripts/monday/create-board-from-monday.mjs \
 *     --token-env=MONDAY_API_TOKEN_TEAM2_CONTRACTS \
 *     --monday-board=1234567890 \
 *     --instance=team2 \
 *     --owner=someone@geosafety.ge \
 *     [--workspace="სამუშაო სივრცის სახელი"] \
 *     [--name="Board name override"] \
 *     [--apply]
 *
 * --instance is one of: team1 | team2 | team3 (resolves the Supabase URL and
 * service-role key env vars from apps/web/.env.local).
 * --owner must be an existing user's email (public.users) on that instance —
 * they become the board owner.
 * --workspace is matched by exact name against the workspaces table; omit it
 * to create the board without a workspace (you can move it in the UI later).
 *
 * On success it prints a ready-to-paste job snippet for sync-jobs.json.
 *
 * Column ids are taken verbatim from Monday (that's the convention on every
 * imported board) — so the printed sync job works with zero mapping. File and
 * subitems columns are skipped (see lib.mjs SKIP_VALUE_TYPES).
 */
import { createClient } from '@supabase/supabase-js'
import {
  requireEnv, fetchMondayBoard, mondayCellValue,
  mondayTypeToSupaType, SKIP_VALUE_TYPES, STATUS_COLORS,
  statusOptionsFromSettings,
} from './lib.mjs'

// ---------- cli ----------
const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const arg = name => argv.find(a => a.startsWith(`--${name}=`))?.split(/=(.*)/s)[1]?.replace(/^["']|["']$/g, '')

const TOKEN_ENV = arg('token-env')
const MONDAY_BOARD = arg('monday-board')
const INSTANCE = arg('instance')?.toLowerCase()
const OWNER_EMAIL = arg('owner')
const WORKSPACE_NAME = arg('workspace')
const NAME_OVERRIDE = arg('name')

const INSTANCES = {
  team1: { urlEnv: 'NEXT_PUBLIC_SUPABASE_URL', keyEnv: 'SUPABASE_SERVICE_KEY' },
  team2: { urlEnv: 'NEXT_PUBLIC_SUPABASE_URL_TEAM2', keyEnv: 'SUPABASE_SERVICE_ROLE_KEY_TEAM2' },
  team3: { urlEnv: 'NEXT_PUBLIC_SUPABASE_URL_TEAM3', keyEnv: 'SUPABASE_SERVICE_ROLE_KEY_TEAM3' },
}

if (!TOKEN_ENV || !MONDAY_BOARD || !INSTANCE || !OWNER_EMAIL || !INSTANCES[INSTANCE]) {
  console.error(`usage: node scripts/monday/create-board-from-monday.mjs \\
  --token-env=<MONDAY_* env var> --monday-board=<id> --instance=team1|team2|team3 \\
  --owner=<email> [--workspace="name"] [--name="override"] [--apply]

NOTE (team1): apps/web/.env.local currently points NEXT_PUBLIC_SUPABASE_URL at
Team2 Frankfurt "temporarily" — verify before using --instance=team1.`)
  process.exit(1)
}

async function main() {
  const inst = INSTANCES[INSTANCE]
  const sb = createClient(requireEnv(inst.urlEnv), requireEnv(inst.keyEnv))
  const token = requireEnv(TOKEN_ENV)

  // -- resolve owner
  const { data: owner, error: ownerErr } = await sb
    .from('users').select('id, email, full_name').eq('email', OWNER_EMAIL).single()
  if (ownerErr || !owner) {
    console.error(`owner "${OWNER_EMAIL}" not found in public.users on ${INSTANCE}`)
    process.exit(1)
  }

  // -- resolve workspace (optional)
  let workspaceId = null
  if (WORKSPACE_NAME) {
    const { data: ws } = await sb.from('workspaces').select('id, name').eq('name', WORKSPACE_NAME)
    if (!ws || ws.length !== 1) {
      const { data: all } = await sb.from('workspaces').select('name').order('name')
      console.error(`workspace "${WORKSPACE_NAME}" ${ws?.length ? 'is ambiguous' : 'not found'} on ${INSTANCE}. Available:`)
      for (const w of all || []) console.error(`  - ${w.name}`)
      process.exit(1)
    }
    workspaceId = ws[0].id
  }

  // -- fetch Monday board
  const monday = await fetchMondayBoard(token, MONDAY_BOARD)
  const boardName = NAME_OVERRIDE || monday.name
  const dataColumns = monday.columns.filter(c => c.id !== 'name' && !SKIP_VALUE_TYPES.has(c.type))
  const skipped = monday.columns.filter(c => c.id !== 'name' && SKIP_VALUE_TYPES.has(c.type))

  // -- refuse duplicates: a same-named board on this instance is almost
  //    certainly a re-run mistake
  const { data: clash } = await sb.from('boards').select('id, name').eq('name', boardName)
  if (clash?.length) {
    console.error(`a board named "${boardName}" already exists on ${INSTANCE} (${clash[0].id}) — use --name= to pick another name, or sync into the existing board instead`)
    process.exit(1)
  }

  // -- status options: Monday's full option set from column settings (same
  //    options in the same order, with Monday's own colors), plus any stale
  //    labels still sitting on cells that were removed from settings
  const statusOptions = new Map() // col.id -> [{label, color|null}]
  for (const col of dataColumns) {
    if (mondayTypeToSupaType(col.type) !== 'status') continue
    const opts = statusOptionsFromSettings(col.settings_str)
    const seen = new Set(opts.map(o => o.label))
    for (const item of monday.items) {
      const cv = item.column_values.find(v => v.id === col.id)
      const label = cv ? mondayCellValue(cv) : ''
      if (label && !seen.has(label)) {
        seen.add(label)
        opts.push({ label, color: null })
      }
    }
    statusOptions.set(col.id, opts)
  }

  // -- plan report
  console.log(`\n=== CREATE BOARD FROM MONDAY ${APPLY ? '' : '(DRY RUN)'} ===`)
  console.log(`Monday "${monday.name}" (${MONDAY_BOARD}) → ${INSTANCE}, board name "${boardName}"`)
  console.log(`Owner: ${owner.full_name} <${owner.email}>`)
  console.log(`Workspace: ${WORKSPACE_NAME || '(none — assign in UI later)'}`)
  console.log(`Columns (${dataColumns.length}):`)
  for (const col of dataColumns) {
    const opts = statusOptions.get(col.id)
    console.log(`  ${col.id}: "${col.title}" → ${mondayTypeToSupaType(col.type)}${opts ? ` (${opts.length} options: ${opts.map(o => o.label).join(' | ')})` : ''}`)
  }
  if (skipped.length) console.log(`Skipped column types: ${skipped.map(c => `"${c.title}" (${c.type})`).join(', ')}`)
  console.log(`Groups (${monday.groups.length}): ${monday.groups.map(g => g.title).join(', ')}`)
  console.log(`Items: ${monday.items.length}`)

  if (!APPLY) {
    console.log('\n(dry run — re-run with --apply to create)')
    return
  }

  // -- create board
  const { data: board, error: boardErr } = await sb.from('boards').insert({
    name: boardName,
    name_ka: boardName,
    board_type: 'custom',
    owner_id: owner.id,
    workspace_id: workspaceId,
  }).select('id').single()
  if (boardErr) throw boardErr
  console.log(`\nBoard created: ${board.id}`)

  // -- columns
  const colInserts = dataColumns.map((col, i) => {
    const config = {}
    const opts = statusOptions.get(col.id)
    if (opts) {
      config.options = opts.map(({ label, color }, j) => ({ key: label, label, color: color || STATUS_COLORS[j % STATUS_COLORS.length] }))
    }
    return {
      board_id: board.id,
      board_type: 'custom',
      column_id: col.id,
      column_name: col.title,
      column_type: mondayTypeToSupaType(col.type),
      position: i + 1,
      config,
    }
  })
  const { error: colErr } = await sb.from('board_columns').insert(colInserts)
  if (colErr) throw colErr
  console.log(`Columns created: ${colInserts.length}`)

  // -- groups
  const sortedGroups = [...monday.groups].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const groupInserts = sortedGroups.map((g, i) => ({
    board_id: board.id,
    name: g.title,
    color: g.color ? (g.color.startsWith('#') ? g.color : `#${g.color}`) : '#579bfc',
    position: i,
  }))
  const { data: createdGroups, error: grpErr } = await sb.from('board_groups').insert(groupInserts).select('id, name')
  if (grpErr) throw grpErr
  const groupMap = new Map(sortedGroups.map((g, i) => [g.id, createdGroups[i].id]))
  console.log(`Groups created: ${createdGroups.length}`)

  // -- items (batched)
  let inserted = 0
  const perGroupPos = new Map()
  const itemInserts = monday.items.map(mItem => {
    const data = { __monday_id: String(mItem.id) }
    for (const cv of mItem.column_values) {
      if (!dataColumns.some(c => c.id === cv.id)) continue
      const val = mondayCellValue(cv)
      if (val) data[cv.id] = val
    }
    const gid = groupMap.get(mItem.group?.id) || createdGroups[0]?.id || null
    const pos = (perGroupPos.get(gid) || 0) + 1
    perGroupPos.set(gid, pos)
    return { board_id: board.id, name: mItem.name, data, group_id: gid, position: pos }
  })
  for (let i = 0; i < itemInserts.length; i += 100) {
    const batch = itemInserts.slice(i, i + 100)
    const { error } = await sb.from('board_items').insert(batch)
    if (error) throw error
    inserted += batch.length
  }
  console.log(`Items created: ${inserted}`)

  // -- ready-to-paste sync job
  console.log(`\nAdd this to scripts/monday/sync-jobs.json to keep it synced:\n`)
  console.log(JSON.stringify({
    name: `${INSTANCE}-${boardName.replace(/\s+/g, '-').toLowerCase()}`,
    monday: { tokenEnv: TOKEN_ENV, boardId: String(MONDAY_BOARD) },
    supabase: { urlEnv: inst.urlEnv, keyEnv: inst.keyEnv, boardId: board.id },
    matchColumns: [],
    protectedKeys: [],
  }, null, 2))
}

main().catch(err => {
  console.error('FAILED:', err.message || err)
  process.exit(1)
})
