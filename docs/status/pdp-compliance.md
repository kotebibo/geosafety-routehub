# PDP Compliance (5-phase) — PARTIAL (built, isolated, superseded?)

## What exists

- **Model** (migration 005 + `compliance.service.ts`): 5 phases per company — Initial Assessment → Documentation → Implementation → Training → Certification — with dates and completion flags; statuses new → in_progress → certified → active; existing clients skip to active with 90-day recurring checkups; auto-certification when all phases complete
- **UI**: `/companies/pdp` dashboard, `/companies/pdp/new`, `/companies/pdp/[id]` with a phase progress tracker; `PDPOnboardingManager` component
- **Docs**: a thorough spec at `apps/web/docs/PDP_COMPLIANCE_GUIDE.md`
- Feature-flag system runs in single-service mode with PDP enabled (fire/labor/food/environmental flags exist but are off)

## The problem: two parallel stage systems

This month the **checkin visit-type stage automation** shipped: inspectors select a visit type (პირველადი მონიტორინგი … პერიოდული მონიტორინგები) at check-in and the company's stage column updates automatically. That list overlaps heavily with the 5-phase model — but the two systems share no data:

|                 | pdp_compliance_phases                      | Checkin stage automation        |
| --------------- | ------------------------------------------ | ------------------------------- |
| Source of truth | Dedicated table                            | Status column on the board      |
| Updated by      | Manual phase editing in PDP pages          | Automatically on every check-in |
| Visible where   | Isolated /companies/pdp pages (not in nav) | On the board, on every item     |
| Checkup cadence | 90-day checkups tracked                    | 35-day overdue flag             |

## Gaps

- PDP pages aren't linked from the sidebar — effectively hidden
- Compliance status invisible on company list/detail
- Phase completion has no connection to actual visits (a training visit doesn't complete the Training phase)
- Planned-but-unbuilt per the spec: per-phase document attachments, audit log, phase-deadline emails

## Decision needed

Pick a direction before new developers touch this:

1. **Checkin stages win** (recommended if the field team lives in boards): sunset the pdp_compliance_phases pages/table; the board stage column + visit history _is_ the compliance record; port the 90-day checkup idea into the overdue-flag threshold per service
2. **Bridge**: keep the 5-phase table as the formal certification record and auto-advance phases from checkin visit types (e.g. "პირველი სწავლება" checkout completes the Training phase)
3. **Status quo** — two disconnected systems — is the one option that shouldn't survive this report
