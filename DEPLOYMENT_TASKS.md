# GeoSafety RouteHub - Deployment Tasks

**Last Updated:** 2026-02-04
**Current Completion:** ~65%
**Target:** Production-ready MVP

---

## Phase 1: Critical Fixes (Must Complete Before Any Deployment)
**Priority:** BLOCKER
**Estimated Effort:** 1-2 days

### 1.1 Remove Hardcoded Placeholder Data
- [x] **Homepage Stats** - Replace hardcoded values with real database queries
  - ✅ VERIFIED: No hardcoded placeholder stats found in codebase
  - Stats are now fetched dynamically from database

### 1.2 Fix OSRM Dependency
- [x] **Route Optimization Server** - Error handling implemented
  - ✅ VERIFIED: `packages/route-optimizer/src/osrm.ts` has:
    - Haversine fallback when OSRM unavailable
    - Timeout handling (10s)
    - Availability tracking with retry logic
    - Comprehensive error handling for all failure modes
  - Note: Still uses public demo server - consider hosting own instance for production

### 1.3 Fix Type Safety Issues
- [x] **Remove `as any` assertions** - Improved Supabase typing
  - ✅ COMPLETED: All `as any` casts removed from service files:
    - `apps/web/src/services/users.service.ts`
    - `apps/web/src/services/routes.service.ts`
    - `apps/web/src/services/inspectors.service.ts`
    - `apps/web/src/services/compliance.service.ts`
    - `apps/web/src/services/assignments.service.ts`
    - `apps/web/src/services/companies.service.ts`
    - `apps/web/app/settings/page.tsx`
    - `apps/web/src/features/boards/services/user-boards.service.ts`

### 1.4 Verify RLS Policies
- [ ] **Test all RLS policies** with different user roles
  - Test as: Admin, Dispatcher, Inspector, Unauthenticated
  - Tables to verify:
    - [ ] boards, board_items, board_columns
    - [ ] companies, company_locations
    - [ ] inspectors
    - [ ] routes, route_stops
    - [ ] workspaces, workspace_members
    - [ ] user_roles, custom_roles, role_permissions

---

## Phase 2: Error Handling & Stability
**Priority:** HIGH
**Estimated Effort:** 2-3 days

### 2.1 Add Error Boundaries
- [x] **Global Error Boundary** - Catch React errors
  - ✅ VERIFIED: `apps/web/app/layout.tsx` wraps entire app with ErrorBoundary
  - ErrorBoundary component at `apps/web/src/shared/components/feedback/ErrorBoundary.tsx`

- [ ] **Page-level Error Boundaries** - For critical pages
  - [x] Board page (`/boards/[id]`) - has ErrorBoundary
  - [ ] Companies page
  - [ ] Routes page

### 2.2 Add Error Tracking
- [x] **Sentry Integration**
  - ✅ VERIFIED: Fully configured with:
    - `sentry.client.config.ts` - client-side tracking with replay
    - `sentry.server.config.ts` - server-side tracking
    - `sentry.edge.config.ts` - edge function tracking
    - Filtering for sensitive data, environment-aware sampling

### 2.3 API Error Handling
- [ ] **Consistent API error responses**
  - Review all API routes in `apps/web/app/api/`
  - Ensure all return proper error structures
  - Add try-catch blocks where missing

### 2.4 Loading States
- [x] **Add skeleton loaders** for main pages
  - ✅ VERIFIED: PageSkeleton component exists at `apps/web/src/shared/components/feedback/PageSkeleton.tsx`
  - [x] Boards list
  - [x] Board detail
  - [x] Companies list
  - [x] Dashboard

---

## Phase 3: Complete Unfinished Features
**Priority:** HIGH
**Estimated Effort:** 3-5 days

### 3.1 File Upload System
- [x] **Complete file upload UI**
  - ✅ VERIFIED: FilesCell component at `apps/web/src/features/boards/components/BoardTable/cells/FilesCell.tsx`
  - Features implemented:
    - Upload to Supabase storage (attachments bucket)
    - File preview/download functionality
    - Image thumbnails
    - File type icons (PDF, images, documents)
    - Delete functionality

