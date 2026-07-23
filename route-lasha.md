# RouteHub — Routing Flow (handoff)

Status: **merged to `stage`** (commit `5de6589`), deployed to the stage Vercel.
**Not** on `master` yet — that's the weekly release (`/stage-to-master`) + prod
migrations on prod day.

Branches (all pushed):

- `feat/routing-flow` — base feature (backup point)
- `feat/manager-requests` — manager-requirement additions (backup point)
- `feat/routing-map` — map + latest fixes; the full flow lives here
- `stage` — everything above, merged & verified

---

## What the feature does

### Officer

- **Plan next week only** on `/routing` (WeeklyPlanner). Current/past weeks are
  locked; client pins to next week and the server rejects any other `weekStart`.
- Objects show their **visit deadline** and the pool is **sorted by urgency**
  (overdue first). One-click **optimize** = OSRM, sequenced by **shortest time**
  (duration matrix), home → objects → home. Saved order = the optimized order,
  not the officer's pick.
- **My Week** (`/inspector/routes`): current-week execution. Check-in / check-out
  (reuses the board `CheckinBottomSheet`, photo via phone camera), defer.
  Per-day **"Route in Google Maps"** button opens the full day route.
  Today/week come from the **server** (`/api/time`), not the device clock.
- **Deferred (skipped) stop** stays struck-through in its day AND appears in the
  **"plan deviation"** section, where it can be **checked in on any day**;
  checking in there resolves the skip (`markPlannedStop` falls back to the week's
  skipped stop). Reason = the officer's hand-written note if any, else the picked
  enum (empty/closed/refused/canceled/other).
- **Unplanned visits**: book an ad-hoc object (+reason) → request to admin, its
  own home→object distance.

### Manager (admin/dispatcher)

- **Route analytics** (`/admin/route-analytics`): Week/Month toggle. Week =
  per-officer km/liters/cost/time + fleet stats + officer search by name. Month =
  weekly breakdown slices + month totals. Tabs: requests / unplanned / deferred.
  Per-officer popup with day breakdown (deferred shown red + reason), a
  **failed** tab, a **history** tab, and week comments. **Excel** export
  (week/month). Global fuel prices (petrol/diesel/gas) + per-officer override.
- **Approve** a week plan = buys that week's fuel (snapshot).
- **Change history** (who/when/what) on all routing mutations.
- **Notifications** (in-app): plan submitted, deferrals, auto-defer misses,
  comments; **email + in-app** for unplanned-visit requests.

### Fuel & cost

- Cost = officer consumption × km × fuel-type price (or per-officer override).
- **prepaid carry-over**: an object whose latest prior stop was an unresolved
  skip in an **approved** week is marked `prepaid` when re-planned → its km/fuel
  isn't charged twice. Analytics/export exclude all-prepaid days.

---

## Data model (migrations 115–121, on stage-db)

| Migration                 | Adds                                                           |
| ------------------------- | -------------------------------------------------------------- |
| 115_week_plans            | week plan lifecycle (draft/submitted/approved) + fuel snapshot |
| 116_route_stops_deviation | route_stops: skip_reason, skip_note, deferred_at, prepaid      |
| 117_extra_visits          | unplanned visit requests                                       |
| 118_checkin_photo         | location_checkins.photo_path                                   |
| 119_stop_cancel_reason    | skip_confirmed + 'canceled' skip reason                        |
| 120_week_plan_comments    | week-plan comment thread                                       |
| 121_routing_audit_log     | routing change history                                         |

Also relies on earlier: `officer_transport` (106/107/114), `app_settings` fuel
prices (111), `location_checkins` (058), `routes`/`route_stops` (001).

Officer ↔ board link: `board.settings.assigned_officer_id`. `inspector_id`
columns hold `auth.users` ids — resolve display names from `public.users`, never
via a PostgREST `inspectors(...)` embed.

---

## Time (server-authoritative)

`apps/web/src/lib/time.ts` is the single source for Georgia time (UTC+4):
`georgiaToday / georgiaDateOf / georgiaMonday / georgiaMondayOfDate /
georgiaTimeOfDay / georgiaDayRange`. `GET /api/time` exposes it; the client reads
day/week via `useServerDate` (refetch on focus + interval). Analytics/export/
month bound check-ins by the Georgia week in UTC (`+04:00`).

---

## Crons (root `vercel.json`, UTC — Georgia = UTC+4)

- `auto-defer-stops` `0 17 * * *` (21:00 Georgia) — pending stops for past/today
  → skipped; alerts managers per officer about missed objects.
- `cleanup-checkin-photos` `0 3 * * *` — 14-day photo retention.
- Both auth via `Authorization: Bearer <CRON_SECRET>` (header only).

---

## Env vars

- `CHECKIN_RADIUS_METERS` — geofence radius. **TEMP default 150 KM** for stage
  test data (check-ins pass anywhere). Set `=150` to restore the real rule.
- `NEXT_PUBLIC_CHECKIN_ANY_DAY` / `CHECKIN_ANY_DAY` — `true` = check in any day;
  else only the planned day (deferred/unplanned always allowed).
- `OSRM_BASE_URL` — self-hosted OSRM; falls back to the public demo (rate-limited).
- `CRON_SECRET` — cron auth.
- `checkin-photos` storage bucket (private, signed URLs) — exists on stage.

---

## Test data on stage

`scripts/seed-test-week.mjs` seeded a full current week for the 6 officers whose
board has geolocated items (completed + deferred + object-canceled mix, notes,
fuel types, approved plans, comments). Re-run: `node scripts/seed-test-week.mjs
--apply --reset-passwords=Officer123!` (reads `apps/web/.env.local`).

Logins (password `Officer123!`):

| Officer             | Email                       | Fuel   |
| ------------------- | --------------------------- | ------ |
| Stage Officer       | officer@stage.routehub.ge   | gas    |
| ელენე დემოშვილი     | officer4@stage.routehub.ge  | petrol |
| ელენე მაგალითაშვილი | officer5@stage.routehub.ge  | diesel |
| თამარ დემოშვილი     | officer9@stage.routehub.ge  | gas    |
| ლევან ტესტაძე       | officer11@stage.routehub.ge | petrol |
| ნინო ფეიქიძე        | officer20@stage.routehub.ge | diesel |

---

## What remains

- **Prod release**: `/stage-to-master` (weekly), then `/migration-prod` applies
  115–121 to Team1/Team2/Team3 on prod day. Create the `checkin-photos` bucket +
  env vars on each prod instance.
- **Restore geofence**: set `CHECKIN_RADIUS_METERS=150` (or revert the fallback)
  once test data is loaded — currently 150 KM.
- **`database.ts` regen**: types are missing `week_plans/extra_visits/
officer_transport` + new columns (routing code uses `as any`, like the rest of
  the app). Run `supabase gen types` when convenient.
- **OSRM self-host**: still on the public demo server; set `OSRM_BASE_URL` for
  the real weekly load (~2000 routes/week).
- **#6 (design, deferred)**: manager asked for check-in on the planning page;
  kept separate (plan on `/routing`, execute in My Week) per owner decision.
- **Minor hardening (not leaks)**: a few setState-after-unmount spots
  (geocode loop, RoutePlanningPopup optimizer, book-unplanned fetch) could get
  cancel guards. Audit found no real memory leaks.

---

_Last updated: 2026-07-23. Feature merged to stage; master untouched._
