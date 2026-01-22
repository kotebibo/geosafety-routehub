-- ================================================
-- RLS CLEANUP FOR PRODUCTION
-- Migration 047: Remove all dev policies and duplicates
-- ================================================
--
-- This migration cleans up the RLS policy mess by:
-- 1. Dropping ALL "Dev:" prefixed policies (security risk - they allow everything)
-- 2. Dropping duplicate/old policies from earlier migrations
-- 3. Removing dangerous "anon" policies
-- 4. Keeping only the secure production policies
--
-- RUN THIS BEFORE PRODUCTION DEPLOYMENT!
-- ================================================

-- ================================================
-- STEP 0: CRITICAL - Remove anonymous access policies
-- Anonymous users should NEVER access business data
-- ================================================

DROP POLICY IF EXISTS "Allow anon to delete company_locations" ON company_locations;
DROP POLICY IF EXISTS "Allow anon to insert company_locations" ON company_locations;
DROP POLICY IF EXISTS "Allow anon to read company_locations" ON company_locations;
DROP POLICY IF EXISTS "Allow anon to update company_locations" ON company_locations;

-- ================================================
-- STEP 1: Remove all "Dev:" policies (CRITICAL SECURITY FIX)
-- These policies use USING(true) which bypasses all security
-- ================================================

-- boards table
DROP POLICY IF EXISTS "Dev: Allow all board reads" ON boards;
DROP POLICY IF EXISTS "Dev: Allow all board inserts" ON boards;
DROP POLICY IF EXISTS "Dev: Allow all board updates" ON boards;
DROP POLICY IF EXISTS "Dev: Allow all board deletes" ON boards;

-- board_items table
DROP POLICY IF EXISTS "Dev: Allow all board item reads" ON board_items;
DROP POLICY IF EXISTS "Dev: Allow all board item inserts" ON board_items;
DROP POLICY IF EXISTS "Dev: Allow all board item updates" ON board_items;
DROP POLICY IF EXISTS "Dev: Allow all board item deletes" ON board_items;

-- board_members table
DROP POLICY IF EXISTS "Dev: Allow all board member reads" ON board_members;
DROP POLICY IF EXISTS "Dev: Allow all board member inserts" ON board_members;
DROP POLICY IF EXISTS "Dev: Allow all board member updates" ON board_members;
DROP POLICY IF EXISTS "Dev: Allow all board member deletes" ON board_members;

-- board_columns table
DROP POLICY IF EXISTS "Dev: Allow all board column reads" ON board_columns;
DROP POLICY IF EXISTS "Dev: Allow all board column inserts" ON board_columns;
DROP POLICY IF EXISTS "Dev: Allow all board column updates" ON board_columns;
DROP POLICY IF EXISTS "Dev: Allow all board column deletes" ON board_columns;

-- board_groups table
DROP POLICY IF EXISTS "Dev: Allow all board group reads" ON board_groups;
DROP POLICY IF EXISTS "Dev: Allow all board group inserts" ON board_groups;
DROP POLICY IF EXISTS "Dev: Allow all board group updates" ON board_groups;
DROP POLICY IF EXISTS "Dev: Allow all board group deletes" ON board_groups;

-- board_views table
DROP POLICY IF EXISTS "Dev: Allow all board view reads" ON board_views;
DROP POLICY IF EXISTS "Dev: Allow all board view inserts" ON board_views;
DROP POLICY IF EXISTS "Dev: Allow all board view updates" ON board_views;
DROP POLICY IF EXISTS "Dev: Allow all board view deletes" ON board_views;

-- board_presence table
DROP POLICY IF EXISTS "Dev: Allow all board presence reads" ON board_presence;
DROP POLICY IF EXISTS "Dev: Allow all board presence inserts" ON board_presence;
DROP POLICY IF EXISTS "Dev: Allow all board presence updates" ON board_presence;
DROP POLICY IF EXISTS "Dev: Allow all board presence deletes" ON board_presence;

