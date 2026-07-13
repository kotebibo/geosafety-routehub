# RouteHub — Project Status Report

**Date:** 2026-07-13 · **Author:** generated from full-codebase audit + live system checks

One file per feature in this folder; this page is the executive summary.

## Status legend

- **STABLE** — feature-complete for current needs, in production use
- **ACTIVE** — under active development this month
- **LEGACY** — works, but built on the pre-boards data model; strategic decision needed
- **PARTIAL** — real gaps between what exists and what's usable
- **ORPHANED** — built but not wired into the product

## Feature overview

| Feature                       | Status  | Summary                                                                                                                                              | Details                                |
| ----------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Boards system                 | STABLE  | Core of the product: virtualized tables, 20+ column types, groups, subitems, view tabs, realtime, undo/redo, import/export, transfers, global search | [boards.md](boards.md)                 |
| Checkins (field visits)       | ACTIVE  | Rebuilt this month, item-centric with GPS geofence, visit types, stage automation, overdue flags. In live testing                                    | [checkins.md](checkins.md)             |
| Payments (BOG reconciliation) | ACTIVE  | Fixed this month: polling crons restored after 5-week silent outage, matching function repaired, gap backfilled                                      | [payments.md](payments.md)             |
| Routes & optimization         | LEGACY  | Functional and algorithmically solid (NN + 2-opt + OSRM), but on the old data model and untouched for months                                         | [routes.md](routes.md)                 |
| Live tracking                 | LEGACY  | Working 10s-interval GPS tracking with Ably broadcast + history; on legacy inspectors table                                                          | [tracking.md](tracking.md)             |
| Companies registry            | LEGACY  | Full CRUD with locations/services; coexists with boards-based company data — the biggest "two systems" confusion                                     | [companies.md](companies.md)           |
| Inspectors registry           | LEGACY  | Pages work but the underlying table is deprecated (auth.users is canonical); several features still depend on it                                     | [inspectors.md](inspectors.md)         |
| PDP compliance (5-phase)      | PARTIAL | Complete backend + spec, isolated UI not linked from navigation, no integration with the new checkin stages                                          | [pdp-compliance.md](pdp-compliance.md) |
| Document generation           | STABLE  | DOCX/XLSX templates with merge fields, generation, download, email — complete                                                                        | [documents.md](documents.md)           |
| Announcements & notifications | PARTIAL | Announcements complete; notification infra complete but 3 of 6 types have no trigger                                                                 | [communications.md](communications.md) |
| AI chat assistant             | STABLE  | Claude-backed streaming chat with 10 data tools, admin/dispatcher-gated                                                                              | [communications.md](communications.md) |
| Analytics                     | STABLE  | 4-tab financial dashboard (finance, inspectors, companies, forecast) reading the boards                                                              | [analytics.md](analytics.md)           |
| My Work                       | STABLE  | Cross-board personal task list grouped by due date, inline edits                                                                                     | [my-work.md](my-work.md)               |
| Admin, roles & auth           | STABLE  | Users/roles/permissions CRUD complete; wildcard permission model; API-level permission enforcement is coarse                                         | [admin-auth.md](admin-auth.md)         |
| Workspaces                    | STABLE  | Full workspace/member/role management                                                                                                                | [workspaces.md](workspaces.md)         |
| Platform & infrastructure     | ACTIVE  | Consolidated to one branch + CI this month; 3 instances, migration tooling, 6 themes                                                                 | [platform.md](platform.md)             |

## This month in one paragraph

July was an infrastructure and field-operations month. The checkin system was rebuilt from a separate checkins-board model into item-centric visits with GPS geofencing (150m), per-service visit types that auto-update the company's pipeline stage, overdue flagging, and admin controls — this is the audit-trail foundation the PDP business runs on. Payments turned out to be silently dead since June 1 (crons removed during a Vercel plan workaround were never restored; a DB function's Georgian strings were corrupted during the Frankfurt migration) — both fixed, gap backfilled, 201 transactions auto-matched. The repo went from three cherry-picked branches to a single `master` deploying all three instances, gained working CI (tsc + 600 tests + build on every PR), a one-command migration runner, branch protection, an onboarding task backlog (9 GitHub issues), and lost ~2,100 lines of dead/duplicated code in a refactoring pass.

## Decisions needed (blocking clarity, not code)

1. **Legacy surface strategy** — **DECIDED 2026-07-13: migrate entirely to boards.** Usage data showed zero routes ever created and zero tracking pings in 30 days. Phase 1 shipped (visits page from checkin data, legacy nav removed); plan and phases in [migration-to-boards.md](migration-to-boards.md).
2. **PDP compliance vs. checkin stages** — two parallel stage models exist (pdp_compliance_phases table vs. checkin visit-type stage automation). They don't talk to each other. Pick one as source of truth or bridge them. See [pdp-compliance.md](pdp-compliance.md).
3. **Team3 Supabase plan** — file uploads capped at 50MB (free plan); either upgrade the org (~$25/mo) or lower the app's advertised limit on that instance.
4. **Labor safety visit types** — checkin stage automation for შრომის უსაფრთხოება awaits the business's list of visit types (5-minute change once provided).
