---
name: stage-to-master
description: Promote the tested `stage` branch to `master` (the weekly release) — merge stage into master, resolve conflicts deliberately, run the full check suite, then push. Does not touch prod databases. Use for the weekly stage→master release.
---

# /stage-to-master — weekly release of stage into master

Once a week the tested `stage` branch is promoted to `master`. Merging to
`master` is what the three prod Vercel projects deploy from, so treat it as a
release. This skill handles **code only** — prod database migrations ship
separately via `/migration-prod` on prod day.

Stop and ask the human before conflict resolution and before the final push.

## 1. Preflight

- Clean working tree. `git fetch origin`.
- Show what's shipping: `git log --oneline origin/master..origin/stage` and
  `git diff --name-only origin/master...origin/stage`. Summarize the week's
  changes and explicitly list any new `supabase/migrations/*.sql` (these will
  need `/migration-prod` on prod day).

## 2. Merge stage → master

- `git checkout master && git pull --rebase origin master`
- `git merge --no-ff origin/stage`
- On conflicts: **do not auto-resolve.** Show each conflict, explain both sides,
  propose a resolution, get the user's confirmation. `master` should be a
  fast-forward-ish superset of stage most weeks; large conflicts mean master got
  direct commits — investigate before proceeding.

## 3. Verify (all must pass, from `apps/web`)

- `node scripts/check-i18n-keys.mjs`
- `npx tsc --noEmit`
- `npx vitest run`
- `npx next build`
  Do not push a red build to master — it deploys to all three prod domains.

## 4. Push

- Confirm with the user, then `git push origin master`.

## 5. Hand-off

Remind the user of the remaining prod-day steps (do NOT do them here):

- `/migration-prod` to ship this release's migrations to Team1/Team2/Team3.
- Production is rolled out on the agreed single day, not automatically.

Report: commits promoted, conflicts resolved, check results, migrations awaiting
`/migration-prod`.