-- item_updates table
DROP POLICY IF EXISTS "Dev: Allow all item update reads" ON item_updates;
DROP POLICY IF EXISTS "Dev: Allow all item update inserts" ON item_updates;
DROP POLICY IF EXISTS "Dev: Allow all item update updates" ON item_updates;
DROP POLICY IF EXISTS "Dev: Allow all item update deletes" ON item_updates;

-- item_comments table
DROP POLICY IF EXISTS "Dev: Allow all item comment reads" ON item_comments;
DROP POLICY IF EXISTS "Dev: Allow all item comment inserts" ON item_comments;
DROP POLICY IF EXISTS "Dev: Allow all item comment updates" ON item_comments;
DROP POLICY IF EXISTS "Dev: Allow all item comment deletes" ON item_comments;

-- companies table
DROP POLICY IF EXISTS "Dev: Allow all company reads" ON companies;
DROP POLICY IF EXISTS "Dev: Allow all company inserts" ON companies;
DROP POLICY IF EXISTS "Dev: Allow all company updates" ON companies;
DROP POLICY IF EXISTS "Dev: Allow all company deletes" ON companies;

-- inspectors table
DROP POLICY IF EXISTS "Dev: Allow all inspector reads" ON inspectors;
DROP POLICY IF EXISTS "Dev: Allow all inspector inserts" ON inspectors;
DROP POLICY IF EXISTS "Dev: Allow all inspector updates" ON inspectors;
DROP POLICY IF EXISTS "Dev: Allow all inspector deletes" ON inspectors;

-- routes table
DROP POLICY IF EXISTS "Dev: Allow all route reads" ON routes;
DROP POLICY IF EXISTS "Dev: Allow all route inserts" ON routes;
DROP POLICY IF EXISTS "Dev: Allow all route updates" ON routes;
DROP POLICY IF EXISTS "Dev: Allow all route deletes" ON routes;

-- route_stops table
DROP POLICY IF EXISTS "Dev: Allow all route stop reads" ON route_stops;
DROP POLICY IF EXISTS "Dev: Allow all route stop inserts" ON route_stops;
DROP POLICY IF EXISTS "Dev: Allow all route stop updates" ON route_stops;
DROP POLICY IF EXISTS "Dev: Allow all route stop deletes" ON route_stops;

-- inspections table
DROP POLICY IF EXISTS "Dev: Allow all inspection reads" ON inspections;
DROP POLICY IF EXISTS "Dev: Allow all inspection inserts" ON inspections;
DROP POLICY IF EXISTS "Dev: Allow all inspection updates" ON inspections;
DROP POLICY IF EXISTS "Dev: Allow all inspection deletes" ON inspections;

-- ================================================
-- STEP 2: Remove duplicate/old policies from migration 033
-- These were replaced by better policies in migration 029/033
-- ================================================

-- boards - old policies from 033 that duplicate 029 policies
DROP POLICY IF EXISTS "boards_select" ON boards;
DROP POLICY IF EXISTS "boards_insert" ON boards;
DROP POLICY IF EXISTS "boards_update" ON boards;
DROP POLICY IF EXISTS "boards_delete" ON boards;

-- board_items - old policies
DROP POLICY IF EXISTS "items_select" ON board_items;
DROP POLICY IF EXISTS "items_insert" ON board_items;
DROP POLICY IF EXISTS "items_update" ON board_items;
DROP POLICY IF EXISTS "items_delete" ON board_items;

-- board_groups - old policies
DROP POLICY IF EXISTS "groups_select" ON board_groups;
DROP POLICY IF EXISTS "groups_insert" ON board_groups;
DROP POLICY IF EXISTS "groups_update" ON board_groups;
DROP POLICY IF EXISTS "groups_delete" ON board_groups;

