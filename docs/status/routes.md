# Routes & Optimization — LEGACY (functional, untouched for months)

Route planning for inspector field days. Algorithmically the strongest legacy feature — but built entirely on the pre-boards data model.

## What exists

- **Route builder** (`/routes/builder`): map-based planning; pick companies, optimize order, save
- **Optimizer** (`packages/route-optimizer`): Nearest-Neighbor start + 2-opt improvement; real road distances via public OSRM (up to 100 stops) with Haversine ×1.3 fallback; returns original-vs-optimized comparison; max 50 stops/route; route geometry captured for map display
- **Management** (`/routes/manage`): admin/dispatcher list with stats, status flow (planned → in_progress → completed/cancelled), reassignment
- **Inspector view** (`/inspector/routes`): assigned routes as cards (date/stops/distance)
- **Integration**: saving a route updates `company_services` inspection dates; route stops connect to the checkin geofence flow

## Data model (all legacy tables)

`routes`, `route_stops`, `companies`, `inspectors`, `company_services`, `inspection_history` — none of this uses the boards system.

## Gaps found in audit

- Routes are **immutable after save** — no editing, only reassignment
- Reassignment uses a browser `prompt()` — stub-quality UI
- Inspector route view has no turn-by-turn/geometry display (geometry is stored but unused there)
- Public OSRM server dependency — fine for current volume, self-hosting is the production-grade answer if usage grows
- `/inspector/routes` and `/inspector/tracking` have no sidebar links — reachable only by direct URL

## Decision needed

Is route planning still part of the workflow now that checkins are item-centric and boards hold company data? Three options:

1. **Keep as-is** — it works; document that routes intentionally live on the legacy model
2. **Migrate** — rebuild route building on top of board items (large project)
3. **Sunset** — if teams don't plan routes anymore, remove ~15 files + 6 tables of surface area

Nobody has touched this code in months; usage data (are routes being created?) should drive the decision. On Team2: check `SELECT COUNT(*), MAX(created_at) FROM routes` per instance before deciding.
