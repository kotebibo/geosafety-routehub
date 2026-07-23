/**
 * Seed a realistic CURRENT week of routing data for every active officer, so
 * logging in as any of them looks like real usage. For each officer it:
 *   - sets officer_transport (fuel type round-robin petrol/diesel/gas, consumption)
 *   - builds Mon–Sun routes from that officer's board items (2–3 objects/day)
 *   - marks a realistic mix: completed (with check-ins), deferred (with a
 *     hand-written reason), and object-canceled stops
 *   - approves the week_plan (fuel "bought") and drops in a couple of comments
 *   - (optional) resets the officer's password to a known value and prints it
 *
 * READ-ONLY-SAFE? No — it writes routing data and can reset passwords. It is
 * idempotent per week (it wipes this officer+week's routes first), and each
 * officer is isolated in try/catch.
 *
 * Usage (from repo root), reads apps/web/.env.local:
 *   node scripts/seed-test-week.mjs --apply                 # seed data only
 *   node scripts/seed-test-week.mjs --apply --reset-passwords[=Password1!]
 *   node scripts/seed-test-week.mjs                          # dry run (no writes)
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

// --- args ---
const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const resetArg = args.find(a => a.startsWith('--reset-passwords'))
const RESET_PASSWORDS = !!resetArg
const PASSWORD = resetArg?.includes('=') ? resetArg.split('=')[1] : 'Officer123!'

// --- env (apps/web/.env.local) ---
function loadEnv() {
  const p = path.join(ROOT, 'apps', 'web', '.env.local')
  if (!fs.existsSync(p)) throw new Error('apps/web/.env.local not found')
  const env = {}
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}
const env = loadEnv()
const URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.local')
const db = createClient(URL, KEY, { auth: { persistSession: false } })

// --- helpers ---
const DAY = 86400000
const GEO = 4 * 60 * 60 * 1000 // Georgia UTC+4
const iso = ms => new Date(ms).toISOString()
const isoDate = ms => new Date(ms).toISOString().slice(0, 10)
function georgiaMondayMs() {
  const now = new Date(Date.now() + GEO)
  const dow = (now.getUTCDay() + 6) % 7
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return midnight - dow * DAY
}
function haversineKm(a, b) {
  const R = 6371,
    toRad = d => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat),
    dLng = toRad(b.lng - a.lng)
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}
// Best-effort lat,lng out of a cell value (plain "lat,lng" or a maps URL).
function parseCoords(v) {
  if (v == null) return null
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  const m = s.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/)
  if (!m) return null
  const lat = Number(m[1]),
    lng = Number(m[2])
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}
const FUELS = ['petrol', 'diesel', 'gas']
const NOTES = ['საბურავი დამეზიანა', 'არ ვიყავი ხასიათზე', 'გზა იყო გადაკეტილი', 'ავად გავხდი']

async function main() {
  console.log(`\n== seed-test-week ${APPLY ? '(APPLY)' : '(dry run)'} ==`)
  const monday = georgiaMondayMs()
  const weekStart = isoDate(monday)
  const todayDate = isoDate(Date.now() + GEO)
  console.log('week:', weekStart, '..', isoDate(monday + 6 * DAY), '| today:', todayDate)

  const { data: roleRows } = await db.from('user_roles').select('user_id').eq('role', 'officer')
  const officerIds = [...new Set((roleRows || []).map(r => r.user_id))]
  const { data: admins } = await db.from('user_roles').select('user_id').eq('role', 'admin').limit(1)
  const adminId = admins?.[0]?.user_id ?? null

  const { data: users } = await db
    .from('users')
    .select('id, full_name, email, is_active')
    .in('id', officerIds)
  const officers = (users || []).filter(u => u.is_active !== false)
  console.log(`officers: ${officers.length}`)

  const creds = []
  let oi = 0
  for (const o of officers) {
    try {
      const { data: boards } = await db
        .from('boards')
        .select('id, name, board_type, settings')
        .eq('settings->>assigned_officer_id', o.id)
      const board = boards?.[0]
      if (!board) {
        console.log(`- ${o.full_name || o.email}: no assigned board → skip`)
        continue
      }
      const { data: cols } = await db
        .from('board_columns')
        .select('config')
        .eq('board_id', board.id)
        .eq('column_type', 'checkin')
        .limit(1)
      const coordsCol = cols?.[0]?.config?.coordinates_column_id
      const { data: rawItems } = await db
        .from('board_items')
        .select('id, name, data')
        .eq('board_id', board.id)
        .limit(30)
      const items = (rawItems || [])
        .map(it => ({ id: it.id, name: it.name, coords: coordsCol ? parseCoords(it.data?.[coordsCol]) : null }))
        .filter(it => it.coords) // only geolocated items make a real route
      if (items.length === 0) {
        console.log(`- ${o.full_name || o.email}: board "${board.name}" has no geolocated items → skip`)
        continue
      }

      const fuel = FUELS[oi % 3]
      const consumption = 7 + (oi % 3) // 7/8/9 L/100km
      const start = items[0].coords

      if (APPLY) {
        await db.from('officer_transport').upsert(
          {
            user_id: o.id,
            fuel_type: fuel,
            consumption_l_per_100km: consumption,
            start_lat: start.lat,
            start_lng: start.lng,
            start_address: 'ტესტ საწყისი',
            updated_at: iso(Date.now()),
          },
          { onConflict: 'user_id' }
        )
        // wipe this officer's planned routes for the week (idempotent)
        const dates = Array.from({ length: 7 }, (_, i) => isoDate(monday + i * DAY))
        const { data: old } = await db
          .from('routes')
          .select('id')
          .eq('inspector_id', o.id)
          .in('date', dates)
        const oldIds = (old || []).map(r => r.id)
        if (oldIds.length) {
          await db.from('route_stops').delete().in('route_id', oldIds)
          await db.from('location_checkins').delete().in('route_stop_id', oldIds) // safety
          await db.from('routes').delete().in('id', oldIds)
        }
      }

      // distribute up to 14 items across the week, ~2 per day
      const perWeek = items.slice(0, 14)
      let idx = 0
      let totalKm = 0
      const dayCount = Math.min(7, Math.ceil(perWeek.length / 2))
      for (let d = 0; d < dayCount; d++) {
        const dayItems = perWeek.slice(idx, idx + 2)
        idx += 2
        if (dayItems.length === 0) break
        const date = isoDate(monday + d * DAY)
        const past = date < todayDate
        const isToday = date === todayDate

        // day distance from start → stops → start
        let km = 0
        let prev = start
        const legs = dayItems.map(it => {
          const leg = Math.round(haversineKm(prev, it.coords) * 100) / 100
          prev = it.coords
          km += leg
          return leg
        })
        km += Math.round(haversineKm(prev, start) * 100) / 100
        km = Math.round(km * 100) / 100
        totalKm += km

        if (!APPLY) {
          console.log(`   ${date}${isToday ? ' (today)' : ''}: ${dayItems.map(i => i.name).join(', ')} — ${km}km`)
          continue
        }

        const { data: route } = await db
          .from('routes')
          .insert({
            name: `ტესტ კვირა — ${date}`,
            date,
            inspector_id: o.id,
            status: 'planned',
            total_distance_km: km,
            optimization_type: 'distance',
          })
          .select('id')
          .single()

        for (let s = 0; s < dayItems.length; s++) {
          const it = dayItems[s]
          // status mix: past days → completed, except the 2nd stop of the first
          // past day is deferred, and one gets object-canceled.
          let status = 'pending'
          let skip = null
          if (past) {
            if (d === 0 && s === 1) skip = { skip_reason: 'closed', skip_note: NOTES[oi % NOTES.length] }
            else if (d === 1 && s === 1)
              skip = { skip_reason: 'canceled', skip_note: 'ობიექტმა გადადო', skip_confirmed: oi % 2 === 0 }
            else status = 'completed'
          } else if (isToday && s === 0) status = 'in_progress'

          const { data: stop } = await db
            .from('route_stops')
            .insert({
              route_id: route.id,
              board_item_id: it.id,
              position: s + 1,
              status: skip ? 'skipped' : status,
              distance_from_previous_km: legs[s],
              ...(skip ? { ...skip, deferred_at: iso(monday + d * DAY + 21 * 3600000) } : {}),
            })
            .select('id')
            .single()

          // completed / in-progress stops get a check-in at ~10:00 Georgia
          if (status === 'completed' || status === 'in_progress') {
            const inAt = monday + d * DAY - GEO + 10 * 3600000 // 10:00 Georgia → UTC
            const done = status === 'completed'
            await db.from('location_checkins').insert({
              inspector_id: o.id,
              board_item_id: it.id,
              route_stop_id: stop?.id ?? null,
              checkin_type: 'planned',
              lat: it.coords.lat,
              lng: it.coords.lng,
              accuracy: 12,
              created_at: iso(inAt),
              checked_out_at: done ? iso(inAt + 30 * 60000) : null,
              duration_minutes: done ? 30 : null,
            })
          }
        }
      }

      if (APPLY) {
        const liters = Math.round((totalKm * consumption) / 100 * 10) / 10
        await db.from('week_plans').upsert(
          {
            inspector_id: o.id,
            board_id: board.id,
            week_start: weekStart,
            status: 'approved',
            submitted_at: iso(monday - DAY),
            approved_at: iso(monday - DAY + 3600000),
            approved_by: adminId,
            total_km: totalKm,
            fuel_liters: liters,
            fuel_cost: null,
            updated_at: iso(Date.now()),
          },
          { onConflict: 'inspector_id,week_start' }
        )
        await db.from('week_plan_comments').insert([
          { inspector_id: o.id, week_start: weekStart, author_id: o.id, body: 'კვირა დავგეგმე, გავაგზავნე დასამტკიცებლად.' },
          ...(adminId ? [{ inspector_id: o.id, week_start: weekStart, author_id: adminId, body: 'დამტკიცებულია, warmდ იმუშავე.' }] : []),
        ])
      }

      if (APPLY && RESET_PASSWORDS && o.email) {
        const { error } = await db.auth.admin.updateUserById(o.id, { password: PASSWORD })
        if (error) console.warn(`   password reset failed for ${o.email}: ${error.message}`)
      }
      if (o.email) creds.push({ name: o.full_name || '—', email: o.email, fuel })
      console.log(`- ${o.full_name || o.email}: board "${board.name}", ${perWeek.length} objs, fuel=${fuel}, ~${totalKm}km ✓`)
      oi++
    } catch (e) {
      console.error(`! ${o.full_name || o.email} failed:`, e.message)
    }
  }

  console.log('\n== credentials ==')
  for (const c of creds)
    console.log(`  ${c.name.padEnd(22)} ${c.email.padEnd(34)} ${RESET_PASSWORDS ? PASSWORD : '(unchanged)'}   [${c.fuel}]`)
  if (!APPLY) console.log('\n(dry run — pass --apply to write; add --reset-passwords to set a known password)')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