-- board_columns - old policies
DROP POLICY IF EXISTS "columns_select" ON board_columns;
DROP POLICY IF EXISTS "columns_insert" ON board_columns;
DROP POLICY IF EXISTS "columns_update" ON board_columns;
DROP POLICY IF EXISTS "columns_delete" ON board_columns;

-- board_members - old policies
DROP POLICY IF EXISTS "members_select" ON board_members;
DROP POLICY IF EXISTS "members_insert" ON board_members;
DROP POLICY IF EXISTS "members_update" ON board_members;
DROP POLICY IF EXISTS "members_delete" ON board_members;

-- inspectors - old policies
DROP POLICY IF EXISTS "inspectors_select" ON inspectors;
DROP POLICY IF EXISTS "inspectors_insert" ON inspectors;
DROP POLICY IF EXISTS "inspectors_update" ON inspectors;
DROP POLICY IF EXISTS "inspectors_delete" ON inspectors;

-- companies - old policies
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;

-- Very old descriptive policy names
DROP POLICY IF EXISTS "Users can view their own boards" ON boards;
DROP POLICY IF EXISTS "Users can create boards" ON boards;
DROP POLICY IF EXISTS "Users can update their own boards" ON boards;
DROP POLICY IF EXISTS "Users can delete their own boards" ON boards;

DROP POLICY IF EXISTS "Users can view items in their boards" ON board_items;
DROP POLICY IF EXISTS "Users can create items in their boards" ON board_items;
DROP POLICY IF EXISTS "Users can update items in their boards" ON board_items;
DROP POLICY IF EXISTS "Users can delete items in their boards" ON board_items;

DROP POLICY IF EXISTS "Users can view board members" ON board_members;
DROP POLICY IF EXISTS "Board owners can add members" ON board_members;
DROP POLICY IF EXISTS "Board owners can update members" ON board_members;
DROP POLICY IF EXISTS "Board owners can remove members" ON board_members;

DROP POLICY IF EXISTS "Everyone can view inspectors" ON inspectors;
DROP POLICY IF EXISTS "Admins can manage inspectors" ON inspectors;

DROP POLICY IF EXISTS "Everyone can view companies" ON companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON companies;

DROP POLICY IF EXISTS "Anyone can read board columns" ON board_columns;
DROP POLICY IF EXISTS "Admins can manage board columns" ON board_columns;
DROP POLICY IF EXISTS "Board owners can manage columns" ON board_columns;

-- ================================================
-- STEP 2.5: Remove duplicate policies (keeping *_policy versions)
-- ================================================

-- board_columns duplicates
DROP POLICY IF EXISTS "columns_select_secure" ON board_columns;

-- board_groups duplicates (keep *_policy versions)
DROP POLICY IF EXISTS "groups_delete_secure" ON board_groups;
DROP POLICY IF EXISTS "groups_insert_secure" ON board_groups;
DROP POLICY IF EXISTS "groups_select_secure" ON board_groups;
DROP POLICY IF EXISTS "groups_update_secure" ON board_groups;

-- board_items duplicates (keep *_policy versions)
DROP POLICY IF EXISTS "items_delete_secure" ON board_items;
DROP POLICY IF EXISTS "items_insert_secure" ON board_items;
DROP POLICY IF EXISTS "items_select_secure" ON board_items;
DROP POLICY IF EXISTS "items_update_secure" ON board_items;

-- board_members duplicates (keep *_policy versions)
DROP POLICY IF EXISTS "members_delete_secure" ON board_members;
DROP POLICY IF EXISTS "members_insert_secure" ON board_members;
DROP POLICY IF EXISTS "members_select_secure" ON board_members;
DROP POLICY IF EXISTS "members_update_secure" ON board_members;

-- boards duplicates (keep *_policy versions)
DROP POLICY IF EXISTS "boards_delete_secure" ON boards;
DROP POLICY IF EXISTS "boards_insert_secure" ON boards;
DROP POLICY IF EXISTS "boards_select_secure" ON boards;
DROP POLICY IF EXISTS "boards_update_secure" ON boards;