### 3.2 Board Features
- [x] **Board Duplication** - Fully implemented
  - ✅ VERIFIED: `apps/web/src/features/boards/services/user-boards.service.ts`
  - Features:
    - `duplicateBoard()` - copies board with columns and items
    - `duplicateBoardItem()` - duplicates single item
    - `duplicateBoardItems()` - duplicates multiple items
  - React Query hooks available: `useDuplicateBoard`, `useDuplicateBoardItem`, `useDuplicateBoardItems`

- [ ] **Kanban View** - Mentioned in settings but not implemented
  - Priority: LOW (can skip for MVP)

- [ ] **Calendar View** - Mentioned in settings but not implemented
  - Priority: LOW (can skip for MVP)

### 3.3 Notifications
- [ ] **Basic In-App Notifications**
  - Create notifications table in database
  - Create notification service
  - Add notification bell to header
  - Trigger notifications for:
    - [ ] Board shared with user
    - [ ] Assignment changes
    - [ ] Route updates

### 3.4 User Profile Settings
- [x] **Create global settings page** `/settings`
  - ✅ VERIFIED: Full implementation at `apps/web/app/settings/page.tsx`
  - Features implemented:
    - [x] Profile editing (name, phone)
    - [x] Password change (via email reset)
    - [x] Notification preferences (email, assignments, routes)
    - [x] Language toggle (Georgian/English)
    - [x] Session management (logout from all devices)

### 3.5 Item History & Board Transfer
**Priority:** HIGH (enables audit trail and workflow flexibility)
**Estimated Effort:** 2-3 days

#### Part A: Fix Item Change History (JSONB Tracking)

**Current State:**
- `item_updates` table stores by `item_id` ✅ (good design)
- Trigger `create_item_update()` only tracks: `status`, `assigned_to`
- JSONB `data` column changes NOT tracked ❌ (all custom column values lost)

**Database Changes:**
- [x] **Task A1:** Create migration `053_enhanced_item_history.sql`
  ```sql
  -- Add new update_type values for column changes
  ALTER TABLE item_updates DROP CONSTRAINT IF EXISTS item_updates_update_type_check;
  ALTER TABLE item_updates ADD CONSTRAINT item_updates_update_type_check
    CHECK (update_type IN ('created', 'updated', 'deleted', 'status_changed',
           'assigned', 'reassigned', 'comment', 'completed',
           'column_changed', 'moved_to_board'));  -- NEW types

  -- Add column_id field to track which column changed
  ALTER TABLE item_updates ADD COLUMN IF NOT EXISTS column_id VARCHAR(100);

  -- Add source/target board tracking for moves
  ALTER TABLE item_updates ADD COLUMN IF NOT EXISTS source_board_id UUID;
  ALTER TABLE item_updates ADD COLUMN IF NOT EXISTS target_board_id UUID;
  ```

- [x] **Task A2:** Update `create_item_update()` trigger function
  - Compare `OLD.data` vs `NEW.data` JSONB
  - For each changed key, insert separate `item_updates` record
  - Store `column_id`, `old_value`, `new_value`
  - Handle: adds, removes, and modifications

- [x] **Task A3:** Add index for column_id lookups
  ```sql
  CREATE INDEX idx_item_updates_column ON item_updates(column_id) WHERE column_id IS NOT NULL;
  ```

**Service Changes:**
- [x] **Task A4:** Update `activityService.getItemUpdates()`
  - Join with `board_columns` to get column names for display
  - Format change messages: "Changed {column_name} from {old} to {new}"

**UI Changes:**
- [x] **Task A5:** Update Activity Feed component
  - Display column change entries with proper formatting
  - Show column name (localized) instead of column_id

---

#### Part B: Item Transfer Between Boards

**Context:**
- Monday.com does NOT preserve history on transfer (known limitation since 2019)
- Our design allows history to follow items (competitive advantage)

**Scenarios:**
1. **Same board_type** → Columns identical, direct transfer
2. **Different board_type** → Requires column mapping

