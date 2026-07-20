---
name: migration-prod
description: Ship stage-approved migrations to all three PROD Supabase instances (Team1, Team2, Team3) — only the ones stage already has that a prod instance is missing. Prod day only, requires the owner's explicit go-ahead. Use when releasing the week's tested migrations to production.
---

# /migration-prod — ship migrations to the three prod instances

This writes to **production databases**. It is a prod-day operation and needs
the owner's explicit go-ahead every time. Do not run it speculatively.

## Preconditions

- The owner has said "go" for this prod release.
- The corresponding code is (or is being) released to `master` — schema and code
  ship together.
- `scripts/instances.json` exists with valid Management API tokens for all three
  prod instances.

## One-time ledger adoption (only if prod has never been baselined)

Older migrations were applied before the ledger existed. Baseline once so the
runner doesn't try to re-run them. Prod already had everything up to the last
pre-ledger migration (104):

```
node scripts/run-migration.mjs --baseline --prod --upto=104
```

(Stage was baselined with `--baseline --stage`.) Check `--status`: prod columns
should show `✓` up to 104 and `·` for anything newer.

## Steps

1. `node scripts/run-migration.mjs --status` — review the matrix. The migrations
   to ship are those with `✓` on Staging and `·` on a prod instance.
2. Ship: `node scripts/run-migration.mjs --pending --prod`.
   - For each prod instance this applies exactly the files stage has that the
     instance is missing, **in numeric order**, and records each in that
     instance's ledger. It stops that instance at the first failure so nothing
     stacks on a broken migration.
3. Re-run `--status` — every prod column should now match Staging.
4. Report per-instance results. If any instance failed partway, surface the exact
   error and the file it stopped on; fix and re-run (safe — the ledger skips
   already-applied files).

## Rules

- A migration applied to only some prod instances is a production bug on the
  others. `--pending --prod` handles all three; confirm all three succeeded.
- Never `--prune`. Never delete+reinsert on boards with check-ins.
- Only files that stage has already applied are eligible — stage-first is
  enforced by the runner.