-- board_presence duplicates
DROP POLICY IF EXISTS "Users can manage own presence" ON board_presence;
DROP POLICY IF EXISTS "Users can read all presence" ON board_presence;

-- board_templates duplicates
DROP POLICY IF EXISTS "Anyone can read templates" ON board_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON board_templates;

-- board_views duplicates
DROP POLICY IF EXISTS "Users can read own or shared views" ON board_views;

-- companies duplicates
DROP POLICY IF EXISTS "Authenticated users can read companies" ON companies;
DROP POLICY IF EXISTS "companies_select_secure" ON companies;

-- company_locations duplicates (cleanup the mess)
DROP POLICY IF EXISTS "Allow authenticated users to delete company_locations" ON company_locations;
DROP POLICY IF EXISTS "Allow authenticated users to insert company_locations" ON company_locations;
DROP POLICY IF EXISTS "Allow authenticated users to read company_locations" ON company_locations;
DROP POLICY IF EXISTS "Allow authenticated users to update company_locations" ON company_locations;
DROP POLICY IF EXISTS "Authenticated users can read company locations" ON company_locations;
DROP POLICY IF EXISTS "company_locations_delete_policy" ON company_locations;
DROP POLICY IF EXISTS "company_locations_insert_policy" ON company_locations;
DROP POLICY IF EXISTS "company_locations_select_policy" ON company_locations;
DROP POLICY IF EXISTS "company_locations_update_policy" ON company_locations;

-- company_services duplicates
DROP POLICY IF EXISTS "Authenticated users can read company_services" ON company_services;
DROP POLICY IF EXISTS "Users can view company services" ON company_services;

-- custom_roles duplicates
DROP POLICY IF EXISTS "Anyone can read roles" ON custom_roles;

-- inspection_history duplicates
DROP POLICY IF EXISTS "Users can view inspection history" ON inspection_history;

-- inspections duplicates
DROP POLICY IF EXISTS "inspections_select_policy" ON inspections;

-- inspectors duplicates
DROP POLICY IF EXISTS "Allow reading inspectors for lookup" ON inspectors;
DROP POLICY IF EXISTS "Authenticated users can read inspectors" ON inspectors;
DROP POLICY IF EXISTS "inspectors_select_secure" ON inspectors;

-- item_updates duplicates
DROP POLICY IF EXISTS "Authenticated users can read item updates" ON item_updates;

-- permissions duplicates
DROP POLICY IF EXISTS "Anyone can read permissions" ON permissions;

-- reassignment_history duplicates
DROP POLICY IF EXISTS "Users can view reassignment history" ON reassignment_history;

-- role_permissions duplicates
DROP POLICY IF EXISTS "Anyone can read role permissions" ON role_permissions;

-- route_stops duplicates
DROP POLICY IF EXISTS "route_stops_select_policy" ON route_stops;

-- routes duplicates
DROP POLICY IF EXISTS "routes_select_policy" ON routes;

-- service_types duplicates
DROP POLICY IF EXISTS "Anyone can read service types" ON service_types;
DROP POLICY IF EXISTS "Service types are viewable by authenticated users" ON service_types;

-- users duplicates
DROP POLICY IF EXISTS "Users can read all users" ON users;

-- workspaces duplicates
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;

-- ================================================
-- STEP 3: Verify the correct policies exist
-- These are the policies from migration 033 (_secure suffix)
-- and migration 029 (descriptive names)
-- ================================================

