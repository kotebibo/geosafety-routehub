---
name: verify
description: Build, run, and drive the RouteHub web app headlessly to verify changes at the browser surface.
---

# Verifying RouteHub (apps/web)

## Launch

```bash
cd apps/web
npx next dev -p 3789   # run_in_background; ~3s to Ready, pages compile on first hit
# wait: curl -s -o /dev/null -w "%{http_code}" http://localhost:3789/auth/login
```

`.env.local` points at a REAL Supabase instance — auth calls from the dev
server hit production data. For flows that would send email or mutate data,
use nonexistent emails (e.g. `*@example.com` — Supabase's `/auth/v1/recover`
returns 200 without sending for unknown users) and never verify with real
board/user data.

## Drive

The Claude-in-Chrome extension shows an error page for `localhost` (no site
permission) — don't burn time on it. Headless Playwright against the user's
installed Chrome works:

```bash
cd <scratchpad> && npm i playwright-core
```

```js
import { chromium } from 'playwright-core'
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
})
```

## Gotchas

- Default UI language is Georgian (`ka`); locale toggle persists in
  localStorage key `routehub-language`. Match text with bilingual regexes:
  `text=/Back to login|შესვლის გვერდზე დაბრუნება/`.
- Auth pages (`/auth/*`) render without Sidebar/Header (they self-hide via
  `pathname.startsWith('/auth/')`). If a sidebar appears on a new page
  unexpectedly, check `src/shared/components/ui/{Sidebar,Header}.tsx`.
- Useful network markers: Supabase auth calls go to
  `*/auth/v1/recover`, `*/auth/v1/verify`, `*/auth/v1/token`.
- Protected pages redirect to `/auth/login?from=...` via client-side
  RouteGuard — an unauthenticated visit still returns HTTP 200.
