# Announcements, Notifications & AI Chat

## Announcements / News — STABLE

- Admin-created announcements with priorities (normal/important/urgent), publish flag, per-user read tracking
- On publish: in-app notification fanout + email to all active users (Resend, Georgian templates)
- `/news` page with cards, detail modal, create/delete
- No gaps found

## Notifications — PARTIAL (infra complete, half the triggers missing)

Solid foundation: `notifications` table, RPCs (create/mark-read/unread-count), realtime updates via Supabase channel, `NotificationBell` dropdown with type icons and deep links, Georgian email templates for every type, `/api/notifications/send-email` (hardened this month: proper 401s, tolerant of missing payload fields).

**Per-type reality:**

| Type               | Created by                     | In-app | Email | Status                                                                                                                                   |
| ------------------ | ------------------------------ | ------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| board_shared       | DB trigger on board_members    | ✓      | ✓     | Done                                                                                                                                     |
| announcement_new   | announcements API              | ✓      | ✓     | Done                                                                                                                                     |
| assignment_changed | DB trigger on company_services | ✓      | —     | Done (no email by design)                                                                                                                |
| item_mention       | comment flow (client-side)     | ✓      | ✓     | Done — verified live on all instances this month                                                                                         |
| item_comment       | —                              | —      | —     | **No trigger exists**                                                                                                                    |
| item_overdue       | —                              | —      | —     | **No trigger exists** — natural fit: extend the nightly cron to notify on 35-day overdue checkin items (pairs with the overdue red flag) |

## AI Chat — STABLE

- `/chat`: streaming Claude chat (Haiku by default, model configurable via `CHATBOT_MODEL` env), admin/dispatcher-gated, Georgian + English
- **10 data tools**: company search/list, board item counts/lists, workspace overview, bank transactions, payment stats, inspectors list, specialist workload, service types — with collapsible tool-call visualization in the UI
- Note: `get_payment_stats` tool is stubbed — either finish or remove from the tool list
