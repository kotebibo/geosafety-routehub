# Checkins (Field Visits) — ACTIVE

Rebuilt this month from a company-centric flow into item-centric visits. Purpose: **concrete, GPS-verified proof of if and when a company location was visited** — the audit trail the PDP service sells.

## What exists (all new/rewritten in July)

- **Item-centric model**: checkins attach to board items (`location_checkins.board_item_id`); the old `/inspector/checkin` page and auto-created checkins boards are gone
- **Mobile-first UI**: tapping a checkin cell opens a bottom sheet (mobile) / right drawer (desktop) with live GPS status, geofence indicator, visit-type dropdown, notes, check-in/out, and the item's full visit timeline
- **Geofence**: 150m radius against coordinates parsed from a configurable column; `parseCoordinates` handles all 13 real-world formats found in production data (DMS strings, Google Maps URLs, decimal pairs — 99.5% parse rate on 202 real rows); graceful GPS-only fallback when coordinates are missing/unparseable
- **Visit types & stage automation**: per-service type lists (PDP: 9 stages from პირველადი მონიტორინგი to პერიოდული მონიტორინგები + სხვა); selecting a type on check-in auto-updates a linked status column — the company's pipeline stage maintains itself. Types are editable per column in Column Settings (custom lists override service defaults everywhere: dropdown, server automation, stage-option seeding)
- **Audit-trail guarantees**: history survives item transfers between boards (verified — moves are in-place updates); `inspector_id` = auth user id permanently; service is snapshotted per checkin so later config edits can't rewrite history; one active checkin per inspector enforced at DB level; checkout records duration + drift
- **Overdue flagging**: red border + days-since-visit on items whose last visit is older than 35 days; never-visited items deliberately not flagged (companies have years of pre-RouteHub history)
- **Admin**: `/admin/checkins` history with per-row delete (admin-only, enforced at UI + API + RLS layers); delete also available in the sheet timeline
- **Column config UI**: coordinates source, service, stage column, and visit types all editable per checkin column

## What's left

- **Labor safety visit types** — waiting on the business list (5-minute change in `constants/checkin.ts`)
- **Accuracy-aware geofence** (issue #3) — indoor GPS accuracy (±50–150m) can reject someone standing inside the building; fix is `distance − accuracy ≤ radius`
- **Admin filters + CSV export** (issues #4, #5) — the client-facing audit deliverable
- **Per-column summaries** — two checkin columns on one board currently share one summary (see boards.md)
- **Orphaned ping endpoint** — `/api/checkins/ping` + `checkin_gps_pings` table exist for mid-visit position tracking but nothing calls them and nothing displays them; either wire into the sheet during active checkins or remove (see tracking.md)

## Known caveats

- Browser geolocation is strong evidence, not cryptographic proof (spoofable by a motivated user with dev tools) — acceptable for the current threat model
- iOS requires per-site location permission (Settings → Privacy → Location Services → Safari); one-time setup friction per inspector