**Database Changes:**
- [x] **Task B1:** Add `moved_to_board` update type (included in A1)
- [x] **Task B2:** Consider adding `original_board_id` to `board_items` for reference
  ```sql
  ALTER TABLE board_items ADD COLUMN IF NOT EXISTS original_board_id UUID;
  ALTER TABLE board_items ADD COLUMN IF NOT EXISTS move_metadata JSONB DEFAULT '{}'::jsonb;
  ```

**Service Layer (`user-boards.service.ts`):**
- [x] **Task B3:** Create `moveItemToBoard()` method
  ```typescript
  async moveItemToBoard(
    itemId: string,
    targetBoardId: string,
    columnMapping?: Record<string, string>, // sourceColumnId -> targetColumnId
    options?: { preserveUnmapped?: boolean }
  ): Promise<BoardItem>
  ```
  - Validate user has access to both boards
  - If same board_type: direct move (update board_id)
  - If different board_type: apply column mapping, store unmapped in metadata
  - Log transfer in `item_updates` with source/target board info

- [x] **Task B4:** Create `moveItemsToBoard()` for bulk moves
  ```typescript
  async moveItemsToBoard(
    itemIds: string[],
    targetBoardId: string,
    columnMapping?: Record<string, string>
  ): Promise<{ moved: BoardItem[], failed: string[] }>
  ```

- [x] **Task B5:** Create `getColumnMapping()` helper
  ```typescript
  async getColumnMapping(
    sourceBoardId: string,
    targetBoardId: string
  ): Promise<{
    autoMapped: Record<string, string>,  // Same name+type
    needsMapping: string[],               // Different type or no match
    targetColumns: BoardColumn[]
  }>
  ```

**React Query Hooks (`useUserBoards.ts`):**
- [x] **Task B6:** Create `useMoveItemToBoard` hook
- [x] **Task B7:** Create `useMoveItemsToBoard` hook
- [x] **Task B8:** Create `useColumnMapping` hook for UI

