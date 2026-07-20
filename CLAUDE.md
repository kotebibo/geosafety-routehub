# RouteHub - Development Standards

This document defines coding standards and patterns for the RouteHub project. All new code must follow these conventions.

## Communication Style

Be direct and honest. No fluff, no excessive praise, no sugar-coating:

- Give honest assessments even if unflattering
- Say "this won't work" or "this is a bad idea" when true
- Skip phrases like "Great question!" or "You're absolutely right!"
- Provide objective technical analysis over validation
- When something is overkill for the current scale, say so
- Recommend skipping unnecessary complexity for MVP

## Deployment & Workflow

**Branch flow: `feature → stage → master`.** `stage` is the shared integration/
test branch (backed by the STAGE Supabase). `master` is the weekly release — the
three prod Vercel projects deploy from it, differing only in env vars (each
points at its own Supabase instance):

| Branch/Domain         | Vercel project         | Supabase          |
| --------------------- | ---------------------- | ----------------- |
| `stage` (test)        | (stage project)        | STAGE             |
| geosafety.routehub.ge | geosafety-routehub-web | Team1             |
| team2.routehub.ge     | routehub-web-2         | Team2 (Frankfurt) |
| team3.routehub.ge     | routehub-web-3         | Team3             |

- **Every feature merges into `stage` first** and is tested there against
  stage-db. Use the **`/merge-stage`** skill — it refreshes stage, renumbers any
  colliding migrations, surfaces conflicts, runs the checks, and applies new
  migrations to stage-db.
- **Once a week, `stage → master`** via the **`/stage-to-master`** skill (merge,
  test, push). Merging to master deploys to all three prod domains.
- **Production is rolled out on a single agreed day**, not on every master merge.
  Prod database migrations ship that day via **`/migration-prod`**.
- Never hardcode anything instance-specific — it belongs in Vercel env vars.
- **Before committing**: `git pull --rebase origin <current-branch>` first —
  others push too; committing on a stale base invites conflicts.
- **Checks (from `apps/web`)**: `node scripts/check-i18n-keys.mjs`,
  `npx tsc --noEmit`, `npx vitest run`, `npx next build`. The `pre-push` hook runs
  the first three; CI (`.github/workflows/ci.yml`) runs all four on every PR and
  on pushes to `stage`/`master`.
- Cron schedules live in the root `vercel.json` (UTC — Georgia is UTC+4).

### Database migrations

The four instances (STAGE + Team1/Team2/Team3) share a schema but hold separate
data. Migrations are **staging-first** and tracked per instance in a
`_applied_migrations` ledger — `scripts/run-migration.mjs` records each file it
applies, so `--status` shows the applied/pending matrix and `--pending` applies
only what an instance is missing. (Requires `scripts/instances.json` — copy
`instances.example.json` and fill in Management API tokens.)

```
node scripts/run-migration.mjs --status                 # applied/pending matrix
node scripts/run-migration.mjs --pending --stage        # /migration-stage
node scripts/run-migration.mjs --pending --prod         # /migration-prod (prod day, owner go-ahead)
node scripts/run-migration.mjs <NNN_name>.sql --stage   # one file → stage
```

- **Stage first, always.** Add the SQL to `supabase/migrations/`, apply to stage
  (`/migration-stage`), test. Prod gets it later via `/migration-prod`, which only
  ships files stage has already applied. A migration on only some prod instances
  is a production bug on the others — `--pending --prod` covers all three.
- **Numbering.** Files are `NNN_name.sql`. If a feature's migration number is
  already taken on `stage`, the file already on stage **wins** and the incoming
  one is renumbered upward to the next free number (handled by `/merge-stage`).
  Never reuse or reorder an applied number.
- **One-time ledger adoption** (already done for STAGE): baseline the instances
  that predate the ledger so old migrations aren't re-run —
  `--baseline --stage` (all repo files) and, on prod day,
  `--baseline --prod --upto=104` before the first `--pending --prod`.
