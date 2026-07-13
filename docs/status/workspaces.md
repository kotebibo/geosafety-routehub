# Workspaces — STABLE

Multi-workspace organization layer above boards.

## What exists

- Workspace CRUD with color customization; `/workspaces` list and per-workspace board view
- **Members**: add/remove, five-tier roles (owner/admin/editor/member/guest) with a typed permission matrix (canEdit, canDelete, canManageMembers, …)
- **Settings**: four tabs — general (rename with guard), members, boards (archive/restore), danger zone (delete with confirmation)
- Sidebar workspace switcher with board drag-reorder, favorites, search

## Gaps (cosmetic)

- "Duplicate workspace" opens the create modal without pre-filling name/color
- No invite-by-link (members are added directly by user lookup) — fine for an internal tool
- `workspace.service.ts` carries 22 `as any` casts — likely fixed by regenerating `database.ts` types (workspace tables postdate the last generation); tracked from the July code audit