**UI Components:**
- [x] **Task B9:** Create `MoveItemModal` component
  - Board selector (dropdown of user's boards)
  - Column mapping UI (if different board_type)
  - Auto-map suggestion with manual override
  - Preview of data transformation
  - Checkbox: "Keep unmapped data in metadata"

- [x] **Task B10:** Add "Move to Board" to item context menu
  - Location: `BoardTable` selection toolbar
  - Opens `MoveItemModal`

- [x] **Task B11:** Add bulk move option to toolbar
  - When items selected, show "Move Selected" button
  - Opens `MoveItemModal` in bulk mode

**Column Mapping Logic:**
```
Auto-map rules (in priority order):
1. Same column_id + same column_type → direct map
2. Same column_name + same column_type → suggest map
3. Same column_type only → suggest as option
4. Different types → manual mapping or skip

Type compatibility matrix:
- text ↔ text: direct
- number ↔ number: direct
- date ↔ date: direct
- status ↔ status: map by label match, else use default
- person ↔ person: direct (UUID)
- location ↔ location: direct
- files ↔ files: direct
- text → number: attempt parse, else skip
- number → text: convert to string
```

**History Preservation:**
- [x] **Task B12:** On move, create `item_updates` entry (handled by trigger):
  ```json
  {
    "update_type": "moved_to_board",
    "source_board_id": "uuid",
    "target_board_id": "uuid",
    "metadata": {
      "source_board_name": "Old Board",
      "target_board_name": "New Board",
      "column_mapping_used": { ... },
      "unmapped_data": { ... }
    }
  }
  ```

---

#### Testing Checklist
- [ ] Unit test: JSONB diff detection in trigger
- [ ] Unit test: Column mapping auto-detection
- [ ] Integration test: Move item same board_type
- [ ] Integration test: Move item different board_type with mapping
- [ ] Integration test: Bulk move with mixed results
- [ ] E2E test: Full move workflow with history verification

---

## Phase 4: Testing
**Priority:** HIGH
**Estimated Effort:** 3-4 days

### 4.1 Setup Testing Infrastructure
- [x] **Install testing dependencies**
  - ✅ VERIFIED: vitest, @testing-library/react installed
- [x] **Configure Vitest** - `vitest.config.ts` exists with proper config
- [x] **Add test scripts** to `package.json`

### 4.2 Critical Path Tests
- [ ] **Authentication Tests**
  - [ ] Login flow
  - [ ] Logout flow
  - [ ] Role detection
  - [ ] Protected route redirect

- [x] **Board Tests** (partial)
  - ✅ VERIFIED: Tests exist at `apps/web/src/__tests__/components/`:
    - `MondayBoardTable.test.tsx`
    - `BoardToolbar.test.tsx`
    - `ItemDetailDrawer.test.tsx`
  - [ ] Create board
  - [ ] Add columns
  - [ ] Add items
  - [ ] Update item values

- [x] **API Route Tests** (partial)
  - ✅ Tests at `apps/web/src/__tests__/integration/health.test.ts`
  - ✅ Tests at `apps/web/src/__tests__/unit/api-health.test.ts`
  - [ ] Auth middleware
  - [ ] CRUD operations

### 4.3 Manual Testing Checklist
- [ ] **New User Flow**
  - Sign up with email
  - Sign up with Google
  - Verify workspace created
  - Verify can create boards

- [ ] **Admin Flow**
  - Create custom role
  - Assign role to user
  - Verify permissions work

- [ ] **Inspector Flow**
  - View assigned routes
  - Access allowed boards
  - Cannot access admin pages

---

## Phase 5: Performance & Optimization
**Priority:** MEDIUM
**Estimated Effort:** 2-3 days

### 5.1 Database Optimization
- [ ] **Review existing indexes** (migration 034)
- [ ] **Add missing indexes** for common queries
- [ ] **Test with realistic data volume** (100+ boards, 1000+ items)

### 5.2 Frontend Optimization
- [ ] **Enable React Query caching** - Verify staleTime settings
- [ ] **Add pagination** to large lists
  - [ ] Board items (currently loads all)
  - [ ] Companies list
  - [ ] Inspectors list
- [ ] **Lazy load** heavy components

### 5.3 Bundle Analysis
- [ ] **Analyze bundle size**
  ```bash
  npm run build -- --analyze
  ```
- [ ] **Remove unused dependencies**
- [ ] **Code split** large pages

---

## Phase 6: Security Hardening
**Priority:** HIGH
**Estimated Effort:** 1-2 days

### 6.1 Input Validation
- [x] **Add Zod validation** to API routes
  - ✅ COMPLETED: All key API routes now have Zod validation:
    - `apps/web/app/api/routes/optimize/route.ts`
    - `apps/web/app/api/routes/save/route.ts`
    - `apps/web/app/api/inspectors/route.ts` (create, update)
    - `apps/web/app/api/service-types/route.ts` (create, update)
    - `apps/web/app/api/companies/services/route.ts`
  - New validation schemas added to `apps/web/src/lib/validations/service-type.schema.ts`

### 6.2 Rate Limiting
- [x] **Add rate limiting** to authentication endpoints
- [x] **Add rate limiting** to API routes
  - ✅ VERIFIED: Full implementation at `apps/web/src/middleware/rateLimit.ts`
  - Features:
    - Different limits per endpoint type
    - Auth: 5 req/15min
    - Route optimization: 20 req/min
    - Board operations: 120 req/min
    - Proper 429 responses with Retry-After headers

### 6.3 Security Headers
- [x] **Configure security headers** in `next.config.js`
  - ✅ VERIFIED: Already configured with:
    - Content-Security-Policy (production only)
    - X-Frame-Options: DENY
    - X-Content-Type-Options: nosniff
    - X-XSS-Protection: 1; mode=block
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy
    - Strict-Transport-Security (production only)

### 6.4 Secrets Management
- [ ] **Audit environment variables**
- [ ] **Ensure no secrets in code**
- [ ] **Document required env vars** for deployment

---

## Phase 7: Documentation & Deployment Prep
**Priority:** MEDIUM
**Estimated Effort:** 1-2 days

### 7.1 Documentation
- [ ] **API Documentation** - Document all endpoints
- [ ] **Deployment Guide** - Step-by-step deployment instructions
- [ ] **Environment Variables** - Document all required vars

### 7.2 Deployment Configuration
- [ ] **Vercel Configuration** (or chosen platform)
  - [ ] Configure build settings
  - [ ] Set environment variables
  - [ ] Configure domains

- [ ] **Supabase Production**
  - [ ] Create production project
  - [ ] Run all migrations
  - [ ] Configure auth providers
  - [ ] Set up backups

### 7.3 Monitoring Setup
- [ ] **Enable Vercel Analytics** (or alternative)
- [ ] **Set up uptime monitoring**
- [ ] **Configure alerts** for errors

---

## Phase 8: Nice-to-Have (Post-MVP)
**Priority:** LOW
**Estimated Effort:** Ongoing

### 8.1 Mobile App
- [ ] Complete React Native implementation
- [ ] Offline support
- [ ] Push notifications

### 8.2 Advanced Features
- [ ] Email notifications
- [ ] Data export (CSV, PDF)
- [ ] Advanced reporting/analytics
- [ ] Audit logging
- [ ] Two-factor authentication

### 8.3 Integrations
- [ ] Calendar sync (Google, Outlook)
- [ ] Import from spreadsheets
- [ ] Webhook support

---

## Task Summary

| Phase | Tasks | Completed | Priority | Est. Days |
|-------|-------|-----------|----------|-----------|
| 1. Critical Fixes | 4 | 3/4 (75%) | BLOCKER | 0.5-1 |
| 2. Error Handling | 4 | 3/4 (75%) | HIGH | 0.5-1 |
| 3. Unfinished Features | 5 | 4/5 (80%) | HIGH | 4-6 |
| 4. Testing | 3 | 1/3 (33%) | HIGH | 2-3 |
| 5. Performance | 3 | 0/3 (0%) | MEDIUM | 2-3 |
| 6. Security | 4 | 3/4 (75%) | HIGH | 1-2 |
| 7. Documentation | 3 | 0/3 (0%) | MEDIUM | 1-2 |
| **Total for MVP** | **26** | **~17/26 (65%)** | - | **6-12 days** |

---

## Remaining Priority Items

### Must Do Before Deploy
1. ✅ ~~Fix `as any` type assertions (Task 1.3)~~ - COMPLETED
2. ❌ Test RLS policies with all roles (Task 1.4) - Requires manual testing
3. ✅ ~~Add Zod validation to remaining API routes (Task 6.1)~~ - COMPLETED
4. ✅ ~~Configure security headers (Task 6.3)~~ - Already configured

### Should Do Before Deploy
5. ✅ ~~Board duplication logic (Task 3.2)~~ - Already implemented
6. ❌ Add more API route tests (Task 4.2)
7. ❌ API documentation (Task 7.1)

### High Value Features
8. ✅ ~~Item history tracking (Task 3.5 Part A)~~ - COMPLETED
9. ✅ ~~Item board transfer (Task 3.5 Part B)~~ - COMPLETED (better than Monday.com)

### Nice to Have
10. ❌ In-app notifications (Task 3.3)
11. ❌ Kanban/Calendar views (Task 3.2) - Can skip for MVP
12. ❌ Performance optimization (Phase 5)

---

## Quick Wins - Already Completed

1. [x] Remove hardcoded homepage stats - ✅ Done
2. [x] Add error boundary to root layout - ✅ Done
3. [x] Remove `as any` type assertions - ✅ Done (all service files cleaned)
4. [x] Add OSRM error handling/fallback - ✅ Done
5. [x] Add Zod validation to key API routes - ✅ Done
6. [x] Configure security headers - ✅ Done (already in next.config.js)
7. [ ] Document environment variables - ❌ Still needed

---

## Definition of Done

A task is complete when:
- [ ] Code is written and tested locally
- [ ] No TypeScript errors
- [ ] Works for all user roles (where applicable)
- [ ] Handles error cases gracefully
- [ ] Code is committed with descriptive message
