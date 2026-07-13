# Companies Registry — LEGACY (complete CRUD, strategic overlap with boards)

## What exists

- `/companies` list (search, filters, pagination), `/companies/new`, `/companies/[id]` detail
- **Detail page manages**: multiple locations per company (full CRUD, primary flag, coordinates), service assignments (frequency, next inspection date, assigned inspector), recent checkin history (read-only pull from the checkin API)
- Service layer (`companies.service.ts`) is one of the largest and most complete in the app
- PDP-specific creation flow at `/companies/pdp/new`

## The strategic problem

Company data now lives in **two places**:

1. The `companies` / `company_locations` / `company_services` tables (this registry)
2. Board items on company boards (where the actual daily work — checkins, stages, payments matching — happens)

They are not linked: a company's board item and its registry row have no foreign key between them. The new checkin system attaches to **board items**; the analytics read **boards**; payments match against **board columns**. The registry increasingly holds reference data that the operational systems don't read.

## Gaps

- No board_item ↔ company linkage anywhere
- PDP compliance status invisible on the company list and detail pages (see pdp-compliance.md)
- Route builder still sources companies from this registry — the one system that genuinely depends on it (see routes.md)

## Decision needed

Same fork as routes: **keep both systems documented as intentional** (registry = master data, boards = operations), **bridge them** (store `company_id` on board items or vice versa — enables showing registry data in item detail and vice versa), or **migrate fully to boards** and sunset the registry pages. The bridge option is the cheapest way to end the confusion: one nullable column + backfill by tax-ID match (the payments matching logic already proves tax ID works as the join key).
