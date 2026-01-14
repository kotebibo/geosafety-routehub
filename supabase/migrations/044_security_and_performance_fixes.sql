-- ================================================
-- Security and Performance Fixes
-- Migration 044: Fix all security and performance issues
-- ================================================

-- This migration addresses:
-- 1. SECURITY DEFINER views (ERROR) - convert to SECURITY INVOKER
-- 2. RLS disabled on spatial_ref_sys (ERROR) - enable RLS
-- 3. Function search_path mutable (WARN) - set search_path
-- 4. RLS initplan performance (WARN) - wrap auth functions in SELECT

-- ================================================
-- SECTION 1: Fix SECURITY DEFINER Views
-- Convert views to use SECURITY INVOKER (respects caller's permissions)
-- ================================================

-- Drop and recreate companies_with_location_count view
DROP VIEW IF EXISTS public.companies_with_location_count;

CREATE VIEW public.companies_with_location_count
WITH (security_invoker = true)
AS
SELECT
  c.*,
  COALESCE(loc_count.count, 0) as location_count,
  pl.id as primary_location_id,
  pl.name as primary_location_name,
  pl.address as primary_location_address
FROM public.companies c
LEFT JOIN (
  SELECT company_id, COUNT(*) as count
  FROM public.company_locations
  GROUP BY company_id
) loc_count ON loc_count.company_id = c.id
LEFT JOIN public.company_locations pl ON pl.company_id = c.id AND pl.is_primary = true;

GRANT SELECT ON public.companies_with_location_count TO authenticated;
GRANT SELECT ON public.companies_with_location_count TO anon;

-- Drop and recreate pdp_compliance_overview view
DROP VIEW IF EXISTS public.pdp_compliance_overview;

CREATE VIEW public.pdp_compliance_overview
WITH (security_invoker = true)
AS
SELECT
  p.*,
  c.name as company_name,
  c.address as company_address,
  c.contact_name as contact_person,
  c.contact_phone,
  c.contact_email,
  CASE
    WHEN p.phase_5_completed THEN 'სერტიფიცირებული'
    WHEN p.phase_4_completed THEN 'ფაზა 5 - სერტიფიცირება'
    WHEN p.phase_3_completed THEN 'ფაზა 4 - ტრენინგი'
    WHEN p.phase_2_completed THEN 'ფაზა 3 - დანერგვა'
    WHEN p.phase_1_completed THEN 'ფაზა 2 - დოკუმენტაცია'
    ELSE 'ფაზა 1 - პირველადი შეფასება'
  END as current_phase_status,
  CASE
    WHEN p.phase_1_completed
     AND p.phase_2_completed
     AND p.phase_3_completed
     AND p.phase_4_completed
     AND p.phase_5_completed
    THEN 5
    WHEN p.phase_1_completed
     AND p.phase_2_completed
     AND p.phase_3_completed
     AND p.phase_4_completed
    THEN 4
    WHEN p.phase_1_completed
     AND p.phase_2_completed
     AND p.phase_3_completed
    THEN 3
    WHEN p.phase_1_completed
     AND p.phase_2_completed
    THEN 2
    WHEN p.phase_1_completed
    THEN 1
    ELSE 0
  END as phases_completed,
  (p.phase_1_completed::int + p.phase_2_completed::int + p.phase_3_completed::int +
   p.phase_4_completed::int + p.phase_5_completed::int) * 20 as progress_percentage
FROM public.pdp_compliance_phases p
JOIN public.companies c ON p.company_id = c.id;

GRANT SELECT ON public.pdp_compliance_overview TO authenticated;

-- ================================================
-- SECTION 2: Handle spatial_ref_sys table
-- This is a PostGIS system table - we cannot modify it directly as it's
-- owned by the postgres/superuser role. The table is read-only reference
-- data for coordinate systems and doesn't contain user data.
--
-- To fix this warning, you need to run the following as a superuser
-- in the Supabase SQL Editor (or ignore it as it's a system table):
--
-- ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "spatial_ref_sys_select" ON public.spatial_ref_sys
--     FOR SELECT TO authenticated USING (true);
--
-- Alternatively, move PostGIS to an 'extensions' schema (recommended):
-- See: https://supabase.com/docs/guides/database/extensions
-- ================================================

-- Skip spatial_ref_sys - requires superuser privileges

-- ================================================
-- SECTION 3: Fix Function Search Paths
-- Add SET search_path to all functions to prevent search path injection
-- ================================================

-- First, drop all policies that depend on has_permission function
-- These will be recreated in Section 4 with better performance
DROP POLICY IF EXISTS "Users with permission can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users with permission can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can create inspectors" ON public.inspectors;
DROP POLICY IF EXISTS "Admins can update inspectors" ON public.inspectors;
DROP POLICY IF EXISTS "Admins can delete inspectors" ON public.inspectors;
DROP POLICY IF EXISTS "Authenticated users can read routes" ON public.routes;
DROP POLICY IF EXISTS "Dispatchers and admins can create routes" ON public.routes;
DROP POLICY IF EXISTS "Dispatchers and admins can update routes" ON public.routes;
DROP POLICY IF EXISTS "Admins can delete routes" ON public.routes;
DROP POLICY IF EXISTS "Users can read inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users with permission can create inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can update own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Admins can delete inspections" ON public.inspections;

-- Now we can safely drop and recreate has_permission
DROP FUNCTION IF EXISTS public.has_permission(TEXT);

-- Drop workspace-related policies that depend on workspace functions
DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;
DROP POLICY IF EXISTS "workspace_members_update" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;

-- Drop board-related policies that depend on board access functions
DROP POLICY IF EXISTS "boards_select" ON public.boards;
DROP POLICY IF EXISTS "boards_update" ON public.boards;
DROP POLICY IF EXISTS "boards_delete" ON public.boards;
DROP POLICY IF EXISTS "board_groups_select" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_insert" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_update" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_delete" ON public.board_groups;
DROP POLICY IF EXISTS "board_items_select" ON public.board_items;
DROP POLICY IF EXISTS "board_items_insert" ON public.board_items;
DROP POLICY IF EXISTS "board_items_update" ON public.board_items;
DROP POLICY IF EXISTS "board_items_delete" ON public.board_items;
-- item_values table does not exist, skip these
-- DROP POLICY IF EXISTS "item_values_select" ON public.item_values;
-- DROP POLICY IF EXISTS "item_values_insert" ON public.item_values;
-- DROP POLICY IF EXISTS "item_values_update" ON public.item_values;
-- DROP POLICY IF EXISTS "item_values_delete" ON public.item_values;
DROP POLICY IF EXISTS "item_updates_select" ON public.item_updates;
DROP POLICY IF EXISTS "item_updates_insert" ON public.item_updates;
DROP POLICY IF EXISTS "board_members_select" ON public.board_members;
DROP POLICY IF EXISTS "board_members_insert" ON public.board_members;
DROP POLICY IF EXISTS "board_members_update" ON public.board_members;
DROP POLICY IF EXISTS "board_members_delete" ON public.board_members;

-- Drop other functions that may have parameter name conflicts
DROP FUNCTION IF EXISTS public.is_workspace_admin(UUID);
DROP FUNCTION IF EXISTS public.is_workspace_owner(UUID);
DROP FUNCTION IF EXISTS public.is_workspace_member(UUID);
DROP FUNCTION IF EXISTS public.can_access_board(UUID);
DROP FUNCTION IF EXISTS public.can_edit_board(UUID);
DROP FUNCTION IF EXISTS public.get_company_primary_location(UUID);
DROP FUNCTION IF EXISTS public.get_user_activity_summary(UUID);
DROP FUNCTION IF EXISTS public.duplicate_board(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_item_update(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.calculate_inspection_duration(TIMESTAMPTZ, TIMESTAMPTZ);

-- has_permission
CREATE OR REPLACE FUNCTION public.has_permission(required_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.email = (SELECT auth.email())
        AND (
            ur.role = 'admin'
            OR required_permission = ANY(ur.permissions)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- is_admin_or_dispatcher
CREATE OR REPLACE FUNCTION public.is_admin_or_dispatcher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.email = (SELECT auth.email())
        AND ur.role IN ('admin', 'dispatcher')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- is_admin_user
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.email = (SELECT auth.email())
        AND ur.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- duplicate_board
CREATE OR REPLACE FUNCTION public.duplicate_board(
    source_board_id UUID,
    new_name TEXT,
    new_owner_id UUID
)
RETURNS UUID AS $$
DECLARE
    new_board_id UUID;
    source_board RECORD;
BEGIN
    -- Get source board
    SELECT * INTO source_board FROM public.boards WHERE id = source_board_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Board not found';
    END IF;

    -- Create new board
    INSERT INTO public.boards (
        name, board_type, icon, color, is_template, is_public, owner_id, settings
    ) VALUES (
        new_name,
        source_board.board_type,
        source_board.icon,
        source_board.color,
        false,
        source_board.is_public,
        new_owner_id,
        source_board.settings
    ) RETURNING id INTO new_board_id;

    -- Copy columns
    INSERT INTO public.board_columns (board_id, name, column_type, position, settings, width)
    SELECT new_board_id, name, column_type, position, settings, width
    FROM public.board_columns WHERE board_id = source_board_id;

    -- Copy groups
    INSERT INTO public.board_groups (board_id, name, color, position, is_collapsed)
    SELECT new_board_id, name, color, position, is_collapsed
    FROM public.board_groups WHERE board_id = source_board_id;

    RETURN new_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- is_workspace_admin
CREATE OR REPLACE FUNCTION public.is_workspace_admin(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members wm
        JOIN public.inspectors i ON wm.user_id = i.id
        WHERE wm.workspace_id = workspace_uuid
        AND i.email = (SELECT public.get_my_email())
        AND wm.role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- is_workspace_owner
CREATE OR REPLACE FUNCTION public.is_workspace_owner(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspaces w
        JOIN public.inspectors i ON w.owner_id = i.id
        WHERE w.id = workspace_uuid
        AND i.email = (SELECT public.get_my_email())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- is_workspace_member
CREATE OR REPLACE FUNCTION public.is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members wm
        JOIN public.inspectors i ON wm.user_id = i.id
        WHERE wm.workspace_id = workspace_uuid
        AND i.email = (SELECT public.get_my_email())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- add_board_owner_as_member
CREATE OR REPLACE FUNCTION public.add_board_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.board_members (board_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- get_user_activity_summary
CREATE OR REPLACE FUNCTION public.get_user_activity_summary(user_uuid UUID)
RETURNS TABLE (
    total_boards BIGINT,
    total_items BIGINT,
    total_updates BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.boards WHERE owner_id = user_uuid),
        (SELECT COUNT(*) FROM public.board_items bi
         JOIN public.boards b ON bi.board_id = b.id
         WHERE b.owner_id = user_uuid),
        (SELECT COUNT(*) FROM public.item_updates iu
         JOIN public.board_items bi ON iu.item_id = bi.id
         JOIN public.boards b ON bi.board_id = b.id
         WHERE b.owner_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- update_service_types_updated_at
CREATE OR REPLACE FUNCTION public.update_service_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- upsert_user_profile
-- Note: This trigger runs on auth.users table, NEW record comes from there
-- The user_roles table uses user_id (UUID), not email
CREATE OR REPLACE FUNCTION public.upsert_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get email from the auth.users NEW record
    user_email := NEW.email;

    -- Create inspector record if not exists
    INSERT INTO public.inspectors (email, full_name)
    VALUES (user_email, COALESCE(NEW.raw_user_meta_data->>'full_name', user_email))
    ON CONFLICT (email) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.inspectors.full_name);

    -- Create default user role if not exists
    -- user_roles table has user_id (UUID), not email
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'inspector')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

-- calculate_inspection_duration
CREATE OR REPLACE FUNCTION public.calculate_inspection_duration(start_time TIMESTAMPTZ, end_time TIMESTAMPTZ)
RETURNS INTERVAL AS $$
BEGIN
    RETURN end_time - start_time;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;

-- get_user_inspector_id
CREATE OR REPLACE FUNCTION public.get_user_inspector_id()
RETURNS UUID AS $$
DECLARE
    inspector_id UUID;
BEGIN
    SELECT id INTO inspector_id
    FROM public.inspectors
    WHERE email = (SELECT auth.email())
    LIMIT 1;
    RETURN inspector_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- update_company_locations_updated_at
CREATE OR REPLACE FUNCTION public.update_company_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- create_default_workspace_for_user
CREATE OR REPLACE FUNCTION public.create_default_workspace_for_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE owner_id = NEW.id AND is_default = true
    ) THEN
        INSERT INTO public.workspaces (
            name,
            name_ka,
            description,
            owner_id,
            is_default,
            icon,
            color
        ) VALUES (
            'My Workspace',
            'ჩემი სამუშაო სივრცე',
            'Default workspace for your boards',
            NEW.id,
            true,
            'home',
            'blue'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- get_my_inspector_id
CREATE OR REPLACE FUNCTION public.get_my_inspector_id()
RETURNS UUID AS $$
DECLARE
    inspector_id UUID;
BEGIN
    SELECT i.id INTO inspector_id
    FROM public.inspectors i
    WHERE i.email = (SELECT public.get_my_email())
    LIMIT 1;

    RETURN inspector_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- get_current_inspector_id
CREATE OR REPLACE FUNCTION public.get_current_inspector_id()
RETURNS UUID AS $$
DECLARE
    inspector_id UUID;
BEGIN
    SELECT id INTO inspector_id
    FROM public.inspectors
    WHERE email = (SELECT auth.email())
    LIMIT 1;
    RETURN inspector_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- can_access_board
CREATE OR REPLACE FUNCTION public.can_access_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    my_inspector_id UUID;
BEGIN
    my_inspector_id := (SELECT public.get_my_inspector_id());

    RETURN EXISTS (
        SELECT 1 FROM public.boards b
        WHERE b.id = board_uuid
        AND (
            b.owner_id = my_inspector_id
            OR b.is_public = true
            OR EXISTS (
                SELECT 1 FROM public.board_members bm
                WHERE bm.board_id = b.id AND bm.user_id = my_inspector_id
            )
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = b.workspace_id AND wm.user_id = my_inspector_id
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- can_edit_board
CREATE OR REPLACE FUNCTION public.can_edit_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    my_inspector_id UUID;
BEGIN
    my_inspector_id := (SELECT public.get_my_inspector_id());

    RETURN EXISTS (
        SELECT 1 FROM public.boards b
        WHERE b.id = board_uuid
        AND (
            b.owner_id = my_inspector_id
            OR EXISTS (
                SELECT 1 FROM public.board_members bm
                WHERE bm.board_id = b.id
                AND bm.user_id = my_inspector_id
                AND bm.role IN ('owner', 'admin', 'editor')
            )
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = b.workspace_id
                AND wm.user_id = my_inspector_id
                AND wm.role IN ('owner', 'admin')
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- ensure_single_primary_location
CREATE OR REPLACE FUNCTION public.ensure_single_primary_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary THEN
        UPDATE public.company_locations
        SET is_primary = false
        WHERE company_id = NEW.company_id
        AND id != NEW.id
        AND is_primary = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- cleanup_stale_presence
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM public.board_presence
    WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- add_workspace_owner_as_member
CREATE OR REPLACE FUNCTION public.add_workspace_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- update_next_inspection_date
CREATE OR REPLACE FUNCTION public.update_next_inspection_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Update next inspection date based on inspection frequency
    IF NEW.status = 'completed' THEN
        UPDATE public.companies
        SET next_inspection_date = NEW.inspection_date + INTERVAL '1 year'
        WHERE id = NEW.company_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- create_item_update
CREATE OR REPLACE FUNCTION public.create_item_update(
    p_item_id UUID,
    p_user_id UUID,
    p_content TEXT
)
RETURNS UUID AS $$
DECLARE
    new_update_id UUID;
BEGIN
    INSERT INTO public.item_updates (item_id, user_id, content)
    VALUES (p_item_id, p_user_id, p_content)
    RETURNING id INTO new_update_id;

    -- Update item's updated_at
    UPDATE public.board_items SET updated_at = NOW() WHERE id = p_item_id;

    RETURN new_update_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- get_my_workspace_ids
CREATE OR REPLACE FUNCTION public.get_my_workspace_ids()
RETURNS SETOF UUID AS $$
DECLARE
    my_inspector_id UUID;
BEGIN
    my_inspector_id := (SELECT public.get_my_inspector_id());

    RETURN QUERY
    SELECT wm.workspace_id
    FROM public.workspace_members wm
    WHERE wm.user_id = my_inspector_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- update_inspection_history_updated_at
CREATE OR REPLACE FUNCTION public.update_inspection_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE email = (SELECT auth.email())
    LIMIT 1;
    RETURN COALESCE(user_role, 'inspector');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- get_company_primary_location
CREATE OR REPLACE FUNCTION public.get_company_primary_location(company_uuid UUID)
RETURNS TABLE (
    location_id UUID,
    location_name TEXT,
    location_address TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT cl.id, cl.name, cl.address, cl.lat, cl.lng
    FROM public.company_locations cl
    WHERE cl.company_id = company_uuid AND cl.is_primary = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE
SET search_path = public;

-- get_my_email
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT auth.email());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- create_default_board_groups
CREATE OR REPLACE FUNCTION public.create_default_board_groups()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default groups for new boards
    INSERT INTO public.board_groups (board_id, name, color, position)
    VALUES
        (NEW.id, 'To Do', '#579bfc', 0),
        (NEW.id, 'In Progress', '#fdab3d', 1),
        (NEW.id, 'Done', '#00c875', 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- update_company_services_updated_at
CREATE OR REPLACE FUNCTION public.update_company_services_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- ================================================
-- SECTION 4: Fix RLS Policies with auth function re-evaluation
-- Wrap auth.uid() and auth.email() in (SELECT ...) for performance
-- ================================================

-- Note: We need to recreate policies that use auth functions
-- The pattern is: auth.uid() -> (SELECT auth.uid())

-- ================================================
-- 4.1 Companies table policies
-- ================================================

DROP POLICY IF EXISTS "Admins can delete companies" ON public.companies;
DROP POLICY IF EXISTS "Users with permission can create companies" ON public.companies;
DROP POLICY IF EXISTS "Users with permission can update companies" ON public.companies;
DROP POLICY IF EXISTS "companies_delete_secure" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_secure" ON public.companies;
DROP POLICY IF EXISTS "companies_update_secure" ON public.companies;
DROP POLICY IF EXISTS "companies_delete_policy" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_policy" ON public.companies;
DROP POLICY IF EXISTS "companies_update_policy" ON public.companies;

CREATE POLICY "companies_delete_policy" ON public.companies
    FOR DELETE TO authenticated
    USING (public.is_admin_user());

CREATE POLICY "companies_insert_policy" ON public.companies
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_dispatcher());

CREATE POLICY "companies_update_policy" ON public.companies
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_dispatcher());

-- ================================================
-- 4.2 Inspectors table policies
-- ================================================

DROP POLICY IF EXISTS "Admins can create inspectors" ON public.inspectors;
DROP POLICY IF EXISTS "Admins can delete inspectors" ON public.inspectors;
DROP POLICY IF EXISTS "Admins can update inspectors" ON public.inspectors;
DROP POLICY IF EXISTS "inspectors_delete_secure" ON public.inspectors;
DROP POLICY IF EXISTS "inspectors_insert_secure" ON public.inspectors;
DROP POLICY IF EXISTS "inspectors_update_secure" ON public.inspectors;
DROP POLICY IF EXISTS "inspectors_delete_policy" ON public.inspectors;
DROP POLICY IF EXISTS "inspectors_insert_policy" ON public.inspectors;
DROP POLICY IF EXISTS "inspectors_update_policy" ON public.inspectors;

CREATE POLICY "inspectors_delete_policy" ON public.inspectors
    FOR DELETE TO authenticated
    USING (public.is_admin_user());

CREATE POLICY "inspectors_insert_policy" ON public.inspectors
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_user());

CREATE POLICY "inspectors_update_policy" ON public.inspectors
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_user()
        OR email = (SELECT auth.email())
    );

-- ================================================
-- 4.3 Routes table policies
-- ================================================

DROP POLICY IF EXISTS "Admins can delete routes" ON public.routes;
DROP POLICY IF EXISTS "Authenticated users can read routes" ON public.routes;
DROP POLICY IF EXISTS "Dispatchers and admins can create routes" ON public.routes;
DROP POLICY IF EXISTS "Dispatchers and admins can update routes" ON public.routes;
DROP POLICY IF EXISTS "routes_select_policy" ON public.routes;
DROP POLICY IF EXISTS "routes_insert_policy" ON public.routes;
DROP POLICY IF EXISTS "routes_update_policy" ON public.routes;
DROP POLICY IF EXISTS "routes_delete_policy" ON public.routes;

CREATE POLICY "routes_select_policy" ON public.routes
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "routes_insert_policy" ON public.routes
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_dispatcher());

CREATE POLICY "routes_update_policy" ON public.routes
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_dispatcher());

CREATE POLICY "routes_delete_policy" ON public.routes
    FOR DELETE TO authenticated
    USING (public.is_admin_user());

-- ================================================
-- 4.4 Route stops table policies
-- ================================================

DROP POLICY IF EXISTS "Dispatchers can manage route stops" ON public.route_stops;
DROP POLICY IF EXISTS "Users can read route stops for accessible routes" ON public.route_stops;
DROP POLICY IF EXISTS "route_stops_select_policy" ON public.route_stops;
DROP POLICY IF EXISTS "route_stops_all_policy" ON public.route_stops;

CREATE POLICY "route_stops_select_policy" ON public.route_stops
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "route_stops_all_policy" ON public.route_stops
    FOR ALL TO authenticated
    USING (public.is_admin_or_dispatcher())
    WITH CHECK (public.is_admin_or_dispatcher());

-- ================================================
-- 4.5 Inspections table policies
-- ================================================

DROP POLICY IF EXISTS "Admins can delete inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can read inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users can update own inspections" ON public.inspections;
DROP POLICY IF EXISTS "Users with permission can create inspections" ON public.inspections;
DROP POLICY IF EXISTS "inspections_select_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_insert_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_update_policy" ON public.inspections;
DROP POLICY IF EXISTS "inspections_delete_policy" ON public.inspections;

CREATE POLICY "inspections_select_policy" ON public.inspections
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "inspections_insert_policy" ON public.inspections
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_dispatcher());

CREATE POLICY "inspections_update_policy" ON public.inspections
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_or_dispatcher()
        OR inspector_id = (SELECT public.get_my_inspector_id())
    );

CREATE POLICY "inspections_delete_policy" ON public.inspections
    FOR DELETE TO authenticated
    USING (public.is_admin_user());

-- ================================================
-- 4.6 Service types table policies
-- ================================================

DROP POLICY IF EXISTS "Admins can manage service types" ON public.service_types;
DROP POLICY IF EXISTS "service_types_select_policy" ON public.service_types;
DROP POLICY IF EXISTS "service_types_admin_policy" ON public.service_types;

CREATE POLICY "service_types_select_policy" ON public.service_types
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "service_types_admin_policy" ON public.service_types
    FOR ALL TO authenticated
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- ================================================
-- 4.7 Company services table policies
-- ================================================

DROP POLICY IF EXISTS "Admins and dispatchers can manage company services" ON public.company_services;
DROP POLICY IF EXISTS "Authenticated users can insert company_services" ON public.company_services;
DROP POLICY IF EXISTS "Authenticated users can update company_services" ON public.company_services;
DROP POLICY IF EXISTS "company_services_select_policy" ON public.company_services;
DROP POLICY IF EXISTS "company_services_manage_policy" ON public.company_services;

CREATE POLICY "company_services_select_policy" ON public.company_services
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "company_services_manage_policy" ON public.company_services
    FOR ALL TO authenticated
    USING (public.is_admin_or_dispatcher())
    WITH CHECK (public.is_admin_or_dispatcher());

-- ================================================
-- 4.8 Inspection history table policies
-- ================================================

DROP POLICY IF EXISTS "Inspectors can insert their own inspections" ON public.inspection_history;
DROP POLICY IF EXISTS "Inspectors can update their own inspections" ON public.inspection_history;
DROP POLICY IF EXISTS "inspection_history_select_policy" ON public.inspection_history;
DROP POLICY IF EXISTS "inspection_history_insert_policy" ON public.inspection_history;
DROP POLICY IF EXISTS "inspection_history_update_policy" ON public.inspection_history;

CREATE POLICY "inspection_history_select_policy" ON public.inspection_history
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "inspection_history_insert_policy" ON public.inspection_history
    FOR INSERT TO authenticated
    WITH CHECK (
        inspector_id = (SELECT public.get_my_inspector_id())
        OR public.is_admin_or_dispatcher()
    );

CREATE POLICY "inspection_history_update_policy" ON public.inspection_history
    FOR UPDATE TO authenticated
    USING (
        inspector_id = (SELECT public.get_my_inspector_id())
        OR public.is_admin_or_dispatcher()
    );

-- ================================================
-- 4.9 Reassignment history table policies
-- ================================================

DROP POLICY IF EXISTS "Admins can create reassignment records" ON public.reassignment_history;
DROP POLICY IF EXISTS "reassignment_history_select_policy" ON public.reassignment_history;
DROP POLICY IF EXISTS "reassignment_history_insert_policy" ON public.reassignment_history;

CREATE POLICY "reassignment_history_select_policy" ON public.reassignment_history
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "reassignment_history_insert_policy" ON public.reassignment_history
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_dispatcher());

-- ================================================
-- 4.10 User roles table policies
-- ================================================

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_policy" ON public.user_roles;

CREATE POLICY "user_roles_select_own_policy" ON public.user_roles
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR public.is_admin_user()
    );

CREATE POLICY "user_roles_admin_policy" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_admin_user())
    WITH CHECK (public.is_admin_user());

-- ================================================
-- 4.11 PDP compliance phases table policies
-- ================================================

DROP POLICY IF EXISTS "Delete compliance phases" ON public.pdp_compliance_phases;
DROP POLICY IF EXISTS "Insert compliance phases" ON public.pdp_compliance_phases;
DROP POLICY IF EXISTS "Update compliance phases" ON public.pdp_compliance_phases;
DROP POLICY IF EXISTS "View compliance phases" ON public.pdp_compliance_phases;
DROP POLICY IF EXISTS "pdp_compliance_select_policy" ON public.pdp_compliance_phases;
DROP POLICY IF EXISTS "pdp_compliance_manage_policy" ON public.pdp_compliance_phases;

CREATE POLICY "pdp_compliance_select_policy" ON public.pdp_compliance_phases
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "pdp_compliance_manage_policy" ON public.pdp_compliance_phases
    FOR ALL TO authenticated
    USING (public.is_admin_or_dispatcher())
    WITH CHECK (public.is_admin_or_dispatcher());

-- ================================================
-- 4.12 Board columns table policies
-- ================================================

DROP POLICY IF EXISTS "columns_delete_secure" ON public.board_columns;
DROP POLICY IF EXISTS "columns_insert_secure" ON public.board_columns;
DROP POLICY IF EXISTS "columns_update_secure" ON public.board_columns;
DROP POLICY IF EXISTS "board_columns_select_policy" ON public.board_columns;
DROP POLICY IF EXISTS "board_columns_manage_policy" ON public.board_columns;

CREATE POLICY "board_columns_select_policy" ON public.board_columns
    FOR SELECT TO authenticated
    USING (public.can_access_board(board_id));

CREATE POLICY "board_columns_manage_policy" ON public.board_columns
    FOR ALL TO authenticated
    USING (public.can_edit_board(board_id))
    WITH CHECK (public.can_edit_board(board_id));

-- ================================================
-- 4.13 Board views table policies
-- ================================================
-- Note: board_views has board_type (varchar), not board_id (uuid)
-- These are user-specific saved views for different board types

DROP POLICY IF EXISTS "Users can manage own views" ON public.board_views;
DROP POLICY IF EXISTS "Users can manage their own views" ON public.board_views;
DROP POLICY IF EXISTS "board_views_select_policy" ON public.board_views;
DROP POLICY IF EXISTS "board_views_manage_policy" ON public.board_views;

CREATE POLICY "board_views_select_policy" ON public.board_views
    FOR SELECT TO authenticated
    USING (
        user_id = (SELECT public.get_my_inspector_id())
        OR is_shared = true
    );

CREATE POLICY "board_views_manage_policy" ON public.board_views
    FOR ALL TO authenticated
    USING (user_id = (SELECT public.get_my_inspector_id()))
    WITH CHECK (user_id = (SELECT public.get_my_inspector_id()));

-- ================================================
-- 4.14 Company locations table policies
-- ================================================

DROP POLICY IF EXISTS "Admins and dispatchers can manage locations" ON public.company_locations;
DROP POLICY IF EXISTS "company_locations_select_policy" ON public.company_locations;
DROP POLICY IF EXISTS "company_locations_manage_policy" ON public.company_locations;

CREATE POLICY "company_locations_select_policy" ON public.company_locations
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "company_locations_manage_policy" ON public.company_locations
    FOR ALL TO authenticated
    USING (public.is_admin_or_dispatcher())
    WITH CHECK (public.is_admin_or_dispatcher());

-- ================================================
-- 4.15 Workspaces table policies
-- ================================================

DROP POLICY IF EXISTS "workspaces_update_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON public.workspaces;

CREATE POLICY "workspaces_update_policy" ON public.workspaces
    FOR UPDATE TO authenticated
    USING (public.is_workspace_admin(id));

CREATE POLICY "workspaces_delete_policy" ON public.workspaces
    FOR DELETE TO authenticated
    USING (
        public.is_workspace_owner(id)
        AND is_default = false
    );

-- ================================================
-- 4.16 Workspace members table policies
-- ================================================

DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON public.workspace_members;

CREATE POLICY "workspace_members_select_policy" ON public.workspace_members
    FOR SELECT TO authenticated
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_insert_policy" ON public.workspace_members
    FOR INSERT TO authenticated
    WITH CHECK (public.is_workspace_admin(workspace_id));

CREATE POLICY "workspace_members_update_policy" ON public.workspace_members
    FOR UPDATE TO authenticated
    USING (public.is_workspace_admin(workspace_id));

CREATE POLICY "workspace_members_delete_policy" ON public.workspace_members
    FOR DELETE TO authenticated
    USING (
        public.is_workspace_admin(workspace_id)
        AND role != 'owner'
    );

-- ================================================
-- 4.17 Boards table policies
-- ================================================

DROP POLICY IF EXISTS "boards_select_policy" ON public.boards;
DROP POLICY IF EXISTS "boards_update_policy" ON public.boards;
DROP POLICY IF EXISTS "boards_delete_policy" ON public.boards;

CREATE POLICY "boards_select_policy" ON public.boards
    FOR SELECT TO authenticated
    USING (public.can_access_board(id));

CREATE POLICY "boards_update_policy" ON public.boards
    FOR UPDATE TO authenticated
    USING (public.can_edit_board(id));

CREATE POLICY "boards_delete_policy" ON public.boards
    FOR DELETE TO authenticated
    USING (
        owner_id = (SELECT public.get_my_inspector_id())
        OR public.is_workspace_admin(workspace_id)
    );

-- ================================================
-- 4.18 Board groups table policies
-- ================================================

DROP POLICY IF EXISTS "board_groups_select_policy" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_insert_policy" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_update_policy" ON public.board_groups;
DROP POLICY IF EXISTS "board_groups_delete_policy" ON public.board_groups;

CREATE POLICY "board_groups_select_policy" ON public.board_groups
    FOR SELECT TO authenticated
    USING (public.can_access_board(board_id));

CREATE POLICY "board_groups_insert_policy" ON public.board_groups
    FOR INSERT TO authenticated
    WITH CHECK (public.can_edit_board(board_id));

CREATE POLICY "board_groups_update_policy" ON public.board_groups
    FOR UPDATE TO authenticated
    USING (public.can_edit_board(board_id));

CREATE POLICY "board_groups_delete_policy" ON public.board_groups
    FOR DELETE TO authenticated
    USING (public.can_edit_board(board_id));

-- ================================================
-- 4.19 Board items table policies
-- ================================================

DROP POLICY IF EXISTS "board_items_select_policy" ON public.board_items;
DROP POLICY IF EXISTS "board_items_insert_policy" ON public.board_items;
DROP POLICY IF EXISTS "board_items_update_policy" ON public.board_items;
DROP POLICY IF EXISTS "board_items_delete_policy" ON public.board_items;

CREATE POLICY "board_items_select_policy" ON public.board_items
    FOR SELECT TO authenticated
    USING (public.can_access_board(board_id));

CREATE POLICY "board_items_insert_policy" ON public.board_items
    FOR INSERT TO authenticated
    WITH CHECK (public.can_edit_board(board_id));

CREATE POLICY "board_items_update_policy" ON public.board_items
    FOR UPDATE TO authenticated
    USING (public.can_edit_board(board_id));

CREATE POLICY "board_items_delete_policy" ON public.board_items
    FOR DELETE TO authenticated
    USING (public.can_edit_board(board_id));

-- ================================================
-- 4.20 Item values table policies
-- ================================================
-- NOTE: item_values table does not exist in this database, skipping policies

-- ================================================
-- 4.21 Item updates table policies
-- ================================================

DROP POLICY IF EXISTS "item_updates_select_policy" ON public.item_updates;
DROP POLICY IF EXISTS "item_updates_insert_policy" ON public.item_updates;

CREATE POLICY "item_updates_select_policy" ON public.item_updates
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.board_items bi
            WHERE bi.id = item_id AND public.can_access_board(bi.board_id)
        )
    );

CREATE POLICY "item_updates_insert_policy" ON public.item_updates
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.board_items bi
            WHERE bi.id = item_id AND public.can_edit_board(bi.board_id)
        )
    );

-- ================================================
-- 4.22 Board members table policies
-- ================================================

DROP POLICY IF EXISTS "board_members_select_policy" ON public.board_members;
DROP POLICY IF EXISTS "board_members_insert_policy" ON public.board_members;
DROP POLICY IF EXISTS "board_members_update_policy" ON public.board_members;
DROP POLICY IF EXISTS "board_members_delete_policy" ON public.board_members;

CREATE POLICY "board_members_select_policy" ON public.board_members
    FOR SELECT TO authenticated
    USING (public.can_access_board(board_id));

CREATE POLICY "board_members_insert_policy" ON public.board_members
    FOR INSERT TO authenticated
    WITH CHECK (public.can_edit_board(board_id));

CREATE POLICY "board_members_update_policy" ON public.board_members
    FOR UPDATE TO authenticated
    USING (public.can_edit_board(board_id));

CREATE POLICY "board_members_delete_policy" ON public.board_members
    FOR DELETE TO authenticated
    USING (public.can_edit_board(board_id));

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
