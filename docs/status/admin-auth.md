# Admin, Roles & Auth — STABLE (with one enforcement caveat)

## Admin pages

| Page                              | State                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| /admin/users                      | Complete CRUD: create (with role + auth user), edit inline, activate/deactivate               |
| /admin/roles                      | Complete: custom roles, color, expandable permissions grid with categories                    |
| /admin/service-types              | Complete CRUD (redirects in single-service mode)                                              |
| /admin/checkins                   | Working: history, filters (dates), admin delete; inspector/board filter UI pending (issue #4) |
| /admin/assignments                | Working read + bulk assign; the thinnest of the admin pages                                   |
| /admin/setup-db, /admin/setup-pdp | One-time setup wizards; keep but irrelevant day-to-day                                        |

## Auth & permissions

- **Flows**: email/password login, password reset (fixed this month — Team3 was generating localhost links and Team1 pointed at a stale domain; site_url + redirect allow-lists + Resend SMTP now correct on all three instances), session persistence + refresh, role refresh on change
- **Model**: system roles admin/dispatcher/officer + custom roles; permissions as `resource:action` strings with wildcard support (`routes:*`, admin gets `*`); `hasPermission()` in AuthContext; `FeatureGate` + `RouteGuard` for UI gating
- **RLS**: policies on core tables (checkins policies verified across all three instances this month; security audit migration 087 applied everywhere)

## The caveat worth reporting

**API-route authorization is coarser than the permission model.** Routes check `requireAuth`/`requireAdmin`/role equality — none of them evaluate the granular `role_permissions` strings. So a custom role's permission checkboxes gate what the UI _shows_, but not what the API _allows_ beyond the admin/dispatcher/officer split. Fine while roles map to the three system roles; becomes a real gap the day a custom role is expected to have less power than its base role server-side. Recommendation: add a `requirePermission('x:y')` middleware helper when custom roles start being used in anger.

## Gaps

- No admin action audit log
- No MFA (acceptable for current scale)
- Roles page has no reverse lookup ("which users have this role") — one query away
