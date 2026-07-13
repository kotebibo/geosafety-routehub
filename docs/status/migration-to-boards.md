# Migration to Boards-Only Model

**Decision (2026-07-13):** boards are the single data model. The legacy
companies/inspectors/routes/tracking system is being retired. Rationale is in
the usage data, not ideology:

| Evidence                                     | Value                          |
| -------------------------------------------- | ------------------------------ |
| `routes` rows ever created (all 3 instances) | **0**                          |
| Tracking pings, last 30 days                 | **0**                          |
| Last `companies` row created                 | 2026-05-08 (the Monday import) |
| Checkin columns on boards (Team2)            | 8 and growing                  |

The field workflow already lives in boards: visits are checkins on board
items, stages auto-update from visit types, payments match against board
columns, analytics read boards. The legacy tables were an earlier attempt at
the same domain that the org routed around.

## Target architecture

- **Company master data** → the contracts/company boards (ხელშეკრულებები etc.).
  Tax ID, coordinates, contacts are board columns; the checkin column is the
  visit system; the stage column is the pipeline.
- **Inspector identity** → `auth.users` + `public.users` (already canonical).
  "An inspector's companies" = the items on their board.
- **Routes/task assignment** → replaced by the **visit schedule derived from
  checkin recency**: an item whose last visit is older than the threshold IS
  the task. No separate planning artifact to maintain.

## Phase 1 — DONE (2026-07-13)

- [x] `/visits` page: per-user visit schedule (overdue / due soon / never
      visited / ok) computed from checkin history across the user's boards;
      linked in the sidebar for all roles
- [x] `GET /api/checkins/visits-due` endpoint (RLS-scoped boards, urgency
      buckets, shared `OVERDUE_VISIT_DAYS` threshold)
- [x] Legacy nav links removed (companies, inspectors, routes ×2, tracking,
      assignments) — pages stay URL-accessible during the grace period

## Phase 2 — grace period (2–4 weeks, new devs can own this)

- [ ] Watch for complaints about removed nav links (if a team actually used
      a page, restore its link and revisit)
- [ ] Company detail parity: whatever the registry detail page offered that
      boards don't (locations list, service frequencies) → decide per-piece:
      port to item detail drawer or drop
- [ ] Point the AI chat tools (`find_company`, `list_inspectors`) at boards
      instead of legacy tables
- [ ] Route the coordinates-map off the hardcoded board lookup gracefully

## Phase 3 — deletion (after grace period)

- [ ] Delete pages: `/companies/*`, `/inspectors/*`, `/routes/*`,
      `/inspector/routes`, `/inspector/tracking`, `/tracking`, `/locations`,
      `/admin/assignments`
- [ ] Delete API routes: `/api/routes/*`, `/api/inspectors`,
      `/api/location/*`, `/api/companies/services`, `/api/company-services`,
      `/api/data-collection`; decide `/api/checkins/ping` (wire up or delete —
      see tracking.md)
- [ ] Delete services/hooks/features: `companies.service`,
      `inspectors.service`, `routes.service`, `tracking.service`,
      `assignments.service`, `compliance.service` (pending the PDP decision),
      `packages/route-optimizer`, `src/features/routes|companies|inspectors|compliance`
- [ ] Drop tables (migration on all 3 instances): `routes`, `route_stops`,
      `inspections`, `inspection_history`, `inspector_location_history`,
      `checkin_gps_pings` (if unwired), `company_services`, `company_locations`,
      `companies`, `inspectors`, `pdp_compliance_phases` (pending PDP decision)
      — **archive exports first**; legacy `location_checkins.company_id` /
      `company_location_id` columns become vestigial (keep, they're part of the
      audit trail of old checkins)
- [ ] Remove legacy `item_type` unions ('route'|'company'|'officer'|
      'inspection') from types where only 'board_item' remains real

## Explicitly out of scope / kept

- `location_checkins` — this IS the new system's audit trail
- Payments — already boards-based
- PDP compliance — separate decision (see pdp-compliance.md); leaning
  "checkin stages win," which folds it into Phase 3 deletions
- Live tracking — unused for 30+ days; dies with Phase 3 unless the business
  asks for it back, in which case it gets rebuilt on auth.users

## Completion estimate (migration-to-boards specifically)

- Data/workflow migration (the hard part): **~85%** — the org already
  operates on boards; nothing operational reads the legacy tables except
  the AI chat tools and the registry pages themselves
- Code cleanup: **~25%** — Phase 1 done; the bulk of file/table deletion is
  Phase 3 (~40–60 files, 10 tables), blocked only on the grace period
