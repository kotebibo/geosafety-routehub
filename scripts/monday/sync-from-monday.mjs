#!/usr/bin/env node
/**
 * Generic Monday.com → Supabase board sync engine.
 *
 * Unlike the old one-off import scripts (which deleted and re-inserted every
 * item), this UPSERTS in place. Board item ids are stable, so checkin history
 * (location_checkins.board_item_id), item updates, and file attachments all
 * survive a sync. Never use the old clear-and-reimport scripts on a board
 * that has checkins.
 *
 * Jobs are declared in scripts/monday/sync-jobs.json — each job maps one
 * Monday board to one Supabase board on one instance. Tokens/keys are
 * referenced by env-var NAME and read from apps/web/.env.local.
 *
 * Usage:
 *   node scripts/monday/sync-from-monday.mjs                     # DRY RUN, all jobs
 *   node scripts/monday/sync-from-monday.mjs --job=team2-contracts
 *   node scripts/monday/sync-from-monday.mjs --apply             # actually write
 *   node scripts/monday/sync-from-monday.mjs --apply --prune     # also soft-delete items gone from Monday
 *   node scripts/monday/sync-from-monday.mjs --job=X --columns=color__1,date__1   # partial sync
 *   node scripts/monday/sync-from-monday.mjs --list-boards=MONDAY_API_TOKEN_TEAM2_CONTRACTS
 *
 * Column-subset sync: a job with a "columns" array (or the --columns= CLI
 * override) only reads/writes those Monday column ids. In subset mode new
 * Monday items are NOT inserted (reported only) unless the job sets
 * "insertNew": true — you're updating columns, not mirroring the board.
 *
 * Matching strategy per item (first hit wins):
 *   1. data.__monday_id === Monday item id   (stamped by this script on first apply)
 *   2. composite key: item name + value of each job.matchColumns column
 *      (N identical-keyed Monday items vs exactly N free local candidates → paired in order)
 *   3. unique exact name
 * Unmatched Monday items are inserted (full-board mode); Supabase items
 * missing from Monday are only reported unless --prune (soft delete) is passed.
 *
 * What is NEVER touched:
 *   - data keys that don't correspond to a synced Monday column (locally
 *     computed values like saqmianoba, checkin stage columns, RouteHub-only columns)
 *   - keys listed in job.protectedKeys
 *   - values of Monday file/subitems columns
 *   - a cell Monday has empty but RouteHub has filled (never blanks local data)
 *   - existing Supabase columns/groups (missing ones are created, none deleted)
 *   - items that carry no __monday_id and match nothing (RouteHub-only items)
 *   - item positions (no reorder churn)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import {
  requireEnv, fetchMondayBoard, listMondayBoards, mondayCellValue,
  mondayTypeToSupaType, SKIP_VALUE_TYPES, STATUS_COLORS, fetchAllItems,
  statusOptionsFromSettings,
} from './lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ---------- cli ----------
const argv = process.argv.slice(2)
const APPLY = argv.includes('--apply')
const PRUNE = argv.includes('--prune')
const ONLY_JOB = argv.find(a => a.startsWith('--job='))?.split('=')[1]
const LIST_BOARDS = argv.find(a => a.startsWith('--list-boards='))?.split('=')[1]
const CLI_COLUMNS = argv.find(a => a.startsWith('--columns='))?.split('=')[1]?.split(',').map(s => s.trim()).filter(Boolean)

// ---------- sync one job ----------
async function syncJob(job) {
  const subsetColumns = CLI_COLUMNS || job.columns || null
  const subsetMode = Array.isArray(subsetColumns) && subsetColumns.length > 0
  const insertNew = subsetMode ? job.insertNew === true : true

  console.log(`\n=== ${job.name} ${APPLY ? '' : '(DRY RUN)'}${subsetMode ? ` [columns: ${subsetColumns.join(', ')}]` : ''} ===`)
  const token = requireEnv(job.monday.tokenEnv)
  const sb = createClient(requireEnv(job.supabase.urlEnv), requireEnv(job.supabase.keyEnv))

  const monday = await fetchMondayBoard(token, job.monday.boardId)
  console.log(`Monday "${monday.name}": ${monday.items.length} items, ${monday.columns.length} columns, ${monday.groups.length} groups`)

  const { data: supaCols, error: colErr } = await sb
    .from('board_columns').select('*').eq('board_id', job.supabase.boardId).order('position')
  if (colErr) throw colErr
  const supaItems = await fetchAllItems(sb, job.supabase.boardId)
  const { data: supaGroups, error: grpErr } = await sb
    .from('board_groups').select('id, name, position').eq('board_id', job.supabase.boardId)
  if (grpErr) throw grpErr
  console.log(`Supabase board: ${supaItems.length} items, ${supaCols.length} columns, ${supaGroups.length} groups`)

  const protectedKeys = new Set(job.protectedKeys || [])
  const stats = { colsAdded: 0, groupsAdded: 0, optionsAdded: 0, inserted: 0, updated: 0, unchanged: 0, ambiguous: 0, missing: 0, pruned: 0, newSkipped: 0 }

  // -- 1. columns to manage
  let dataColumns = monday.columns.filter(c => c.id !== 'name' && !SKIP_VALUE_TYPES.has(c.type))
  if (subsetMode) {
    const unknown = subsetColumns.filter(id => !dataColumns.some(c => c.id === id))
    if (unknown.length) throw new Error(`columns not on Monday board (or unsyncable type): ${unknown.join(', ')}`)
    dataColumns = dataColumns.filter(c => subsetColumns.includes(c.id))
  }

  // create Monday columns that don't exist in Supabase yet
  const supaColByColumnId = new Map(supaCols.map(c => [c.column_id, c]))
  let nextPos = Math.max(0, ...supaCols.map(c => c.position || 0)) + 1
  for (const col of dataColumns) {
    if (supaColByColumnId.has(col.id)) continue
    console.log(`  + column "${col.title}" (${col.id}, ${mondayTypeToSupaType(col.type)})`)
    stats.colsAdded++
    if (APPLY) {
      const { data: created, error } = await sb.from('board_columns').insert({
        board_id: job.supabase.boardId,
        board_type: 'custom',
        column_id: col.id,
        column_name: col.title,
        column_type: mondayTypeToSupaType(col.type),
        position: nextPos++,
        config: {},
      }).select().single()
      if (error) throw error
      supaColByColumnId.set(col.id, created)
    }
  }

  // -- 2. groups: match by name, create missing (skipped in subset mode)
  const groupByName = new Map(supaGroups.map(g => [g.name, g]))
  const mondayGroupToSupaId = new Map()
  for (const g of monday.groups) {
    const existing = groupByName.get(g.title)
    if (existing) { mondayGroupToSupaId.set(g.id, existing.id); continue }
    if (subsetMode) continue // partial sync doesn't manage board structure
    console.log(`  + group "${g.title}"`)
    stats.groupsAdded++
    if (APPLY) {
      const { data: created, error } = await sb.from('board_groups').insert({
        board_id: job.supabase.boardId,
        name: g.title,
        color: g.color ? (g.color.startsWith('#') ? g.color : `#${g.color}`) : '#579bfc',
        position: supaGroups.length + stats.groupsAdded,
      }).select('id').single()
      if (error) throw error
      mondayGroupToSupaId.set(g.id, created.id)
      groupByName.set(g.title, created)
    }
  }

  // -- 3. status options: existing convention on synced boards is key === label.
  //    Merge in Monday's FULL option set (from column settings — includes
  //    options no item uses yet, with Monday's own colors), plus any stale
  //    labels still sitting on item cells. Existing local options are never
  //    changed or removed.
  const optionUpdates = new Map()
  for (const col of dataColumns) {
    const supaCol = supaColByColumnId.get(col.id)
    if (!supaCol || supaCol.column_type !== 'status') continue
    const known = new Set((supaCol.config?.options || []).map(o => o.key))
    const addMissing = (label, color) => {
      if (!label || known.has(label)) return
      known.add(label)
      if (!optionUpdates.has(supaCol.id)) optionUpdates.set(supaCol.id, { supaCol, adds: [] })
      optionUpdates.get(supaCol.id).adds.push({ label, color })
    }
    for (const opt of statusOptionsFromSettings(col.settings_str)) addMissing(opt.label, opt.color)
    for (const item of monday.items) {
      const cv = item.column_values.find(v => v.id === col.id)
      addMissing(cv ? mondayCellValue(cv) : '', null)
    }
  }
  for (const { supaCol, adds } of optionUpdates.values()) {
    console.log(`  + ${adds.length} status option(s) on "${supaCol.column_name}": ${adds.map(a => a.label).join(', ')}`)
    stats.optionsAdded += adds.length
    if (APPLY) {
      const options = [...(supaCol.config?.options || [])]
      for (const { label, color } of adds) {
        options.push({ key: label, label, color: color || STATUS_COLORS[options.length % STATUS_COLORS.length] })
      }
      const { error } = await sb.from('board_columns')
        .update({ config: { ...(supaCol.config || {}), options } })
        .eq('id', supaCol.id)
      if (error) throw error
    }
  }

  // -- 4. build match indexes over Supabase items
  const byMondayId = new Map()
  const byComposite = new Map()
  const byName = new Map()
  const compositeKey = (name, values) =>
    [name, ...(job.matchColumns || []).map(c => String(values?.[c] ?? '').trim())].join(' || ')
  for (const it of supaItems) {
    if (it.data?.__monday_id) byMondayId.set(String(it.data.__monday_id), it)
    const ck = compositeKey(it.name, it.data)
    if (!byComposite.has(ck)) byComposite.set(ck, [])
    byComposite.get(ck).push(it)
    if (!byName.has(it.name)) byName.set(it.name, [])
    byName.get(it.name).push(it)
  }

  // -- 5. upsert items
  const matchedSupaIds = new Set()
  const managedKeys = new Set(dataColumns.map(c => c.id))

  // Pre-extract per Monday item: full values (for matching — matchColumns may
  // fall outside the synced subset) and desired data (managed keys only).
  // Count Monday items per composite key: when N identical-keyed Monday items
  // face exactly N free local candidates, pairing in order is safe.
  const mondayValues = new Map()
  const mondayDesired = new Map()
  const mondayCompositeCount = new Map()
  for (const mItem of monday.items) {
    const all = {}
    const desired = {}
    for (const cv of mItem.column_values) {
      const val = mondayCellValue(cv)
      if (!val) continue
      all[cv.id] = val
      if (managedKeys.has(cv.id) && !protectedKeys.has(cv.id)) desired[cv.id] = val
    }
    mondayValues.set(mItem.id, all)
    mondayDesired.set(mItem.id, desired)
    const ck = compositeKey(mItem.name, all)
    mondayCompositeCount.set(ck, (mondayCompositeCount.get(ck) || 0) + 1)
  }

  for (const mItem of monday.items) {
    const desired = mondayDesired.get(mItem.id)

    // find existing
    let existing = byMondayId.get(String(mItem.id))
    if (!existing) {
      const ck = compositeKey(mItem.name, mondayValues.get(mItem.id))
      const candidates = byComposite.get(ck) || []
      const free = candidates.filter(c => !matchedSupaIds.has(c.id) && !c.data?.__monday_id)
      if (free.length === 1) existing = free[0]
      else if (free.length > 1 && free.length <= mondayCompositeCount.get(ck)) existing = free[0]
      else if (free.length > 1) { stats.ambiguous++; console.log(`  ? ambiguous match (${free.length} candidates): "${mItem.name}" — skipped`); continue }
    }
    if (!existing) {
      const sameName = (byName.get(mItem.name) || []).filter(c => !matchedSupaIds.has(c.id) && !c.data?.__monday_id)
      if (sameName.length === 1) existing = sameName[0]
    }

    const targetGroupId = mondayGroupToSupaId.get(mItem.group?.id)

    if (!existing) {
      if (!insertNew) { stats.newSkipped++; continue }
      stats.inserted++
      console.log(`  + item "${mItem.name}"`)
      if (APPLY) {
        const { error } = await sb.from('board_items').insert({
          board_id: job.supabase.boardId,
          name: mItem.name,
          data: { ...desired, __monday_id: String(mItem.id) },
          group_id: targetGroupId || supaGroups[0]?.id || null,
          position: 999999, // appended; board UI orders within group
        })
        if (error) throw error
      }
      continue
    }

    matchedSupaIds.add(existing.id)

    // diff: only managed keys + __monday_id stamp + name/group (full mode only)
    const patch = {}
    const newData = { ...existing.data }
    let dataChanged = false
    for (const key of managedKeys) {
      if (protectedKeys.has(key)) continue
      const want = desired[key]
      const have = existing.data?.[key]
      if (want === undefined && have !== undefined) continue // Monday empty — keep local (safer than blanking)
      if (want !== undefined && String(have ?? '') !== String(want)) {
        newData[key] = want
        dataChanged = true
      }
    }
    if (String(existing.data?.__monday_id ?? '') !== String(mItem.id)) {
      newData.__monday_id = String(mItem.id)
      dataChanged = true
    }
    if (dataChanged) patch.data = newData
    if (!subsetMode) {
      if (existing.name !== mItem.name) patch.name = mItem.name
      if (targetGroupId && existing.group_id !== targetGroupId) patch.group_id = targetGroupId
    }

    if (Object.keys(patch).length === 0) { stats.unchanged++; continue }
    stats.updated++
    const changedKeys = [
      ...(patch.name ? ['name'] : []),
      ...(patch.group_id ? ['group'] : []),
      ...Object.keys(patch.data || {}).filter(k => String(existing.data?.[k] ?? '') !== String(patch.data[k])),
    ]
    console.log(`  ~ "${mItem.name}": ${changedKeys.join(', ')}`)
    if (APPLY) {
      const { error } = await sb.from('board_items').update(patch).eq('id', existing.id)
      if (error) throw error
    }
  }

  // -- 6. items in Supabase but gone from Monday (full-board mode only)
  let unlinked = 0
  if (!subsetMode) {
    for (const it of supaItems) {
      if (matchedSupaIds.has(it.id)) continue
      if (!it.data?.__monday_id) { unlinked++; continue } // never touch items that were never linked to Monday
      stats.missing++
      if (PRUNE) {
        stats.pruned++
        console.log(`  - pruning "${it.name}" (gone from Monday)`)
        if (APPLY) {
          const { error } = await sb.from('board_items')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', it.id)
          if (error) throw error
        }
      } else {
        console.log(`  ! "${it.name}" no longer in Monday (use --prune to soft-delete)`)
      }
    }
  }

  console.log(`Summary: +${stats.inserted} new, ~${stats.updated} updated, ${stats.unchanged} unchanged, ` +
    `${stats.missing} gone from Monday${PRUNE ? ` (${stats.pruned} pruned)` : ''}, ` +
    `${stats.ambiguous} ambiguous skipped, ${unlinked} local-only/unlinked, ` +
    (subsetMode ? `${stats.newSkipped} new-in-Monday skipped (subset mode), ` : '') +
    `+${stats.colsAdded} cols, +${stats.groupsAdded} groups, +${stats.optionsAdded} status options`)
  if (!APPLY) console.log('(dry run — re-run with --apply to write)')
  return stats
}

// ---------- main ----------
async function main() {
  if (LIST_BOARDS) {
    await listMondayBoards(requireEnv(LIST_BOARDS))
    return
  }
  if (CLI_COLUMNS && !ONLY_JOB) {
    console.error('--columns= requires --job= (a column subset only makes sense for one job)')
    process.exit(1)
  }
  const jobsPath = path.join(__dirname, 'sync-jobs.json')
  const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'))
  const selected = ONLY_JOB ? jobs.filter(j => j.name === ONLY_JOB) : jobs.filter(j => !j.disabled)
  if (selected.length === 0) {
    console.error(ONLY_JOB ? `no job named "${ONLY_JOB}" in sync-jobs.json` : 'no enabled jobs in sync-jobs.json')
    process.exit(1)
  }
  let failed = false
  for (const job of selected) {
    try {
      await syncJob(job)
    } catch (err) {
      failed = true
      console.error(`Job ${job.name} FAILED:`, err.message || err)
    }
  }
  process.exit(failed ? 1 : 0)
}

main()
