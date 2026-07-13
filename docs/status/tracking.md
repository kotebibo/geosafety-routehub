# Live Tracking & Location — LEGACY (working) + one ORPHANED piece

## Live tracking — works

- **Inspector side** (`/inspector/tracking`): sends GPS position every 10 seconds to `/api/location/update`; stored as current position on the legacy `inspectors` row + appended to `inspector_location_history` (PostGIS; accuracy/speed/heading per ping; retained indefinitely)
- **Dispatch side** (`/tracking`): map of inspectors active in the last 30 minutes, with today's route progress (stops completed/total), per-inspector location trail (8-hour window), Ably channel broadcast per inspector
- Built on the legacy `inspectors` table — works, but ties into the deprecation question (see inspectors.md)

## Coordinates map — works (niche)

`/coordinates-map` visualizes reported GPS coordinates vs. registered addresses from a hardcoded board ("კოორდინატები - ინსპექტორები"), with inspector filter and distance comparison. Display-only, client-side filtering. Fine for its purpose.

## GPS pings during checkins — ORPHANED

`/api/checkins/ping` + the `checkin_gps_pings` table were built for mid-visit position monitoring (is the inspector still on site during a long visit?): the endpoint computes distance from the visit's reference point, flags violations, stores every ping.

**Nothing calls it and nothing displays it.** The client never invokes the endpoint; no dashboard reads the table.

**Decision**: two honest options —

1. **Wire it up** (~half a day): the checkin bottom sheet already runs `useGps` with a live watch during an active visit — posting a ping every N minutes is a small addition, and violation counts could show on checkout records. Strengthens the audit-trail story ("stayed on site 47 minutes, 0 violations").
2. **Delete it** (endpoint + table): if mid-visit monitoring isn't a business requirement, this is dead weight.

Do not leave it orphaned — a new developer will find it and burn time figuring out whether it matters.

## Gaps

- `/inspector/tracking` isn't linked in the sidebar (direct URL only) — either link it in the officer nav or fold position-sending into the checkin flow
- 10s interval × full workday = battery drain on inspector phones; consider adaptive interval (30–60s when stationary) if complaints surface
