---
name: migration-stage
description: Apply database migrations to the STAGE Supabase instance only (never prod), so schema changes can be tested on the test environment. Use after adding a migration file or when stage-db is behind the repo.
---

# /migration-stage — run migrations on stage-db only

Stage is where every migration is tested first. This skill touches the **stage
instance only** — it must never write to a prod instance.

## Steps

1. Confirm `scripts/instances.json` exists (gitignored). If not, tell the user to
   copy `scripts/instances.example.json` and fill in the Management API tokens.
2. See current state (stage column): `node scripts/run-migration.mjs --status`.
3. Apply what stage is missing:
   - All pending: `node scripts/run-migration.mjs --pending --stage`
   - A single file: `node scripts/run-migration.mjs <NNN_name>.sql --stage`
4. The runner records each applied file in stage's `_applied_migrations` ledger.
   Re-run `--status` to confirm the stage column is now `✓` for the new files.
5. Report which migrations were applied (or that stage was already up to date).

## Rules

- **Never** pass `--prod`, `--all`, or a prod `--only=` here. Prod is shipped
  separately, on prod day, via `/migration-prod`.
- Every migration must be **idempotent** (`CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, …)
  so a re-run is always safe.
- If an apply errors, stop, surface the exact error, fix the SQL, and re-run —
  do not move on to later migrations on a broken base.
