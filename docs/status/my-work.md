# My Work — STABLE

Personal cross-board task list at `/my-work`.

## What exists

- Aggregates every board item assigned to the current user (person columns) across all boards via the `get_my_work_items` RPC
- Grouped by urgency: overdue / today / this week / next week / later / no date
- Inline status and due-date editing with optimistic updates (TanStack Query mutations)
- Shows board/group context (icon, color, names) per item

## Gaps

None blocking. Small ideas if ever needed: include subitems; include items where the user is @mentioned but not assigned; surface checkin-overdue items here for inspectors.
