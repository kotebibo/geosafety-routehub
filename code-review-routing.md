# Routing-flow — Senior Code Review

Branch: `code-stage`. Scope: the routing-flow feature (officer planning/execution,
manager analytics, crons, `lib/time`, seed). Three independent passes:
correctness/security, performance/React/DB, conventions/i18n/theming/cleanliness.

**Verdict:** solid, well-structured feature; **no crash/blocker** in the happy
path. The findings cluster around (a) **money semantics** — deferred/prepaid/
failed cost is inconsistent with what the migrations promise, (b) **unbounded
queries** that will degrade as history grows, (c) a **check-in authorization**
gap, and (d) refactor/cleanup debt (auth duplication, dead code, a11y).

---

## 🔴 High

### 1. Cost/prepaid/failed billing is inconsistent with the migration contract

The single most important area — it produces wrong money a manager sees.

- **Deferred/failed legs are still billed.** `analytics/route.ts:100-103`,
  `analytics/month/route.ts:149`, `export/route.ts:84`, `computeWeekFuel`
  (`week-plan/route.ts:69-75`) sum the whole day's `total_distance_km` unless
  **every** stop that day is `prepaid`. A day with a deferred/failed object still
  bills that object's distance. Migration 119 says a failed stop is "excluded
  from cost."
- **Prepaid exclusion is day-granular, not leg-granular.** `allPrepaid =
stops.every(s => s.prepaid)` — a carried (prepaid) object planned alongside a
  new one re-charges the prepaid leg (the normal case). Migration 116 says
  prepaid "must NOT add km/fuel."
- **"failed" list isn't gated on an approved (paid) week.** `officer-week/route.ts:102-111`
  flags latest-prior unresolved skips as failed with no approved-week check,
  while the prepaid path (`week-plan/route.ts:281-283`) _does_ gate on
  `approvedWeeks`. The two features disagree about the same stop.

**Fix (decide the model, then make all four paths consistent):** either compute
cost from per-stop `distance_from_previous_km` (summing only non-failed,
non-prepaid legs), or treat `week_plans.total_km/fuel_cost` (the approval
snapshot) as the source of truth and have analytics read it instead of
recomputing. Apply the approved-week gate to `failed` to match prepaid.

### 2. `useMyRoutes` fetches an officer's ENTIRE route history every call

`hooks/useMyRoutes.ts:42-54` calls `/api/routing/my-routes` with no `from`/`to`
(the API supports them, `route.ts:44-45`), then resolves **all** historical
items/columns/coords/check-ins. Consumed by `MyWeekPage`, `OfficerWeekPopup`,
`useBoardWeekPlan` — each filters to one week client-side. Payload + DB work grow
without bound → the officer home screen and admin popup slow over time.
**Fix:** pass a bounded range (current week for My Week/board chips; the popup's
week for the popup), and split the query key by range. Same unbounded pattern:
`officer-week/route.ts:72-78` and `week-plan` prepaid `route.ts:256-259` — add a
lower date bound.

### 3. Check-in has no board-ownership binding

`checkins/route.ts` only checks `inspector_id === session.user.id`; it never
verifies the `board_item_id` belongs to a board assigned to that officer. It then
writes `board_items.data[stage]` and mutates `board_columns.config` via the
**service client** (RLS-bypassing). With the temp 150 km geofence, an officer can
post a check-in for another team's object and overwrite its stage.
**Fix:** resolve the item's board and require `assigned_officer_id === inspector_id`
(or caller is a manager) before accepting the check-in / running stage automation.

---

## 🟠 Medium

### Correctness

- **Reopen leaves a stale approval snapshot.** `week-plan/route.ts:337-346` sets
  `status:'draft'` but keeps `approved_at/by`, `submitted_at`, `total_km`,
  `fuel_liters`, `fuel_cost` — GET returns "draft" with the old purchased figures.
  Null them on reopen.
- **Seed re-run duplicates check-ins.** `scripts/seed-test-week.mjs:162-167`
  deletes `location_checkins` by **route** id (should be stop id) and the FK is
  `ON DELETE SET NULL`, so old check-ins survive each `--apply` → doubled visit
  history/minutes on stage. Delete by officer+week on `board_item_id`/`created_at`.

### Reactivity (change-detection)

- **Plain week save under-invalidates.** `hooks/useWeekPlan.ts:79-83` (save)
  invalidates only `week-plan`; it rewrites `routes`, so `my-routes`,
  `week-execution` (and, for a manager save, `route-analytics`/`admin-week`) stay
  stale. (`useWeekPlanAction` submit/approve already covers analytics/admin-week.)
- **`useUpdateStopStatus` misses `week-execution`.** `hooks/useMyRoutes.ts:102-110`
  — deferring changes `missedPlanned` in the planner's ExecutionPanels. Add it.

### Performance / DB

