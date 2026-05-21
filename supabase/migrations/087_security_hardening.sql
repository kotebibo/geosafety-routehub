-- ============================================================
-- 087: Security Hardening
-- Safe to run on all 3 instances (idempotent)
-- ============================================================

-- ============================================================
-- 1. Fix is_admin_or_dispatcher() — broken on Team1 (uses ur.email)
--    Team2/Team3 already have correct version, CREATE OR REPLACE is safe
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_dispatcher()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'dispatcher')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- ============================================================
-- 2. Add auth check to setup_admin_user()
--    Currently has NO permission check — anyone can call it
-- ============================================================
CREATE OR REPLACE FUNCTION public.setup_admin_user(user_email TEXT)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
  target_inspector_id UUID;
BEGIN
  -- Only existing admins can set up new admins
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Only admins can set up admin users';
  END IF;

  SELECT id INTO target_user_id FROM auth.users WHERE email = user_email;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  -- Create or update inspector record
  INSERT INTO public.inspectors (email, full_name, role, user_id)
  VALUES (user_email, split_part(user_email, '@', 1), 'admin', target_user_id)
  ON CONFLICT (email) DO UPDATE SET role = 'admin', user_id = target_user_id
  RETURNING id INTO target_inspector_id;

  -- Create or update user_roles record
  INSERT INTO public.user_roles (user_id, role, inspector_id)
  VALUES (target_user_id, 'admin', target_inspector_id)
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin', inspector_id = target_inspector_id;

  -- Create or update users record
  INSERT INTO public.users (id, email, full_name, is_active)
  VALUES (target_user_id, user_email, split_part(user_email, '@', 1), true)
  ON CONFLICT (id) DO UPDATE SET is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- 3. Revoke anon EXECUTE on dangerous SECURITY DEFINER functions
--    The app always uses authenticated role, never anon.
--    Wrapped in DO block so missing functions don't abort.
-- ============================================================
DO $$
DECLARE
  fn TEXT;
  fns TEXT[] := ARRAY[
    'promote_to_admin(text)',
    'setup_admin_user(text)',
    'get_auth_user_id_by_email(text)',
    'match_bank_transaction(uuid)',
    'can_access_board(uuid)',
    'can_edit_board(uuid)',
    'duplicate_board(uuid, text, uuid)',
    'create_notification(uuid, text, text, text, jsonb)',
    'get_current_user_id()',
    'get_my_email()',
    'get_my_inspector_id()',
    'get_my_workspace_ids()',
    'get_current_inspector_id()',
    'get_user_inspector_id()',
    'get_user_role()',
    'has_permission(text)',
    'is_admin_user()',
    'is_admin_or_dispatcher()',
    'is_workspace_admin(uuid)',
    'is_workspace_board_manager(uuid)',
    'is_workspace_member(uuid)',
    'is_workspace_owner(uuid)',
    'mark_all_notifications_read()',
    'mark_notification_read(uuid)',
    'get_unread_notification_count()',
    'get_user_activity_summary(uuid, integer)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon', fn);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC', fn);
      -- Re-grant to authenticated (they need these functions)
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      -- Function doesn't exist on this instance, skip
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 4. Restrict admin_user_overview view
--    Team1 doesn't have it. Team2 has anon FULL CRUD. Team3 has anon SELECT.
--    Revoke everything from anon, keep authenticated SELECT only.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'admin_user_overview' AND schemaname = 'public') THEN
    REVOKE ALL ON public.admin_user_overview FROM anon;
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.admin_user_overview FROM authenticated;
    -- authenticated keeps SELECT (admin page needs it, admin check is done app-side)
  END IF;
END $$;

-- ============================================================
-- 5. Fix bank_transactions INSERT policy (Team2 has WITH CHECK true)
--    Team1 doesn't have the table. Team3 already fixed.
--    Safe to run on all — DROP IF EXISTS + CREATE IF table exists.
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bank_transactions' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "bank_transactions_insert" ON public.bank_transactions;
    EXECUTE 'CREATE POLICY "bank_transactions_insert" ON public.bank_transactions FOR INSERT TO authenticated WITH CHECK (is_admin_or_dispatcher())';

    DROP POLICY IF EXISTS "payment_matches_insert" ON public.payment_matches;
    EXECUTE 'CREATE POLICY "payment_matches_insert" ON public.payment_matches FOR INSERT TO authenticated WITH CHECK (is_admin_or_dispatcher())';
  END IF;
END $$;

-- ============================================================
-- 6. Enable RLS on unprotected tables (Team2 has them disabled)
--    Team1/Team3 already have RLS enabled — this is a no-op for them.
-- ============================================================
ALTER TABLE IF EXISTS public.company_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inspection_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reassignment_history ENABLE ROW LEVEL SECURITY;

-- Ensure policies exist for these tables (Team2 may be missing them)
-- company_services
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_services' AND policyname = 'company_services_select') THEN
    EXECUTE 'CREATE POLICY "company_services_select" ON public.company_services FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_services' AND policyname = 'company_services_write') THEN
    EXECUTE 'CREATE POLICY "company_services_write" ON public.company_services FOR ALL TO authenticated USING (is_admin_or_dispatcher()) WITH CHECK (is_admin_or_dispatcher())';
  END IF;
END $$;

-- service_types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_types' AND policyname = 'service_types_select') THEN
    EXECUTE 'CREATE POLICY "service_types_select" ON public.service_types FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_types' AND policyname = 'service_types_write') THEN
    EXECUTE 'CREATE POLICY "service_types_write" ON public.service_types FOR ALL TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user())';
  END IF;
END $$;

-- inspection_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspection_history' AND policyname = 'inspection_history_select') THEN
    EXECUTE 'CREATE POLICY "inspection_history_select" ON public.inspection_history FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inspection_history' AND policyname = 'inspection_history_write') THEN
    EXECUTE 'CREATE POLICY "inspection_history_write" ON public.inspection_history FOR ALL TO authenticated USING (is_admin_or_dispatcher()) WITH CHECK (is_admin_or_dispatcher())';
  END IF;
END $$;

-- reassignment_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reassignment_history' AND policyname = 'reassignment_history_select') THEN
    EXECUTE 'CREATE POLICY "reassignment_history_select" ON public.reassignment_history FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reassignment_history' AND policyname = 'reassignment_history_write') THEN
    EXECUTE 'CREATE POLICY "reassignment_history_write" ON public.reassignment_history FOR ALL TO authenticated USING (is_admin_or_dispatcher()) WITH CHECK (is_admin_or_dispatcher())';
  END IF;
END $$;

-- ============================================================
-- 7. Drop old 2-arg function overloads that are NOT used by policies
--    can_access_board(uuid,uuid) returns always-true — dangerous.
--    NOTE: user_is_board_member, user_is_board_owner,
--    user_is_workspace_member, user_is_workspace_owner are KEPT
--    because Team1 boards/board_members/workspace_members policies
--    actively depend on them.
-- ============================================================
DROP FUNCTION IF EXISTS public.can_access_board(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_edit_board(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
DROP FUNCTION IF EXISTS public.is_admin_or_dispatcher(uuid);
DROP FUNCTION IF EXISTS public.get_user_inspector_id(uuid);
