# Payments / Bank Reconciliation — ACTIVE

Lives on the **Team2 instance only**. `bank_transactions` = actual incoming payments from the Bank of Georgia API; the ხელშეკრულებები board holds contract terms; matching key is the tax ID (`sender_inn` ↔ board `ს/კ` column).

## What exists

- **Ingestion**: BOG API polling (`/api/cron/bank-poll` every 30 min, business hours Georgian time) + historical backfill endpoint with date range
- **Matching**: DB functions `match_bank_transaction` / `match_unmatched_transactions` search boards in priority order (active contracts → one-time → paused → ended) by tax ID; nightly reconcile cron; manual match/ignore via API
- **UI**: `/payments` transaction list with filters/stats, `/payments/unmatched` for the manual queue
- **State**: ~1,560 transactions, ~1,215 auto-matched, ~140 genuinely unmatched (bank fees, individuals, non-clients)

## Fixed this month (the feature was silently dead)

1. **Crons were `[]` since April 29** — removed to unblock a Vercel Hobby-plan deploy and never restored after the Pro upgrade. Every transaction ever ingested had come from manual runs; nothing had been ingested since June 1. Crons restored, registered, and verified on all three Vercel projects.
2. **Matching returned 0 forever on Team2** — the Tokyo→Frankfurt migration corrupted the Georgian string literals inside the matching function to `???`. Re-applied migration 085 with correct UTF-8; scanned all other functions for the same corruption (none).
3. **June 1 – July 8 gap backfilled** (164 transactions) and reconciled (201 matched)
4. Team1 was missing the payments schema entirely while having BOG credentials — cron would have errored every 30 min; schema + security hardening applied

## What's left

- **Staleness alert** (issue #8) — email admins if no transaction ingested for 3+ business days, so a silent outage can never last 5 weeks again. _This is the most important pending item._
- **Manual match UX** (issue #7) — two-click company picker + ignore/undo for the ~140 unmatched
- Watch item: confirm the cron keeps firing over the next week (verified registered + manually exercised; first scheduled runs observed)