- **`xlsx` is a static import** in the analytics page (`route-analytics/page.tsx:21`)
  — ships/parses a very heavy lib on every visit. Make it
  `const XLSX = await import('xlsx')` inside the export handler.
- **Serial DB round-trips.** `analytics`, `analytics/month`, `export`, `admin-week`
  run independent reads sequentially (4–6 round-trips). `Promise.all` them.
- **Missing `extra_visits (visit_date)` index.** `admin-week`/`export` filter by
  `visit_date` range without `inspector_id`, so the composite
  `(inspector_id, visit_date)` index can't serve them.

### Conventions / cleanliness

- **Auth duplication.** `requireAdminOrDispatcher()` is used in some routes, but 13
  others hand-roll `user_roles` role reads; `roleOf()` is copy-pasted in 3 files
  and the self-or-manager 403 check ~8 times. Extract `getRole()` /
  `requireSelfOrManager()`.
- **Dead code.** `stop-state.ts:21 STOP_STATE_CLASS` (unused), `fuel-price` GET
  handler (no consumer), `RoutePlanningPopup` `handleSaveDraft` localStorage draft
  (never read back). Remove or wire up.
- **Duplication to hoist.** `GROUP_DOT_COLORS` (2×), `weekDates()` (4 routes),
  `FUEL_KEYS`/`toPrice` (4 routes), stop-marker badge markup (MyWeekPage +
  OfficerWeekPopup → a `<StopStateBadge>`), the geocode panel
  (`LocationSearchField` vs `InspectorLocationControl`), and `mondayOfDate` (dup of
  `georgiaMondayOfDate`).

### Accessibility

- **Keyboard-inaccessible expand.** `RoutingBoardSection.tsx:62-68` toggles on a
  `div onClick` with no `role`/`tabIndex`/`onKeyDown`.
- **Icon-only buttons lack `aria-label`.** analytics prev/next nav; close (X)
  buttons in `OfficerWeekPopup`, `RouteMapModal`, `MyWeekPage` modals.

---

## 🟡 Low

- `week-plan` PATCH `weekStart` unvalidated (`z.string()`); add a YYYY-MM-DD/Monday check.
- Week save delete+insert isn't transactional (concurrent saves could dup stops).
- Board-item check-ins never stamp `actual_arrival_time/departure_time` on route_stops (cosmetic; times read from check-ins).
- `photo_path` on create isn't prefix-validated to the inspector's id (doesn't leak — GET is guarded).
- Photo cleanup nulls `photo_path` even if the storage delete errored (orphans files).
- **Planner still uses the device clock** (`useWeeklyPlan.ts:308-309` `new Date()`, `lib/week.mondayOf`) while My Week uses server time — consistency gap with the `useServerDate` convention.
- i18n: hardcoded example `placeholder`s in `OfficerTransportModal.tsx:158-198`.
- Theming: `text-green-600`/`amber-600` (16×) vs the documented `-500`.
- Prop-drilling `t` into 10 subcomponents instead of `useTranslations()`; two large modals use inline prop types instead of `{Component}Props`.
- Magic numbers: geocode throttle `1100`ms, `21:00` cutoff → name them.
- `setState`-after-`await` without a cancel guard: `useWeeklyPlan.addExtraVisit`/`geocodeAddresses`, `RoutePlanningPopup` optimizer (React-18 warning, not a leak).

---

## ✅ Verified correct (checked, no action)

- No `'visited'` ever written; `visited→completed` translated on write.
- Double check-in closed by check-then-insert + `23505`→409 + partial unique index.
- Cron auth is header-only Bearer, fails closed in production.
- Photo signed-URL GET enforces uploader-prefix-or-manager; no cross-user/bucket access.
- Names resolved from `public.users`/`board_items` — no forbidden `inspectors(...)` embeds.
- Georgia bucketing (analytics/month `weekIndexOf`, `georgiaDayRange`, 21:00 cutoff) is sound.
- Indexes present for the hot paths (routes by inspector+date, route_stops by route/board_item, week_plans, routing_audit_log).
- Leaflet is `dynamic({ssr:false})`; portals + geometry effect clean up; `OfficerWeekPopup` remounts via `key`; week-plan POST preserves executed stops; IDOR on week-plan GET already fixed.

---

## Recommended order

1. **Money semantics (#1)** — decide leg-level vs snapshot; make analytics/export/computeWeekFuel/officer-week consistent. (correctness)
2. **Bound the queries (#2)** — `useMyRoutes`, `officer-week`, prepaid calc. (scaling)
3. **Check-in board ownership (#3)** + reopen snapshot + seed check-in dedup. (security/data)
4. **Reactivity gaps** (save + stop-status invalidations) + `xlsx` lazy + `Promise.all` + `extra_visits` index. (perf/UX)
5. **Refactors**: shared auth helper, dead-code removal, duplication hoist, a11y labels, planner server-time. (maintainability)

_Reviewed 2026-07-23 on `code-stage`. No changes applied — report only._
