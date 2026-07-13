# Migration to Boards-Only Model — PLAN (not started)

**Direction chosen 2026-07-13; execution assigned to the incoming developers**
(GitHub issues #10–#14). Nothing has been removed yet — all legacy pages,
APIs, and tables are intact and linked. This document is the design.

## Why (usage data, not ideology)

| Evidence                                     | Value                          |
| -------------------------------------------- | ------------------------------ |
| `routes` rows ever created (all 3 instances) | **0**                          |
| Live-tracking pings, last 30 days            | **0**                          |
| Last `companies` row created                 | 2026-05-08 (the Monday import) |
| Checkin columns on boards (Team2)            | 8 and growing                  |

The field workflow already lives in boards: visits are checkins on board
items, stages auto-update from visit types, payments match against board
columns, analytics read boards. The legacy companies/inspectors/routes
tables were an earlier attempt at the same domain that the org routed
around. Migration is therefore mostly _deletion_, not data movement.

## Target architecture

- **Company master data** → the contracts/company boards. Tax ID,
  coordinates, contacts are board columns; the checkin column is the visit
  system; the stage column is the pipeline.
- **Inspector identity** → `auth.users` + `public.users` (already
  canonical). "An inspector's companies" = the items on their board.
- **Routes / task assignment** → replaced by a **visit schedule derived
  from checkin recency**: an item whose last visit is older than the
  threshold IS the task. No separate planning artifact.

## Phase 1 — build the replacement (issue #10, #11)

1. **`/visits` page** (issue #10): per-user visit schedule computed from
   checkin history across the user's RLS-accessible boards that have a
   checkin column. Buckets: overdue (`> OVERDUE_VISIT_DAYS`), due soon
   (last 7 days of the window), never visited, ok. Sorted most-urgent
   first; summary cards; rows deep-link to the board. Endpoint:
   `GET /api/checkins/visits-due`. Full spec in the issue.
2. **Sidebar cleanup** (issue #11): remove legacy nav links (companies,
   inspectors, routes ×2, tracking, assignments), add ვიზიტები. Pages stay
   URL-accessible — announce a grace period; if a team complains, restore
   that link and reassess.

## Phase 2 — decouple remaining readers (issues #12, #13)

- Repoint AI chat tools (`find_company`, `list_inspectors`) at boards
- Company-detail parity audit: what the registry detail page offers that
  the item drawer doesn't (locations list, service frequencies) — port or
  consciously drop, per piece
- Un-hardcode the coordinates-map board lookup

## Phase 3 — deletion (issue #14, gated on grace period)

- Pages: `/companies/*`, `/inspectors/*`, `/routes/*`, `/inspector/routes`,
  `/inspector/tracking`, `/tracking`, `/locations`, `/admin/assignments`
- APIs: `/api/routes/*`, `/api/inspectors`, `/api/location/*`,
  `/api/companies/services`, `/api/company-services`,
  `/api/data-collection`; decide `/api/checkins/ping` (wire up or delete —
  see tracking.md)
- Services/features: companies, inspectors, routes, tracking, assignments,
  compliance (pending PDP decision), `packages/route-optimizer`
- Tables (migration to all 3 instances, **archive exports first**):
  `routes`, `route_stops`, `inspections`, `inspection_history`,
  `inspector_location_history`, `checkin_gps_pings` (if unwired),
  `company_services`, `company_locations`, `companies`, `inspectors`,
  `pdp_compliance_phases` (pending PDP decision). Keep the legacy
  `location_checkins.company_id`/`company_location_id` columns — old
  checkins' audit trail references them.

## Kept / out of scope

`location_checkins` (the audit trail), payments (already boards-based),
PDP compliance pending its own decision (see pdp-compliance.md — leaning
"checkin stages win").

## Current completion

- Workflow-on-boards (the hard part): **~85%** — operations already run on
  boards; only the chat tools, coordinates-map, and the registry pages
  themselves still read legacy tables
- Migration execution: **0%** — deliberately; this is the new developers'
  first substantial project, and this doc + the issues are the spec
