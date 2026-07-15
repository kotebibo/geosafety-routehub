/**
 * Shared helpers for the Monday.com → RouteHub scripts.
 * Used by sync-from-monday.mjs and create-board-from-monday.mjs.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.join(__dirname, '..', '..')

// ---------- env ----------
let _env = null
export function loadEnv() {
  if (_env) return _env
  const envPath = path.join(repoRoot, 'apps', 'web', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error(`missing ${envPath} — Monday tokens and Supabase keys live there`)
    process.exit(1)
  }
  _env = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m && !line.trim().startsWith('#')) _env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return _env
}

export function requireEnv(name) {
  const env = loadEnv()
  if (!env[name]) {
    console.error(`env var ${name} not found in apps/web/.env.local`)
    process.exit(1)
  }
  return env[name]
}

// ---------- monday api ----------
export async function mondayQuery(token, query, variables = {}) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error('Monday API: ' + JSON.stringify(json.errors))
  return json.data
}

export async function fetchMondayBoard(token, boardId) {
  const ITEM_FIELDS = `
    id
    name
    group { id }
    column_values { id text value type }`
  const first = await mondayQuery(token, `
    query($boardId: [ID!]!) {
      boards(ids: $boardId) {
        name
        columns { id title type settings_str }
        groups { id title color position }
        items_page(limit: 500) { cursor items { ${ITEM_FIELDS} } }
      }
    }`, { boardId: [String(boardId)] })
  const board = first.boards?.[0]
  if (!board) throw new Error(`Monday board ${boardId} not found (wrong token?)`)
  let items = board.items_page.items
  let cursor = board.items_page.cursor
  while (cursor) {
    const next = await mondayQuery(token, `
      query($cursor: String!) {
        next_items_page(limit: 500, cursor: $cursor) { cursor items { ${ITEM_FIELDS} } }
      }`, { cursor })
    items = items.concat(next.next_items_page.items)
    cursor = next.next_items_page.cursor
  }
  return { name: board.name, columns: board.columns, groups: board.groups, items }
}

export async function listMondayBoards(token) {
  const data = await mondayQuery(token, `
    query { boards(limit: 200, order_by: used_at) { id name items_count board_kind workspace { name } } }`)
  for (const b of data.boards) {
    console.log(`${b.id}  [${b.workspace?.name || '-'}] ${b.name} (${b.items_count} items, ${b.board_kind})`)
  }
}

// ---------- value extraction ----------
// file: auth-walled asset URLs — would clobber RouteHub-uploaded files
// subitems/subtasks/button: structural Monday widgets, meaningless as board data
export const SKIP_VALUE_TYPES = new Set(['file', 'subitems', 'subtasks', 'button'])

export function mondayCellValue(cv) {
  let val = cv.text || ''
  if ((cv.type === 'color' || cv.type === 'status' || cv.type === 'dropdown') && cv.value) {
    try {
      const parsed = JSON.parse(cv.value)
      if (parsed.label) val = parsed.label
    } catch {}
  }
  return val
}

export function mondayTypeToSupaType(t) {
  const map = {
    text: 'text', long_text: 'text', numeric: 'number', numbers: 'number',
    status: 'status', color: 'status', dropdown: 'status', date: 'date',
    timeline: 'date_range', phone: 'phone', email: 'email', file: 'files',
    checkbox: 'checkbox', location: 'location', rating: 'number', auto_number: 'number',
    creation_log: 'date', last_updated: 'date',
  }
  return map[t] || 'text'
}

export const STATUS_COLORS = ['working_orange', 'grass_green', 'stuck_red', 'chili_blue', 'sofia_pink', 'winter', 'egg_yolk', 'bright_green', 'indigo', 'sunset']

// Reverse of the palette in StatusCell.tsx (MONDAY_COLORS) — RouteHub stores
// Monday color NAMES in status option config, so mapping Monday's hex back to
// the name preserves the exact color the board had on Monday.
const MONDAY_COLOR_BY_HEX = {
  '#00C875': 'grass_green', '#9CD326': 'bright_green', '#CAB641': 'saladish',
  '#FFCB00': 'egg_yolk', '#FDAB3D': 'working_orange', '#FF642E': 'dark_orange',
  '#FFADAD': 'peach', '#FF7575': 'sunset', '#E2445C': 'stuck_red',
  '#BB3354': 'dark_red', '#FF158A': 'sofia_pink', '#FF5AC4': 'lipstick',
  '#FAA1F1': 'bubble', '#A25DDC': 'purple', '#784BD1': 'dark_purple',
  '#7E3B8A': 'berry', '#401694': 'dark_indigo', '#5559DF': 'indigo',
  '#225091': 'navy', '#579BFC': 'bright_blue', '#0086C0': 'dark_blue',
  '#4ECCC6': 'aquamarine', '#66CCFF': 'chili_blue', '#68A1BD': 'river',
  '#9AADBD': 'winter', '#C4C4C4': 'explosive', '#808080': 'american_gray',
  '#333333': 'blackish',
}

/**
 * Full status option list from a Monday status column's settings_str —
 * ALL defined options (not just ones items use), with Monday's own colors.
 * Returns [{ label, color }] where color is a RouteHub/Monday color name or
 * null when the hex isn't in the known palette.
 */
export function statusOptionsFromSettings(settingsStr) {
  try {
    const s = JSON.parse(settingsStr || '{}')
    const labels = s.labels || {}
    const colors = s.labels_colors || {}
    return Object.entries(labels)
      .filter(([, label]) => typeof label === 'string' && label.trim())
      .map(([idx, label]) => ({
        label: label.trim(),
        color: MONDAY_COLOR_BY_HEX[(colors[idx]?.color || '').toUpperCase()] || null,
      }))
  } catch {
    return []
  }
}

// ---------- supabase helpers ----------
export async function fetchAllItems(sb, boardId) {
  const all = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('board_items')
      .select('id, name, data, group_id')
      .eq('board_id', boardId)
      .is('deleted_at', null)
      .order('created_at')
      .range(from, from + PAGE - 1)
    if (error) throw error
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all
}
