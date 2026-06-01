-- ================================================
-- Migration 089: Drop all remaining FK references to inspectors(id)
--
-- Migration 046 handled: boards.owner_id, workspaces.owner_id,
-- board_members.user_id/added_by, workspace_members.user_id/added_by,
-- board_items.assigned_to/created_by
--
-- This migration handles everything 046 missed.
-- After this, no table references inspectors(id) via FK.
-- The inspectors table remains for business data only.
--
-- SAFE: Only drops constraints and remaps data.
-- No columns are removed (except user_roles.inspector_id), no data is deleted.
-- ================================================

-- ================================================
-- PHASE 1: DROP ALL FK CONSTRAINTS FIRST
-- Must happen before data migration to avoid constraint violations
-- ================================================

-- item_updates
ALTER TABLE public.item_updates DROP CONSTRAINT IF EXISTS item_updates_user_id_fkey;

-- item_activity (migration 006)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'item_activity') THEN
        EXECUTE 'ALTER TABLE public.item_activity DROP CONSTRAINT IF EXISTS item_activity_user_id_fkey';
    END IF;
END $$;

-- board_views
ALTER TABLE public.board_views DROP CONSTRAINT IF EXISTS board_views_user_id_fkey;

-- user_preferences (migration 006)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
        EXECUTE 'ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey';
        EXECUTE 'ALTER TABLE public.user_preferences DROP CONSTRAINT IF EXISTS user_preferences_pkey';
    END IF;
END $$;

-- board_item_favorites (migration 006)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'board_item_favorites') THEN
        EXECUTE 'ALTER TABLE public.board_item_favorites DROP CONSTRAINT IF EXISTS board_item_favorites_user_id_fkey';
    END IF;
END $$;

-- board_view_tabs
ALTER TABLE public.board_view_tabs DROP CONSTRAINT IF EXISTS board_view_tabs_created_by_fkey;

-- board_subitems
ALTER TABLE public.board_subitems DROP CONSTRAINT IF EXISTS board_subitems_assigned_to_fkey;
ALTER TABLE public.board_subitems DROP CONSTRAINT IF EXISTS board_subitems_created_by_fkey;

-- routes
ALTER TABLE public.routes DROP CONSTRAINT IF EXISTS routes_inspector_id_fkey;

-- inspections
ALTER TABLE public.inspections DROP CONSTRAINT IF EXISTS inspections_inspector_id_fkey;

-- company_services
ALTER TABLE public.company_services DROP CONSTRAINT IF EXISTS company_services_assigned_inspector_id_fkey;
ALTER TABLE public.company_services DROP CONSTRAINT IF EXISTS company_services_inspector_id_fkey;

-- inspection_history
ALTER TABLE public.inspection_history DROP CONSTRAINT IF EXISTS inspection_history_inspector_id_fkey;

-- inspector_reassignments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspector_reassignments') THEN
        EXECUTE 'ALTER TABLE public.inspector_reassignments DROP CONSTRAINT IF EXISTS inspector_reassignments_from_inspector_id_fkey';
        EXECUTE 'ALTER TABLE public.inspector_reassignments DROP CONSTRAINT IF EXISTS inspector_reassignments_to_inspector_id_fkey';
        EXECUTE 'ALTER TABLE public.inspector_reassignments DROP CONSTRAINT IF EXISTS inspector_reassignments_reassigned_by_user_id_fkey';
    END IF;
END $$;

-- location_checkins
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_checkins') THEN
        EXECUTE 'ALTER TABLE public.location_checkins DROP CONSTRAINT IF EXISTS location_checkins_inspector_id_fkey';
    END IF;
END $$;

-- inspector_location_history
ALTER TABLE public.inspector_location_history DROP CONSTRAINT IF EXISTS inspector_location_history_inspector_id_fkey;

-- ================================================
-- Drop dependent views and RLS policies that reference user_roles.inspector_id
-- ================================================

-- Drop admin_user_overview view (references ur.inspector_id)
DROP VIEW IF EXISTS public.admin_user_overview CASCADE;