- Every migration must be **idempotent** (`IF [NOT] EXISTS`, `DROP POLICY` before
  `CREATE POLICY`, …). Never `--prune`; never delete+reinsert on boards with
  check-ins. The **`migration-guardian`** agent gives a read-only pending/collision
  analysis without touching anything.

### Monday.com → RouteHub tools (`scripts/monday/`)

Full docs: `scripts/monday/README.md`. Tokens/keys come from
`apps/web/.env.local` by env-var name.

```
node scripts/monday/sync-from-monday.mjs                    # dry-run all jobs in sync-jobs.json
node scripts/monday/sync-from-monday.mjs --job=X --apply    # write; --columns=a,b for subset sync
node scripts/monday/sync-from-monday.mjs --list-boards=<TOKEN_ENV>
node scripts/monday/create-board-from-monday.mjs --token-env=... --monday-board=... \
  --instance=team2 --owner=<email> [--workspace="..."] [--apply]   # new board from Monday
```

- **Sync upserts in place** (items matched via `data.__monday_id`, then
  name+matchColumns) — item ids are stable, so checkin history, updates and
  files survive. The old `scripts/sync-contracts-from-monday.js` /
  `rebuild-*.js` scripts delete+reinsert and must never be used again on
  boards with checkins.
- **Owner's run policy:** every run against a production board needs the
  owner's explicit go-ahead — Claude must not run these itself, not even dry
  runs. Test engine changes only on throwaway boards in a separate workspace.
  Only approved production job: `team2-contracts`. Never schedule `--prune`.

## Multi-Instance Gotchas (these have caused real bugs)

- **Board column IDs differ per instance.** The same logical column has a
  different `column_id` on each instance's boards. Match columns by
  name/type or store the id in column `config` — never hardcode.
- **`inspector_id` columns hold `auth.users` ids** (FKs to the old
  `inspectors` table were dropped). Never use a PostgREST embed like
  `inspectors(full_name)` — it fails with PGRST200. Resolve display names
  from `public.users` (never from `auth.users` — the `authenticated` role
  has no grant there).
- **DB functions with Georgian string literals** were once mangled to `???`
  by an encoding-unsafe copy. If a function silently matches nothing,
  check `prosrc` for `???` and re-apply the migration.
- UI text is Georgian; code, comments, and commit messages are English.

## Theming

There are 6 themes driven by CSS variables on the root element
(`app/globals.css`) — 4 dark, 2 light. There are **no `dark:` variants**.

- Use theme tokens: `bg-bg-primary`, `text-text-secondary`,
  `border-border-light`, etc.
- Never use light-only Tailwind tints (`bg-blue-50`, `text-blue-700`,
  `bg-orange-100`) — they break on dark themes. For colored
  banners/badges use opacity tints of solid colors:
  `bg-orange-500/10 text-orange-500 border-orange-500/30`.
- Form controls inherit themed bg/text from a base-layer rule in
  `globals.css`; utility classes on a specific input still override it.

## Internationalization (i18n)

The app uses `next-intl`, wired up client-side via `src/contexts/LanguageContext.tsx`.
Two locales are supported — `ka` (Georgian, default) and `en` (English) — backed
by `apps/web/messages/ka.json` and `apps/web/messages/en.json`. Missing keys fall
back to the other language rather than rendering a raw key, so a gap is easy to
miss visually — treat both files as required, not optional.

**Any new user-facing string must be added to both `ka.json` and `en.json` and
referenced via `useTranslations()` — never hardcode literal UI text in JSX,**
including for brand-new components, pages, error/toast messages, form labels,
and empty states:

```typescript
// CORRECT
const t = useTranslations()
<h3>{t('settings.language.title')}</h3>

// WRONG - hardcoded literal text, in either language
<h3>მარშრუტები</h3>
<h3>Routes</h3>
```

- Nest new keys under the relevant feature/domain key (matching the existing
  structure in `messages/*.json`, e.g. `settings.*`, `nav.*`, `home.*`) rather
  than adding flat top-level keys.
- Add the key to **both** files in the same commit — a key present in only one
  locale is a bug, not a follow-up task.
