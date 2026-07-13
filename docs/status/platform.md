# Platform & Infrastructure — ACTIVE (overhauled this month)

## Deployment model (changed July 9)

**One branch (`master`), three Vercel projects, three separate Supabase instances:**

| Domain                | Vercel project         | Supabase          |
| --------------------- | ---------------------- | ----------------- |
| geosafety.routehub.ge | geosafety-routehub-web | Team1             |
| team2.routehub.ge     | routehub-web-2         | Team2 (Frankfurt) |
| team3.routehub.ge     | team3                  | Team3 (free plan) |

Previously three diverged branches with every change cherry-picked ×3 — consolidated after verifying content convergence; old branches preserved as `archive/team2`, `archive/team3` tags. Per-instance config lives exclusively in Vercel env vars. Databases stay separate by design; migrations apply to all three via `node scripts/run-migration.mjs <file>.sql`.

## Shipped this month

- **CI** (GitHub Actions): tsc + full test suite (600 tests) + production build on every PR and master push — previous workflows had never run once (wrong branch names, broken install). Tests verified to run with zero network access
- **Branch protection** on master (no force-push/deletion); PR-based flow documented for incoming developers
- **Migration runner** consolidating the apply-to-all-3 rule into one command
- **Repo hygiene**: 84 stale docs deleted, README rewritten truthfully, CLAUDE.md gained deployment/gotchas/theming sections, onboarding backlog filed as 9 labeled GitHub issues
- **Refactoring pass**: dead code removal, duplicate types merged, Updates components deduplicated (~1,900 duplicate lines), all native selects replaced with the themed Select component
- **Email/auth infra**: Resend SMTP for Supabase auth emails on all three instances; password-reset URLs fixed (Team3 was localhost, Team1 stale domain)
- **Storage**: upload limit raised to 100MB on Team1/Team2 (bucket + global). **Team3 capped at 50MB by its free-plan Supabase org — decision pending** (upgrade ~$25/mo vs. lower the advertised limit there)

## Standing facts

- 6 CSS-variable themes (4 dark, 2 light), no `dark:` variants — theming rules in CLAUDE.md; global base-layer now themes all form controls
- Realtime via Ably (presence, tracking) + Supabase realtime (notifications)
- Old Tokyo Supabase instance still exists as a paid backup of pre-migration Team2 — deletable once Frankfurt confidence is total
- Test suite: 600 unit/integration tests; e2e (Playwright) is issue #6 and the prerequisite for the big-file refactors

## Known debt (tracked, deliberate)

- `inspector_id` naming (holds auth user ids) — rename deferred by decision 2026-06-12
- `database.ts` generated types are stale for newer tables (workspace service's 22 `as any`) — regenerate when convenient
- Oversized components (Sidebar 1,979 lines, VirtualizedBoardTable 1,709) — split after e2e lands
