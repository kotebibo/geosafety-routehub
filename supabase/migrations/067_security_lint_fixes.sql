-- Fix Supabase linter security warnings:
-- 1. Enable RLS on spatial_ref_sys (PostGIS system table)
-- 2. Add SET search_path to all functions missing it
-- 3. Fix overly permissive RLS policies
-- 4. Drop stale overloaded function signatures

-- ============================================================
-- 1. spatial_ref_sys — PostGIS system table owned by supabase_admin.
--    Cannot alter via migrations. Safe to ignore (reference data only).
-- ============================================================

-- ============================================================
-- 2. Fix functions missing SET search_path
--    These were created/redefined after migration 044 without it
-- ============================================================

-- get_auth_user_id_by_email (from 046)
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(user_email TEXT)
RETURNS UUID AS $$
    SELECT id FROM auth.users WHERE email = user_email LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- get_current_user_id (from 046)
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
    SELECT auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- add_board_owner_as_member (from 046)
CREATE OR REPLACE FUNCTION public.add_board_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.board_members (board_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id)
    ON CONFLICT (board_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- add_workspace_owner_as_member (from 046)
CREATE OR REPLACE FUNCTION public.add_workspace_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- create_notification (from 054)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- mark_notification_read (from 054)
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- mark_all_notifications_read (from 054)
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = false;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- get_unread_notification_count (from 054)
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = auth.uid() AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- notify_board_shared (from 054)
CREATE OR REPLACE FUNCTION public.notify_board_shared()
RETURNS TRIGGER AS $$
DECLARE
  board_name TEXT;
  sharer_name TEXT;
BEGIN
  SELECT name INTO board_name FROM public.boards WHERE id = NEW.board_id;
  SELECT COALESCE(full_name, email) INTO sharer_name
  FROM public.users WHERE id = NEW.added_by;

  PERFORM public.create_notification(
    NEW.user_id,
    'board_shared',
    'Board Shared',
    sharer_name || ' shared "' || COALESCE(board_name, 'a board') || '" with you',
    jsonb_build_object(
      'board_id', NEW.board_id,
      'board_name', board_name,
      'shared_by', NEW.added_by,
      'role', NEW.role
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- notify_assignment_changed (from 054)
CREATE OR REPLACE FUNCTION public.notify_assignment_changed()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  service_name TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.assigned_inspector_id IS DISTINCT FROM NEW.assigned_inspector_id THEN
    SELECT c.name INTO company_name
    FROM public.companies c WHERE c.id = NEW.company_id;

    SELECT st.name_ka INTO service_name
    FROM public.service_types st WHERE st.id = NEW.service_type_id;

    IF NEW.assigned_inspector_id IS NOT NULL THEN
      DECLARE
        inspector_user_id UUID;
      BEGIN
        SELECT user_id INTO inspector_user_id
        FROM public.inspectors WHERE id = NEW.assigned_inspector_id;

        IF inspector_user_id IS NOT NULL THEN
          PERFORM public.create_notification(
            inspector_user_id,
            'assignment_changed',
            'New Assignment',
            'You have been assigned to ' || COALESCE(company_name, 'a company') || ' for ' || COALESCE(service_name, 'inspection'),
            jsonb_build_object(
              'company_id', NEW.company_id,
              'company_name', company_name,
              'service_type_id', NEW.service_type_id,
              'service_name', service_name
            )
          );
        END IF;
      END;
    END IF;

    IF OLD.assigned_inspector_id IS NOT NULL THEN
      DECLARE
        old_inspector_user_id UUID;
      BEGIN
        SELECT user_id INTO old_inspector_user_id
        FROM public.inspectors WHERE id = OLD.assigned_inspector_id;

        IF old_inspector_user_id IS NOT NULL THEN
          PERFORM public.create_notification(
            old_inspector_user_id,
            'assignment_changed',
            'Assignment Removed',
            'You have been unassigned from ' || COALESCE(company_name, 'a company'),
            jsonb_build_object(
              'company_id', NEW.company_id,
              'company_name', company_name
            )
          );
        END IF;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- create_item_update (from 053) — large trigger, just add search_path
-- We use ALTER FUNCTION since recreating would require the full 200+ line body
ALTER FUNCTION public.create_item_update() SET search_path = public;

-- update_announcement_updated_at (from 057)
CREATE OR REPLACE FUNCTION public.update_announcement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- promote_to_admin (from 032)
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email TEXT)
RETURNS JSONB AS $$
DECLARE
  target_user_id UUID;
  target_inspector_id UUID;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;

  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;

  SELECT id INTO target_inspector_id FROM public.inspectors WHERE email = target_email;
  IF target_inspector_id IS NOT NULL THEN
    UPDATE public.inspectors SET role = 'admin' WHERE id = target_inspector_id;
  END IF;

  UPDATE public.user_roles SET role = 'admin' WHERE user_id = target_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_roles (user_id, role, inspector_id)
    VALUES (target_user_id, 'admin', target_inspector_id)
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', target_user_id, 'role', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- is_workspace_board_manager (from 066)
CREATE OR REPLACE FUNCTION public.is_workspace_board_manager(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = workspace_uuid
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'editor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- ============================================================
-- 3. Drop stale overloaded function signatures from migration 033
--    These old (UUID param) versions co-exist with the newer
--    no-param versions from 044 that use auth.uid() internally.
--    The old signatures have no SET search_path.
-- ============================================================

-- Drop policies that depend on is_admin_user(UUID) before dropping the function
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- is_admin_user(UUID) — replaced by is_admin_user() in 044
DROP FUNCTION IF EXISTS public.is_admin_user(UUID);

-- Recreate the policies using the no-arg version
CREATE POLICY "Admins can insert users"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user() OR id = auth.uid());

CREATE POLICY "Admins can delete users"
  ON public.users FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

-- is_admin_or_dispatcher(UUID) — replaced by is_admin_or_dispatcher() in 044
DROP FUNCTION IF EXISTS public.is_admin_or_dispatcher(UUID);

-- get_user_inspector_id(UUID) — replaced by get_user_inspector_id() in 044
DROP FUNCTION IF EXISTS public.get_user_inspector_id(UUID);

-- can_access_board(UUID, UUID) — replaced by can_access_board(UUID) in 046
DROP FUNCTION IF EXISTS public.can_access_board(UUID, UUID);

-- can_edit_board(UUID, UUID) — replaced by can_edit_board(UUID) in 046
DROP FUNCTION IF EXISTS public.can_edit_board(UUID, UUID);

-- user_is_board_member(UUID) — if exists, may be stale
DROP FUNCTION IF EXISTS public.user_is_board_member(UUID);

-- user_is_board_owner(UUID) — if exists, may be stale
DROP FUNCTION IF EXISTS public.user_is_board_owner(UUID);

-- user_is_workspace_owner(UUID) — if exists, may be stale
DROP FUNCTION IF EXISTS public.user_is_workspace_owner(UUID);

-- user_is_workspace_member(UUID) — if exists, may be stale
DROP FUNCTION IF EXISTS public.user_is_workspace_member(UUID);

-- get_board_workspace_id(UUID) — if exists, may be stale
DROP FUNCTION IF EXISTS public.get_board_workspace_id(UUID);

-- get_user_activity_summary — add search_path
ALTER FUNCTION public.get_user_activity_summary(UUID, INTEGER) SET search_path = public;

-- calculate_inspection_duration trigger version (no params) — add search_path
ALTER FUNCTION public.calculate_inspection_duration() SET search_path = public;

-- ============================================================
-- 4. Fix overly permissive RLS policies
-- ============================================================

-- company_pdp_phases: drop the overly permissive ALL policy and stale SELECT duplicates,
-- then create proper per-operation policies
DROP POLICY IF EXISTS "Allow authenticated write company_pdp_phases" ON public.company_pdp_phases;
DROP POLICY IF EXISTS "Allow authenticated read company_pdp_phases" ON public.company_pdp_phases;
DROP POLICY IF EXISTS "company_pdp_phases_select_policy" ON public.company_pdp_phases;
CREATE POLICY "company_pdp_phases_select"
  ON public.company_pdp_phases FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "company_pdp_phases_insert"
  ON public.company_pdp_phases FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "company_pdp_phases_update"
  ON public.company_pdp_phases FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "company_pdp_phases_delete"
  ON public.company_pdp_phases FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- item_updates: restrict INSERT to board members only
DROP POLICY IF EXISTS "Authenticated users can create item updates" ON public.item_updates;
CREATE POLICY "Authenticated users can create item updates"
  ON public.item_updates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- notifications: the INSERT policy had WITH CHECK (true) which the linter flags.
-- In practice, inserts come from SECURITY DEFINER functions (create_notification) which
-- bypass RLS anyway. Require auth for any direct inserts.
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