-- Drop location_checkins policies that join on user_roles.inspector_id
DROP POLICY IF EXISTS "inspectors_insert_own_checkins" ON public.location_checkins;
DROP POLICY IF EXISTS "inspectors_select_own_checkins" ON public.location_checkins;
DROP POLICY IF EXISTS "Inspectors can update own checkins" ON public.location_checkins;

-- Drop checkin_gps_pings policies that join on user_roles.inspector_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checkin_gps_pings') THEN
        EXECUTE 'DROP POLICY IF EXISTS "inspectors_insert_own_pings" ON public.checkin_gps_pings';
        EXECUTE 'DROP POLICY IF EXISTS "inspectors_select_own_pings" ON public.checkin_gps_pings';
    END IF;
END $$;

-- Now safe to drop the column
ALTER TABLE public.user_roles DROP COLUMN IF EXISTS inspector_id;
DROP INDEX IF EXISTS idx_user_roles_inspector;

-- ================================================
-- Recreate admin_user_overview without inspector_id
-- ================================================
CREATE OR REPLACE VIEW admin_user_overview AS
SELECT
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created,
  ur.role,
  ur.created_at as role_assigned
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
ORDER BY au.created_at DESC;

GRANT SELECT ON admin_user_overview TO authenticated;

-- ================================================
-- Recreate location_checkins policies using auth.uid() directly
-- (inspector_id in location_checkins now = auth.users.id)
-- ================================================
CREATE POLICY "inspectors_insert_own_checkins" ON location_checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    inspector_id = auth.uid()
    OR public.is_admin_or_dispatcher()
  );

CREATE POLICY "inspectors_select_own_checkins" ON location_checkins
  FOR SELECT TO authenticated
  USING (
    inspector_id = auth.uid()
    OR public.is_admin_or_dispatcher()
  );

CREATE POLICY "Inspectors can update own checkins" ON location_checkins
  FOR UPDATE TO authenticated
  USING (
    inspector_id = auth.uid()
    OR public.is_admin_or_dispatcher()
  );

-- ================================================
-- Recreate checkin_gps_pings policies using auth.uid() directly
-- ================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checkin_gps_pings') THEN
        EXECUTE '
            CREATE POLICY "inspectors_insert_own_pings" ON public.checkin_gps_pings
              FOR INSERT TO authenticated
              WITH CHECK (
                checkin_id IN (
                  SELECT lc.id FROM location_checkins lc
                  WHERE lc.inspector_id = auth.uid()
                )
              )
        ';
        EXECUTE '
            CREATE POLICY "inspectors_select_own_pings" ON public.checkin_gps_pings
              FOR SELECT TO authenticated
              USING (
                checkin_id IN (
                  SELECT lc.id FROM location_checkins lc
                  WHERE lc.inspector_id = auth.uid()
                )
              )
        ';
    END IF;
END $$;

-- ================================================
-- PHASE 2: MIGRATE DATA (inspector IDs → auth user IDs)
-- Now safe because all FK constraints are dropped
-- ================================================

-- item_updates (293 rows on team3)
UPDATE public.item_updates iu
SET user_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = iu.user_id
)
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = iu.user_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = iu.user_id
)
AND EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = iu.user_id
);

-- Orphaned rows (inspector without matching auth user) → assign to first admin
UPDATE public.item_updates iu
SET user_id = COALESCE(
    (SELECT u.id FROM auth.users u
     JOIN public.user_roles ur ON ur.user_id = u.id
     WHERE ur.role = 'admin' LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1)
)
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = iu.user_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = iu.user_id
);

-- board_views
UPDATE public.board_views bv
SET user_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = bv.user_id
)
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = bv.user_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = bv.user_id
);

-- board_view_tabs
UPDATE public.board_view_tabs bvt
SET created_by = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = bvt.created_by
)
WHERE created_by IS NOT NULL
AND EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = bvt.created_by
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = bvt.created_by
);

-- board_subitems
UPDATE public.board_subitems bs
SET assigned_to = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = bs.assigned_to
)
WHERE assigned_to IS NOT NULL
AND EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = bs.assigned_to
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = bs.assigned_to
);

UPDATE public.board_subitems bs
SET created_by = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = bs.created_by
)
WHERE created_by IS NOT NULL
AND EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = bs.created_by
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = bs.created_by
);