- **Before every commit/push** (from `apps/web`), also run
  `node scripts/check-i18n-keys.mjs` (`npm run check-i18n`) — it diffs the key
  sets of `ka.json`/`en.json` and fails if they're out of sync.
- A handful of legacy components still have hardcoded Georgian text instead of
  `t()` calls — don't copy that pattern in new code, and migrate it to `t()` if
  you're already touching that file.

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router pages and API routes
│   └── api/               # API endpoints
├── src/
│   ├── features/          # Feature-based modules (preferred)
│   │   └── {feature}/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/  # Re-exports from root services
│   │       └── index.ts   # Barrel exports
│   ├── services/          # Root-level services (single source of truth)
│   ├── hooks/             # Shared hooks
│   ├── types/             # Shared type definitions
│   ├── lib/               # Utilities and configurations
│   └── shared/            # Shared UI components
```

## Component Patterns

### Function Declaration

Use named function exports (not arrow functions for components):

```typescript
// CORRECT
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  return <div>...</div>
}

// CORRECT (with memo)
export const MyComponent = memo(function MyComponent({ prop1 }: MyComponentProps) {
  return <div>...</div>
})

// AVOID
const MyComponent = ({ prop1 }: Props) => <div>...</div>
export default MyComponent
```

### Props Interface Naming

Always name props interfaces as `{ComponentName}Props`:

```typescript
// CORRECT
interface MyComponentProps {
  title: string
  onSubmit: () => void
}

export function MyComponent({ title, onSubmit }: MyComponentProps) { ... }

// WRONG - generic "Props" name
interface Props {
  title: string
}
```

### Exports

Use **named exports** for all components. Reserve default exports only for Next.js pages:

```typescript
// CORRECT - Named export for components
export function DataTable({ data }: DataTableProps) { ... }

// CORRECT - Default export only for pages (app/ directory)
export default function CompaniesPage() { ... }

// AVOID - Default exports for reusable components
export default function DataTable() { ... }
```

### Component Structure Order

Organize component internals in this order:

```typescript
'use client'  // 1. Directives

import { useState, useEffect } from 'react'  // 2. React imports
import { Button } from '@/shared/components/ui'  // 3. Internal imports
import type { MyType } from '@/types'  // 4. Type imports

interface MyComponentProps { ... }  // 5. Props interface

export function MyComponent({ prop1 }: MyComponentProps) {
  // 6. State declarations
  const [loading, setLoading] = useState(false)

  // 7. Derived state / memos
  const filteredData = useMemo(() => ..., [deps])

  // 8. Effects
  useEffect(() => { ... }, [])

  // 9. Event handlers
  const handleClick = () => { ... }

  // 10. JSX return
  return <div>...</div>
}
```

## Hook Patterns

### Return Type

Always return an object with named properties:

```typescript
// CORRECT
export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  return {
    companies,
    loading,
    error,
    refresh: fetchCompanies,
    deleteCompany,
  }
}

// AVOID - tuple returns (except for simple two-value hooks)
return [data, setData]
```

### Loading & Error State

Use consistent loading/error pattern:

```typescript
export function useData() {
  const [data, setData] = useState<Data[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await service.getData()
      setData(result)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refresh: fetchData }
}
```

## Service Patterns

### Structure

Use object literal pattern with async methods:

```typescript
// CORRECT
export const myService = {
  getAll: async () => {
    const { data, error } = await supabase.from('table').select('*')
    if (error) throw error
    return data
  },

  getById: async (id: string) => {
    const { data, error } = await supabase.from('table').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  create: async (input: CreateInput) => { ... },
  update: async (id: string, updates: UpdateInput) => { ... },
  delete: async (id: string) => { ... },
}

// AVOID - Class-based services
export class MyService { ... }
```

### Error Handling

Services should **throw** errors, not return them:

```typescript
// CORRECT - throw error
const { data, error } = await supabase.from('table').select('*')
if (error) throw error
return data

// WRONG - return error object
return { data, error }
```

### Location

Services live in `src/services/`. Feature-level `services/index.ts` re-exports from root:

```typescript
// src/features/companies/services/index.ts
export { companiesService } from '@/services/companies.service'
```

## API Route Patterns

### Response Format

Use `NextResponse.json()` with consistent structure:

```typescript
// Success response
return NextResponse.json(data)

// Success with message
return NextResponse.json({ success: true, data, message: 'Created successfully' })

// Error response - ALWAYS use this structure
return NextResponse.json(
  { error: 'Error message here', details: optionalValidationErrors },
  { status: 400 }
)
```

### Error Response Structure

```typescript
// Standard error (400, 401, 403, 404, 500)
{ error: string }

// Validation error (400)
{ error: 'Validation failed', details: ZodError['errors'] }

// Auth errors
{ error: 'Authentication required' }  // 401
{ error: 'Admin access required' }    // 403
```

### Validation

Always use Zod for request validation:

```typescript
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createSchema.parse(body)
    // ... use validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    throw error
  }
}
```

### Authentication

Use auth middleware at the start of protected routes:

```typescript
import { requireAuth, requireAdmin, requireAdminOrDispatcher } from '@/middleware/auth'

