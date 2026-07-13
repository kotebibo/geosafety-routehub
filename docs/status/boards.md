# Boards System — STABLE

The Monday.com-style boards are the core of the product and its most mature code.

## What exists

- **Table engine**: virtualized rows (TanStack Virtual) for large boards, sticky columns, column resize/reorder/rename, group collapse/rename/color, drag-and-drop items, keyboard navigation, cell-level editing with per-cell editors
- **20+ column types**: text, status (custom options + colors), person, date, date range, number, location, route, company, company address (auto-linked), service type, checkbox, phone, email, files (100MB, previews), updates (comments), checkin (GPS visits), actions
- **Collaboration**: realtime presence + cell-edit indicators via Ably; comments with @mentions, replies, reactions (panel), file attachments; activity log per item
- **Organization**: workspaces → boards → groups → items → subitems; view tabs (table/kanban/calendar/chart/timeline types defined — table is the implemented one); saved filters/sorts; global search (tokenized, wildcard-safe)
- **Data movement**: item transfer between boards with column mapping (in-place UPDATE — item identity and checkin history survive), board import/export, board templates, undo/redo
- **Per-instance reality**: the same logical column has different `column_id` values on each Supabase instance — all code matches by name/type or stores ids in column `config` (documented in CLAUDE.md)

## Recent changes (July)

- Updates panel/modal deduplicated (was ~80% copy-paste, 2,498 → ~570 lines + shared `cells/updates/` module)
- Diverged duplicate type definitions merged into one canonical `src/types/board.ts`
- Checkin column type fully integrated (see checkins.md)

## What's left

- **Kanban/calendar/timeline views** — types and tab UI exist; only table view is implemented
- **Per-column checkin summaries** — a board with two checkin columns shows the same summary in both cells (summary groups by item only; `board_column_id` is already recorded per checkin, so this is a grouping change)
- Oversized files flagged in the code audit: `VirtualizedBoardTable.tsx` (1,709 lines), `Sidebar.tsx` (1,979), `useBoardHandlers.ts` (860, 23 params) — split plans exist, scheduled after e2e coverage lands
- Board XLSX export polish (GitHub issue #9)

## Risks

- Highest-complexity area of the codebase; refactors here need the planned Playwright smoke suite (issue #6) as a safety net first