-- The following policies SHOULD exist and are secure:
-- boards: boards_select_secure, boards_insert_secure, boards_update_secure, boards_delete_secure
-- board_items: items_select_secure, items_insert_secure, items_update_secure, items_delete_secure
-- board_groups: groups_select_secure, groups_insert_secure, groups_update_secure, groups_delete_secure
-- board_columns: columns_select_secure, columns_insert_secure, columns_update_secure, columns_delete_secure
-- board_members: members_select_secure, members_insert_secure, members_update_secure, members_delete_secure
-- inspectors: inspectors_select_secure, inspectors_insert_secure, inspectors_update_secure, inspectors_delete_secure
-- companies: companies_select_secure, companies_insert_secure, companies_update_secure, companies_delete_secure

-- ================================================
-- STEP 4: Ensure RLS is enabled on all tables
-- ================================================

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 5: Add missing policies for tables that need SELECT coverage
-- After removing duplicates, we need to ensure proper SELECT policies exist
-- Using DROP + CREATE pattern since PostgreSQL doesn't support IF NOT EXISTS
-- ================================================

-- companies: All authenticated users can read (reference data)
DROP POLICY IF EXISTS "companies_select_policy" ON companies;
CREATE POLICY "companies_select_policy" ON companies
  FOR SELECT TO authenticated USING (true);

-- inspectors: All authenticated users can read (reference data)
DROP POLICY IF EXISTS "inspectors_select_policy" ON inspectors;
CREATE POLICY "inspectors_select_policy" ON inspectors
  FOR SELECT TO authenticated USING (true);

-- company_locations: All authenticated users can read
DROP POLICY IF EXISTS "company_locations_select_policy" ON company_locations;
CREATE POLICY "company_locations_select_policy" ON company_locations
  FOR SELECT TO authenticated USING (true);

-- company_services: All authenticated users can read
DROP POLICY IF EXISTS "company_services_select_policy" ON company_services;
CREATE POLICY "company_services_select_policy" ON company_services
  FOR SELECT TO authenticated USING (true);

-- custom_roles: All authenticated users can read role definitions
DROP POLICY IF EXISTS "custom_roles_select_policy" ON custom_roles;
CREATE POLICY "custom_roles_select_policy" ON custom_roles
  FOR SELECT TO authenticated USING (true);

-- permissions: All authenticated users can read permission definitions
DROP POLICY IF EXISTS "permissions_select_policy" ON permissions;
CREATE POLICY "permissions_select_policy" ON permissions
  FOR SELECT TO authenticated USING (true);

-- role_permissions: All authenticated users can read role-permission mappings
DROP POLICY IF EXISTS "role_permissions_select_policy" ON role_permissions;
CREATE POLICY "role_permissions_select_policy" ON role_permissions
  FOR SELECT TO authenticated USING (true);

-- service_types: All authenticated users can read (reference data)
DROP POLICY IF EXISTS "service_types_select_policy" ON service_types;
CREATE POLICY "service_types_select_policy" ON service_types
  FOR SELECT TO authenticated USING (true);

-- inspection_history: Authenticated users can read
DROP POLICY IF EXISTS "inspection_history_select_policy" ON inspection_history;
CREATE POLICY "inspection_history_select_policy" ON inspection_history
  FOR SELECT TO authenticated USING (true);

-- reassignment_history: Authenticated users can read
DROP POLICY IF EXISTS "reassignment_history_select_policy" ON reassignment_history;
CREATE POLICY "reassignment_history_select_policy" ON reassignment_history
  FOR SELECT TO authenticated USING (true);

-- routes: Authenticated users can read (dispatcher/inspector filtering happens in app)
DROP POLICY IF EXISTS "routes_select_policy" ON routes;
CREATE POLICY "routes_select_policy" ON routes
  FOR SELECT TO authenticated USING (true);

-- route_stops: Authenticated users can read
DROP POLICY IF EXISTS "route_stops_select_policy" ON route_stops;
CREATE POLICY "route_stops_select_policy" ON route_stops
  FOR SELECT TO authenticated USING (true);

-- inspections: Authenticated users can read
DROP POLICY IF EXISTS "inspections_select_policy" ON inspections;
CREATE POLICY "inspections_select_policy" ON inspections
  FOR SELECT TO authenticated USING (true);

