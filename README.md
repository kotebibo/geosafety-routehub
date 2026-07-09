# GeoSafety RouteHub

Field-operations platform for GeoSafety: Monday.com-style boards, GPS-verified
site visits (checkins), bank-payment reconciliation, document generation, and
inspector route management. UI is Georgian; code is English.

## Tech Stack

Next.js 14 (App Router) · TypeScript · Supabase (Postgres, Auth, Storage, RLS)
· TanStack Query · Tailwind CSS · Zod · Ably (realtime presence) · Vitest ·
Turborepo · Vercel

## Getting Started

```bash
git clone https://github.com/kotebibo/geosafety-routehub.git
cd geosafety-routehub
npm install

# apps/web/.env.local — ask a teammate for values:
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_KEY, NEXT_PUBLIC_ABLY_API_KEY, RESEND_API_KEY

npm run dev            # http://localhost:3000
```

## Workflow

One branch: **`master`**. Feature branches → PR into master. CI runs
TypeScript, tests, and a production build on every PR — the same three
checks you run locally before pushing:

```bash
cd apps/web
npx tsc --noEmit && npx vitest run && npx next build
```

Coding standards, deployment model, and hard-won gotchas live in
[CLAUDE.md](CLAUDE.md) — read it before your first PR.

## Deployments

Three Vercel projects deploy `master`, differing only in env vars — each
serves a separate team with its own Supabase instance:

| Domain                | Vercel project         | Supabase instance |
| --------------------- | ---------------------- | ----------------- |
| geosafety.routehub.ge | geosafety-routehub-web | Team1             |
| team2.routehub.ge     | routehub-web-2         | Team2 (Frankfurt) |
| team3.routehub.ge     | routehub-web-3         | Team3             |

## Database Migrations

SQL files live in `supabase/migrations/`. Every migration must be applied to
**all three** instances:

```bash
node scripts/run-migration.mjs <migration-file>.sql
```

Requires `scripts/instances.json` (gitignored) — copy
`scripts/instances.example.json` and fill in Supabase Management API tokens.

## Structure

```
apps/web/                  # the application (see CLAUDE.md for src layout)
packages/route-optimizer/  # route optimization algorithms (used by routes API)
supabase/migrations/       # numbered SQL migrations
scripts/                   # operational one-offs + migration runner
docs/                      # setup guides and architecture notes
```