export async function GET() {
  await requireAuth() // Any authenticated user
  // ...
}

export async function POST() {
  await requireAdmin() // Admin only
  // ...
}

export async function PUT() {
  await requireAdminOrDispatcher() // Admin or dispatcher
  // ...
}
```

## Type Patterns

### Interface vs Type

- Use `interface` for object shapes
- Use `type` for unions, primitives, and mapped types

```typescript
// CORRECT - interface for objects
interface User {
  id: string
  name: string
  email: string
}

// CORRECT - type for unions
type Status = 'active' | 'inactive' | 'pending'
type BoardType = 'routes' | 'companies' | 'inspectors'

// CORRECT - type for complex types
type UserWithPosts = User & { posts: Post[] }
```

### Naming Conventions

- No `I` prefix for interfaces
- Use `Props` suffix for component props
- Use descriptive names

```typescript
// CORRECT
interface User { ... }
interface BoardItem { ... }
interface DataTableProps { ... }

// WRONG
interface IUser { ... }
interface IBoardItem { ... }
interface Props { ... }  // Too generic
```

### Location

- Shared types: `src/types/{domain}.ts`
- Component-specific props: Define in component file
- Feature-specific types: `src/features/{feature}/types/`

## Import Patterns

### Path Aliases

Always use `@/` alias for imports:

```typescript
// CORRECT
import { Button } from '@/shared/components/ui'
import { companiesService } from '@/services/companies.service'
import type { Company } from '@/types/company'

// AVOID - relative imports for non-local files
import { Button } from '../../../shared/components/ui'
```

### Import Order

1. React/Next.js imports
2. Third-party libraries
3. Internal absolute imports (`@/`)
4. Relative imports (`./`)
5. Type imports (with `type` keyword)

```typescript
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { format } from 'date-fns'
import { z } from 'zod'

import { Button } from '@/shared/components/ui'
import { companiesService } from '@/services/companies.service'

import { LocalHelper } from './helpers'

import type { Company } from '@/types/company'
```

## Barrel Exports

### Feature Index Files

Each feature should have an `index.ts` that exports public API:

```typescript
// src/features/companies/index.ts
export { CompanyList, CompanyDetail, CompanyForm } from './components'
export { useCompanies, useCompanyDetail } from './hooks'
export { companiesService } from './services'
export type { Company, CompanyInput } from './types'
```

### Component Index Files

```typescript
// src/features/companies/components/index.ts
export { CompanyList } from './CompanyList'
export { CompanyDetail } from './CompanyDetail'
export { CompanyForm } from './CompanyForm'
```

## Testing

### Test Location

Tests live in `src/__tests__/` with structure mirroring source:

```
src/__tests__/
├── components/     # Component tests
├── hooks/          # Hook tests
├── lib/           # Utility tests
├── integration/   # API integration tests
└── unit/          # Unit tests
```

### Naming

Test files use `.test.ts` or `.test.tsx` suffix.

## Git Commit Messages

Follow conventional commits:

```
feat: add company locations support
fix: resolve date picker timezone issue
refactor: consolidate service layer
test: add board component tests
docs: update API documentation
```