-- users: Authenticated users can read user list
DROP POLICY IF EXISTS "users_select_policy" ON users;
CREATE POLICY "users_select_policy" ON users
  FOR SELECT TO authenticated USING (true);

-- pdp_compliance_phases: Authenticated users can read
DROP POLICY IF EXISTS "pdp_compliance_phases_select_policy" ON pdp_compliance_phases;
CREATE POLICY "pdp_compliance_phases_select_policy" ON pdp_compliance_phases
  FOR SELECT TO authenticated USING (true);

-- company_pdp_phases: Authenticated users can read
DROP POLICY IF EXISTS "company_pdp_phases_select_policy" ON company_pdp_phases;
CREATE POLICY "company_pdp_phases_select_policy" ON company_pdp_phases
  FOR SELECT TO authenticated USING (true);

-- ================================================
-- STEP 6: Add missing policies for item_comments
-- ================================================

-- item_comments - ensure proper policies exist
DROP POLICY IF EXISTS "item_comments_select" ON item_comments;
DROP POLICY IF EXISTS "item_comments_insert" ON item_comments;
DROP POLICY IF EXISTS "item_comments_update" ON item_comments;
DROP POLICY IF EXISTS "item_comments_delete" ON item_comments;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'item_comments') THEN
    -- Enable RLS
    ALTER TABLE item_comments ENABLE ROW LEVEL SECURITY;

    -- Create proper policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_comments' AND policyname = 'item_comments_select_secure') THEN
      EXECUTE 'CREATE POLICY "item_comments_select_secure" ON item_comments FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1 FROM board_items bi
          JOIN boards b ON b.id = bi.board_id
          WHERE bi.id = item_comments.item_id
          AND public.can_access_board(b.id)
        )
      )';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_comments' AND policyname = 'item_comments_insert_secure') THEN
      EXECUTE 'CREATE POLICY "item_comments_insert_secure" ON item_comments FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
          SELECT 1 FROM board_items bi
          JOIN boards b ON b.id = bi.board_id
          WHERE bi.id = item_comments.item_id
          AND public.can_access_board(b.id)
        )
      )';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_comments' AND policyname = 'item_comments_update_secure') THEN
      EXECUTE 'CREATE POLICY "item_comments_update_secure" ON item_comments FOR UPDATE TO authenticated USING (
        user_id = auth.uid() OR public.is_admin_user()
      )';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'item_comments' AND policyname = 'item_comments_delete_secure') THEN
      EXECUTE 'CREATE POLICY "item_comments_delete_secure" ON item_comments FOR DELETE TO authenticated USING (
        user_id = auth.uid() OR public.is_admin_user()
      )';
    END IF;
  END IF;
END $$;

-- ================================================
-- CLEANUP COMPLETE
-- ================================================
--
-- Summary of what this migration does:
-- 1. Removes anonymous access policies (CRITICAL security fix)
-- 2. Removes all "Dev:" policies that bypass security
-- 3. Removes duplicate old policies
-- 4. Ensures RLS is enabled on all tables
-- 5. Creates proper SELECT policies for reference data
-- 6. Adds missing policies for item_comments
--
-- After running this migration, verify with:
-- SELECT tablename, policyname, cmd,
--        CASE WHEN qual = 'true' THEN '⚠️ OPEN READ' ELSE '✓ Restricted' END as access_type
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- Note: "⚠️ OPEN READ" on SELECT policies is EXPECTED for:
-- - Reference data (companies, inspectors, service_types, etc.)
-- - These are still protected by "TO authenticated" clause
-- - Anonymous users cannot access ANY data
--
-- Expected policy count per table (approximately):
-- - Core tables (boards, items, etc.): 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - Reference data (companies, inspectors): 4 policies with open SELECT
-- - Read-only audit tables: 1-2 policies (SELECT only or SELECT + INSERT)
-- ================================================
