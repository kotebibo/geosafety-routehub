# Monday.com → RouteHub board tools

Generic, **non-destructive** tooling for pulling Monday boards into RouteHub.
Modeled on `scripts/run-migration.mjs`: small engines, declarative config.

| Script                         | Purpose                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `sync-from-monday.mjs`         | Sync an existing RouteHub board (full board or a subset of columns) from its Monday counterpart. Upserts in place. |
| `create-board-from-monday.mjs` | Create a brand-new RouteHub board (columns, groups, items) from a Monday board, ready for ongoing sync.            |
| `lib.mjs`                      | Shared helpers (env, Monday API, type/value mapping).                                                              |
| `sync-jobs.json`               | Declarative sync jobs — the only boards the sync can touch.                                                        |

Tokens and Supabase service keys are read from `apps/web/.env.local` by
env-var **name** (nothing secret lives in `sync-jobs.json`, which is checked in).

## Run policy (owner's decision, 2026-07-14)

- **Every run against a production board needs the owner's go-ahead** —
  including dry runs by AI agents. Do not add sync jobs for new production
  boards without explicit sign-off.
- Test engine changes against a **throwaway board in a separate workspace**
  (on both Monday and RouteHub) — never against a production board.
- The only production board currently approved for syncing is the Team2
  ხელშეკრულებები (contracts) board (`team2-contracts` job).
- Keep `--prune` out of unattended/scheduled runs.

## Syncing

```
node scripts/monday/sync-from-monday.mjs                      # DRY RUN all enabled jobs
node scripts/monday/sync-from-monday.mjs --job=team2-contracts
node scripts/monday/sync-from-monday.mjs --apply              # actually write
node scripts/monday/sync-from-monday.mjs --apply --prune      # also soft-delete items gone from Monday
node scripts/monday/sync-from-monday.mjs --job=X --columns=color__1,date__1   # only these columns
node scripts/monday/sync-from-monday.mjs --list-boards=MONDAY_API_TOKEN_TEAM2_CONTRACTS
```

### Why not the old import scripts?

The old `sync-contracts-from-monday.js` / `rebuild-*.js` scripts delete every
item and re-insert. Board item ids change, which now **destroys**:

- checkin history (`location_checkins.board_item_id` → `ON DELETE SET NULL`)
- item updates/comments and file attachments
- any external reference to an item id (payment matching, etc.)

This engine upserts in place — item ids are stable across syncs.

### How matching works

1. `data.__monday_id` — stamped into item data on the first `--apply`; exact
   match forever after (survives renames on either side).
2. Composite key: item name + values of the job's `matchColumns` (for
   contracts: tax id + dates + amount). When N identical-keyed Monday items
   face exactly N free local candidates, they're paired in order.
3. Unique exact name.

Truly ambiguous matches are **skipped and reported**, never guessed.

### What a sync will never touch

- Data keys that aren't synced Monday columns: locally computed values
  (`saqmianoba`), checkin stage columns, columns added in RouteHub.
- Keys listed in `protectedKeys`.
- **File columns** — Monday asset URLs are auth-walled and would clobber
  files uploaded in RouteHub. (Also skipped: subitems, buttons.)
- A cell Monday has empty but RouteHub has filled (won't blank local data).
- Existing columns/groups — missing ones are created, none deleted/renamed.
- Items with no `__monday_id` that don't match anything (RouteHub-only items).
- Item positions.

Deletes are opt-in: without `--prune`, items gone from Monday are only
reported. `--prune` soft-deletes (sets `deleted_at`) and only ever touches
items that carry a `__monday_id` stamp.

### Column-subset sync

A job with a `"columns": ["color__1", "date__1"]` array (or the `--columns=`
CLI override) reads/writes only those Monday column ids. In subset mode the
sync also does NOT: insert new items (unless `"insertNew": true`), rename
items, move items between groups, create groups, or prune. It is purely
"refresh these columns on items that already exist".

### Adding a job

Add an object to `sync-jobs.json` (needs owner sign-off for production boards):

```jsonc
{
  "name": "team2-something",
  "monday": { "tokenEnv": "MONDAY_API_TOKEN_TEAM2_CONTRACTS", "boardId": "123456789" },
  "supabase": {
    "urlEnv": "NEXT_PUBLIC_SUPABASE_URL_TEAM2", // or no-suffix (team1) / _TEAM3
    "keyEnv": "SUPABASE_SERVICE_ROLE_KEY_TEAM2", // team1 uses SUPABASE_SERVICE_KEY
    "boardId": "<board uuid from /boards/<uuid>>",
  },
  "matchColumns": ["text__1"], // optional: data keys that identify an item besides name
  "columns": [], // optional: subset sync — only these Monday column ids
  "insertNew": false, // optional: allow inserts in subset mode
  "protectedKeys": [], // optional: data keys sync must never write
  "disabled": false, // optional: skip unless --job= names it
}
```

Find the Monday board id with `--list-boards=<TOKEN_ENV>`.

**Gotcha (from CLAUDE.md):** board column ids differ per Supabase instance.
A job is one Monday board → one Supabase board on ONE instance. Never reuse a
`boardId` or assume column ids across instances.

Status columns: on Monday-imported boards the option `key` equals the label
verbatim — the tools keep that convention. Option sets are taken from
Monday's column settings (`settings_str`): ALL defined options, in Monday's
order, with Monday's own colors (hex reverse-mapped to the color names
StatusCell.tsx uses). Sync only ADDS missing options — options that already
exist in RouteHub keep their local color/label untouched.

## Creating a new board from Monday

```
node scripts/monday/create-board-from-monday.mjs \
  --token-env=MONDAY_API_TOKEN_TEAM2_CONTRACTS \
  --monday-board=1234567890 \
  --instance=team2 \
  --owner=someone@geosafety.ge \
  --workspace="სამუშაო სივრცე" \
  --apply
```

Dry run by default (prints the full plan: columns with mapped types, status
options, groups, item count). `--apply` creates the board and prints a
ready-to-paste `sync-jobs.json` job so the new board stays synced. Refuses to
run if a board with the same name already exists on the instance.

- `--owner` must be an existing user's email on that instance (board owner).
- `--workspace` matches by exact name; omit to create outside a workspace.
- `--name="..."` overrides the board name (default: Monday board name).
- `--instance=team1` caveat: `.env.local`'s `NEXT_PUBLIC_SUPABASE_URL` is
  currently pointed at Team2 Frankfurt "temporarily" — verify before use.

## Workflow

1. Dry run, read the report.
2. Get sign-off, run with `--apply`. The first apply on an existing board
   shows many `~ __monday_id` updates — that's one-time stamping, expected.
3. Re-run the dry run: it must report everything unchanged (idempotence).
4. For recurring automation, schedule the sync command (Task Scheduler /
   weekly manual run). Never schedule `--prune`.
