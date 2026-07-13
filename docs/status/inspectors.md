# Inspectors Registry — LEGACY (table deprecated, pages still live)

## Current state

- `/inspectors` list and `/inspectors/new` pages work and are linked in the sidebar
- The underlying `inspectors` **table is deprecated**: since migrations 046/089, `auth.users` is the canonical identity — every `inspector_id` column across the app (routes, company_services, location_checkins, …) holds an **auth user id**, and all FKs to the inspectors table were dropped
- Display names come from `public.users` everywhere in the new code (PostgREST embeds of `inspectors(...)` fail with PGRST200 — this bit us once in production; documented in CLAUDE.md)

## What still reads/writes the legacy table

- The registry pages themselves (list/create/update)
- Live tracking (`current_location`, `last_location_update` columns on inspectors rows)
- Route builder/management inspector pickers
- `company_services.assigned_inspector_id` assignment flows
- AI chat's `list_inspectors` tool

## Deliberate decision on record (2026-06-12)

The app-code rename `inspector_id` → `user_id` (544 occurrences, 76 files) was evaluated and **deferred**: the columns hold correct auth user ids, the rename is cosmetic, and an atomic DB+deploy rename with string-based Supabase queries is riskier than the debt. Revisit only if it actively confuses the team.

## What's left

- The remaining real coupling is **tracking's location columns** and the **create-inspector flow** (which writes a legacy row instead of creating an auth user — admin/users is the correct flow for identities). New inspectors should be created via `/admin/users`; the `/inspectors/new` page should either be removed or repointed
- When the routes/tracking decision lands (see routes.md), most remaining reads of this table go with it
