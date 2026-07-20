---
name: merge-stage
description: Merge the current feature branch into the shared `stage` test branch — refresh stage first, renumber any colliding migrations, surface conflicts with proposed resolutions, run checks, then apply new migrations to stage-db only. Use when a feature is ready to be integrated and tested on stage.
---

# /merge-stage — integrate a feature branch into `stage`

`stage` is the shared integration/test branch. Every feature lands here first and
is tested against **stage-db only**. Never touch master or prod here.

Work through these steps **in order**. Stop and ask the human before any
destructive step (conflict resolution, force-anything, push).

## 1. Preflight

- `git status` — the working tree must be clean. If not, ask the user to commit
  or stash first. Note the current branch — this is the FEATURE branch.
- `git fetch origin`

## 2. Refresh stage & see what's incoming

- Show what the feature adds: `git log --oneline origin/stage..HEAD` and
  `git diff --name-only origin/stage...HEAD`.
- Call it out plainly: how many commits, which areas, and whether any
  `supabase/migrations/*.sql` files are added.

## 3. Migration numbering (do this BEFORE merging)

Delegate the analysis to the **migration-guardian** agent, or do it yourself:

- List migration files the feature adds vs those already on
  `origin/stage` (`git ls-tree -r --name-only origin/stage -- supabase/migrations`).
- For every new file whose numeric prefix (`NNN_`) already exists on stage:
  the file **already on stage wins**; rename the feature's colliding file to the
  next free number (`git mv 108_x.sql 109_x.sql`), fix any reference to its name,
  and commit on the feature branch. Renumber upward, never reuse a taken number.
- If the same filename was added on both sides (add/add), treat it the same way:
  the stage copy stays, the feature's becomes the next number.

## 4. Merge into stage

- `git checkout stage && git pull --rebase origin stage`
- `git merge --no-ff <feature-branch>`
- On conflicts: **do not auto-resolve.** Show each conflicting hunk, explain what
  each side changed, propose a resolution, and let the user confirm. Migration
  files should never truly conflict after step 3 — if they do, stop and re-check
  numbering.

## 5. Verify (all must pass, from `apps/web`)

- `node scripts/check-i18n-keys.mjs`
- `npx tsc --noEmit`
- `npx vitest run`
- `npx next build`
  If anything fails, fix it on stage before pushing.

## 6. Apply new migrations to stage-db

- Run `/migration-stage` (or `node scripts/run-migration.mjs --pending --stage`).
  This applies only what stage-db is missing and records it in the ledger.

## 7. Push

- Confirm with the user, then `git push origin stage`.

Report back: commits merged, any renumbered migrations, check results, and which
migrations were applied to stage-db.