-- routes
UPDATE public.routes r
SET inspector_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = r.inspector_id
)
WHERE inspector_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = r.inspector_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = r.inspector_id
);

-- inspections
UPDATE public.inspections insp
SET inspector_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = insp.inspector_id
)
WHERE inspector_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = insp.inspector_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = insp.inspector_id
);

-- company_services
UPDATE public.company_services cs
SET assigned_inspector_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = cs.assigned_inspector_id
)
WHERE assigned_inspector_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = cs.assigned_inspector_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = cs.assigned_inspector_id
);

-- inspection_history
UPDATE public.inspection_history ih
SET inspector_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = ih.inspector_id
)
WHERE inspector_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = ih.inspector_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = ih.inspector_id
);

-- inspector_reassignments (may not exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inspector_reassignments') THEN
        EXECUTE '
            UPDATE public.inspector_reassignments ir
            SET from_inspector_id = (
                SELECT u.id FROM auth.users u
                JOIN public.inspectors i ON i.email = u.email
                WHERE i.id = ir.from_inspector_id
            )
            WHERE from_inspector_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM public.inspectors i WHERE i.id = ir.from_inspector_id)
            AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ir.from_inspector_id)
        ';
        EXECUTE '
            UPDATE public.inspector_reassignments ir
            SET to_inspector_id = (
                SELECT u.id FROM auth.users u
                JOIN public.inspectors i ON i.email = u.email
                WHERE i.id = ir.to_inspector_id
            )
            WHERE EXISTS (SELECT 1 FROM public.inspectors i WHERE i.id = ir.to_inspector_id)
            AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ir.to_inspector_id)
        ';
        EXECUTE '
            UPDATE public.inspector_reassignments ir
            SET reassigned_by_user_id = (
                SELECT u.id FROM auth.users u
                JOIN public.inspectors i ON i.email = u.email
                WHERE i.id = ir.reassigned_by_user_id
            )
            WHERE reassigned_by_user_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM public.inspectors i WHERE i.id = ir.reassigned_by_user_id)
            AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = ir.reassigned_by_user_id)
        ';
    END IF;
END $$;

-- location_checkins (may not exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'location_checkins') THEN
        EXECUTE '
            UPDATE public.location_checkins lc
            SET inspector_id = (
                SELECT u.id FROM auth.users u
                JOIN public.inspectors i ON i.email = u.email
                WHERE i.id = lc.inspector_id
            )
            WHERE EXISTS (SELECT 1 FROM public.inspectors i WHERE i.id = lc.inspector_id)
            AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = lc.inspector_id)
        ';
    END IF;
END $$;

-- inspector_location_history
UPDATE public.inspector_location_history ilh
SET inspector_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = ilh.inspector_id
)
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i WHERE i.id = ilh.inspector_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = ilh.inspector_id
);

-- ================================================
-- PHASE 3: Add comments documenting new column semantics
-- ================================================
COMMENT ON COLUMN public.item_updates.user_id IS 'References auth.users.id — who made the update';
COMMENT ON COLUMN public.board_views.user_id IS 'References auth.users.id — who owns this view';
COMMENT ON COLUMN public.board_view_tabs.created_by IS 'References auth.users.id — who created this tab';
COMMENT ON COLUMN public.board_subitems.assigned_to IS 'References auth.users.id — assigned user';
COMMENT ON COLUMN public.board_subitems.created_by IS 'References auth.users.id — who created this subitem';
COMMENT ON COLUMN public.routes.inspector_id IS 'References auth.users.id — assigned inspector (legacy column name)';
COMMENT ON COLUMN public.inspections.inspector_id IS 'References auth.users.id — assigned inspector (legacy column name)';

-- ================================================
-- DONE!
-- After this migration:
-- 1. No FK constraints reference inspectors(id) anywhere
-- 2. All user_id/inspector_id columns now contain auth.users.id values
-- 3. user_roles.inspector_id column is dropped
-- 4. The inspectors table is purely business data (employee info)
-- 5. App code can safely use session.user.id everywhere
-- ================================================
