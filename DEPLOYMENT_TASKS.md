# GeoSafety RouteHub - Deployment Tasks

**Last Updated:** 2026-01-21
**Current Completion:** ~65%
**Target:** Production-ready MVP

---

## Phase 1: Critical Fixes (Must Complete Before Any Deployment)
**Priority:** BLOCKER
**Estimated Effort:** 1-2 days

### 1.1 Remove Hardcoded Placeholder Data
- [ ] **Homepage Stats** - Replace hardcoded values with real database queries
  - File: `apps/web/app/page.tsx` (or dashboard)
  - Current: "216 companies, 12 inspectors, 847 routes, 3429 inspections"
  - Action: Create stats service and fetch real counts

### 1.2 Fix OSRM Dependency
- [ ] **Route Optimization Server** - Currently uses public demo server
  - File: `packages/route-optimizer/` or route services
  - Current: Uses `router.project-osrm.org` (rate-limited, unreliable)
  - Options:
    - A) Host own OSRM instance (recommended for production)
    - B) Use paid routing service (Mapbox, Google, HERE)
    - C) Add fallback when OSRM fails
  - Minimum: Add error handling when OSRM is unavailable

### 1.3 Fix Type Safety Issues
- [ ] **Remove `as any` assertions** - Improve Supabase typing
  - Files: Multiple service files use `const db = supabase as any`
  - Action: Generate proper types with `supabase gen types typescript`
  - Files to fix:
    - `apps/web/src/services/users.service.ts`
    - `apps/web/src/contexts/AuthContext.tsx`
    - `apps/web/src/features/workspaces/services/workspace.service.ts`

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
- [ ] **Global Error Boundary** - Catch React errors
  - File: `apps/web/src/shared/components/feedback/ErrorBoundary.tsx` (exists, verify usage)
  - Action: Ensure wrapped around main app layout

- [ ] **Page-level Error Boundaries** - For critical pages
  - [ ] Board page (`/boards/[id]`)
  - [ ] Companies page
  - [ ] Routes page

### 2.2 Add Error Tracking
- [ ] **Sentry Integration**
  - Install: `npm install @sentry/nextjs`
  - Configure: `sentry.client.config.ts`, `sentry.server.config.ts`
  - Add DSN to environment variables

### 2.3 API Error Handling
- [ ] **Consistent API error responses**
  - Review all API routes in `apps/web/app/api/`
  - Ensure all return proper error structures
  - Add try-catch blocks where missing

### 2.4 Loading States
- [ ] **Add skeleton loaders** for main pages
  - [ ] Boards list
  - [ ] Board detail
  - [ ] Companies list
  - [ ] Dashboard

---

## Phase 3: Complete Unfinished Features
**Priority:** HIGH
**Estimated Effort:** 3-5 days

### 3.1 File Upload System
- [ ] **Complete file upload UI**
  - Storage bucket exists: `attachments`
  - Need: Upload component for board file columns
  - Need: File preview/download functionality
  - Files: Create `apps/web/src/features/boards/components/FileUpload.tsx`

### 3.2 Board Features
- [ ] **Board Duplication** - Handler is placeholder
  - File: Board menu/actions component
  - Action: Implement actual duplication logic (copy columns, groups, items)

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
- [ ] **Create global settings page** `/settings`
  - Profile editing (name, avatar, phone)
  - Password change
  - Notification preferences
  - Language toggle (Georgian/English)

---

## Phase 4: Testing
**Priority:** HIGH
**Estimated Effort:** 3-4 days

### 4.1 Setup Testing Infrastructure
- [ ] **Install testing dependencies**
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom
  ```
- [ ] **Configure Vitest** - Create `vitest.config.ts`
- [ ] **Add test scripts** to `package.json`

### 4.2 Critical Path Tests
- [ ] **Authentication Tests**
  - [ ] Login flow
  - [ ] Logout flow
  - [ ] Role detection
  - [ ] Protected route redirect

- [ ] **Board Tests**
  - [ ] Create board
  - [ ] Add columns
  - [ ] Add items
  - [ ] Update item values

- [ ] **API Route Tests**
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
- [ ] **Add Zod validation** to all API routes
  - Review `apps/web/app/api/` routes
  - Ensure request bodies are validated

### 6.2 Rate Limiting
- [ ] **Add rate limiting** to authentication endpoints
- [ ] **Add rate limiting** to API routes

### 6.3 Security Headers
- [ ] **Configure security headers** in `next.config.js`
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options

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

| Phase | Tasks | Priority | Est. Days |
|-------|-------|----------|-----------|
| 1. Critical Fixes | 4 | BLOCKER | 1-2 |
| 2. Error Handling | 4 | HIGH | 2-3 |
| 3. Unfinished Features | 4 | HIGH | 3-5 |
| 4. Testing | 3 | HIGH | 3-4 |
| 5. Performance | 3 | MEDIUM | 2-3 |
| 6. Security | 4 | HIGH | 1-2 |
| 7. Documentation | 3 | MEDIUM | 1-2 |
| **Total for MVP** | **25** | - | **13-21 days** |

---

## Recommended Order of Execution

### Week 1: Foundation
1. Phase 1 - Critical Fixes (all items)
2. Phase 2.1-2.2 - Error Boundaries & Sentry
3. Phase 6.1 - Input Validation

### Week 2: Features & Testing
4. Phase 3.1 - File Upload (if needed for MVP)
5. Phase 3.4 - User Settings Page
6. Phase 4.1-4.2 - Testing Setup & Critical Tests

### Week 3: Polish & Deploy
7. Phase 5.1-5.2 - Performance (basic)
8. Phase 6.2-6.4 - Security
9. Phase 7 - Documentation & Deployment

---

## Quick Wins (Can Do Today)

1. [ ] Remove hardcoded homepage stats
2. [ ] Add error boundary to root layout
3. [ ] Generate proper Supabase types
4. [ ] Add OSRM error handling/fallback
5. [ ] Document environment variables

---

## Definition of Done

A task is complete when:
- [ ] Code is written and tested locally
- [ ] No TypeScript errors
- [ ] Works for all user roles (where applicable)
- [ ] Handles error cases gracefully
- [ ] Code is committed with descriptive message
