-- ================================================
-- RESTORE PRODUCTION RLS POLICIES
-- Migration 029: Re-enable proper RLS after development
-- ================================================

-- This migration:
-- 1. Drops all "Dev:" policies that allowed unrestricted access
-- 2. Creates proper role-based policies for production
-- 3. Uses the custom roles & permissions system

-- ================================================
-- HELPER FUNCTION: Check if user has a permission
-- ================================================
-- Note: We use the public.has_permission function created in migration 028

-- ================================================
-- COMPANIES TABLE
-- ================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Drop any existing dev policies
DROP POLICY IF EXISTS "Dev: Allow all company reads" ON companies;
DROP POLICY IF EXISTS "Dev: Allow all company inserts" ON companies;
DROP POLICY IF EXISTS "Dev: Allow all company updates" ON companies;
DROP POLICY IF EXISTS "Dev: Allow all company deletes" ON companies;

-- Production policies
CREATE POLICY "Authenticated users can read companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users with permission can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher')
    )
    OR public.has_permission('companies:create')
  );

CREATE POLICY "Users with permission can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher')
    )
    OR public.has_permission('companies:update')
  );

CREATE POLICY "Admins can delete companies"
  ON companies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
    OR public.has_permission('companies:delete')
  );

-- ================================================
-- INSPECTORS TABLE
-- ================================================
ALTER TABLE inspectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev: Allow all inspector reads" ON inspectors;
DROP POLICY IF EXISTS "Dev: Allow all inspector inserts" ON inspectors;
DROP POLICY IF EXISTS "Dev: Allow all inspector updates" ON inspectors;
DROP POLICY IF EXISTS "Dev: Allow all inspector deletes" ON inspectors;

CREATE POLICY "Authenticated users can read inspectors"
  ON inspectors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create inspectors"
  ON inspectors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
    OR public.has_permission('inspectors:create')
  );

CREATE POLICY "Admins can update inspectors"
  ON inspectors FOR UPDATE
  TO authenticated
  USING (
    -- Admin can update any inspector
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
    -- Or inspector can update their own profile
    OR EXISTS (
      SELECT 1 FROM inspectors i
      JOIN user_roles ur ON ur.inspector_id = i.id
      WHERE ur.user_id = auth.uid()
      AND i.id = inspectors.id
    )
    OR public.has_permission('inspectors:update')
  );

CREATE POLICY "Admins can delete inspectors"
  ON inspectors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
    OR public.has_permission('inspectors:delete')
  );

-- ================================================
-- ROUTES TABLE
-- ================================================
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev: Allow all route reads" ON routes;
DROP POLICY IF EXISTS "Dev: Allow all route inserts" ON routes;
DROP POLICY IF EXISTS "Dev: Allow all route updates" ON routes;
DROP POLICY IF EXISTS "Dev: Allow all route deletes" ON routes;

CREATE POLICY "Authenticated users can read routes"
  ON routes FOR SELECT
  TO authenticated
  USING (
    -- Admin and dispatcher can see all routes
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher')
    )
    -- Inspectors can see their assigned routes
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.inspector_id = routes.inspector_id
    )
    OR public.has_permission('routes:read')
  );

CREATE POLICY "Dispatchers and admins can create routes"
  ON routes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher')
    )
    OR public.has_permission('routes:create')
  );

CREATE POLICY "Dispatchers and admins can update routes"
  ON routes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher')
    )
    OR public.has_permission('routes:update')
  );

CREATE POLICY "Admins can delete routes"
  ON routes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
    OR public.has_permission('routes:delete')
  );

-- ================================================
-- ROUTE STOPS TABLE
-- ================================================
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev: Allow all route stop reads" ON route_stops;
DROP POLICY IF EXISTS "Dev: Allow all route stop inserts" ON route_stops;
DROP POLICY IF EXISTS "Dev: Allow all route stop updates" ON route_stops;
DROP POLICY IF EXISTS "Dev: Allow all route stop deletes" ON route_stops;

CREATE POLICY "Users can read route stops for accessible routes"
  ON route_stops FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM routes r
      WHERE r.id = route_stops.route_id
      AND (
        EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'dispatcher')
        )
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.inspector_id = r.inspector_id
        )
      )
    )
  );

CREATE POLICY "Dispatchers can manage route stops"
  ON route_stops FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher')
    )
  );

-- ================================================
-- INSPECTIONS TABLE
-- ================================================
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev: Allow all inspection reads" ON inspections;
DROP POLICY IF EXISTS "Dev: Allow all inspection inserts" ON inspections;
DROP POLICY IF EXISTS "Dev: Allow all inspection updates" ON inspections;
DROP POLICY IF EXISTS "Dev: Allow all inspection deletes" ON inspections;

CREATE POLICY "Users can read inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher')
    )
    OR inspector_id IN (
      SELECT ur.inspector_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
    OR public.has_permission('inspections:read')
  );

CREATE POLICY "Users with permission can create inspections"
  ON inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher', 'inspector')
    )
    OR public.has_permission('inspections:create')
  );

CREATE POLICY "Users can update own inspections"
  ON inspections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher')
    )
    OR inspector_id IN (
      SELECT ur.inspector_id FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
    OR public.has_permission('inspections:update')
  );

CREATE POLICY "Admins can delete inspections"
  ON inspections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
    OR public.has_permission('inspections:delete')
  );

-- ================================================
-- BOARDS TABLE
-- ================================================
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Drop dev policies
DROP POLICY IF EXISTS "Dev: Allow all board reads" ON boards;
DROP POLICY IF EXISTS "Dev: Allow all board inserts" ON boards;
DROP POLICY IF EXISTS "Dev: Allow all board updates" ON boards;
DROP POLICY IF EXISTS "Dev: Allow all board deletes" ON boards;

CREATE POLICY "Users can read boards they have access to"
  ON boards FOR SELECT
  TO authenticated
  USING (
    -- User owns the board
    owner_id IN (
      SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    -- User is a member of the board
    OR EXISTS (
      SELECT 1 FROM board_members bm
      JOIN inspectors i ON i.id = bm.user_id
      WHERE bm.board_id = boards.id
      AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    -- Board is public
    OR is_public = true
    -- Admin can see all boards
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create boards"
  ON boards FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_permission('boards:create')
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher')
    )
  );

CREATE POLICY "Board owners and editors can update boards"
  ON boards FOR UPDATE
  TO authenticated
  USING (
    -- User owns the board
    owner_id IN (
      SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    -- User is an editor
    OR EXISTS (
      SELECT 1 FROM board_members bm
      JOIN inspectors i ON i.id = bm.user_id
      WHERE bm.board_id = boards.id
      AND bm.role IN ('owner', 'editor')
      AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    -- Admin can update any board
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Board owners can delete boards"
  ON boards FOR DELETE
  TO authenticated
  USING (
    -- User owns the board
    owner_id IN (
      SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    -- Admin can delete any board
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- ================================================
-- BOARD ITEMS TABLE
-- ================================================
ALTER TABLE board_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev: Allow all board item reads" ON board_items;
DROP POLICY IF EXISTS "Dev: Allow all board item inserts" ON board_items;
DROP POLICY IF EXISTS "Dev: Allow all board item updates" ON board_items;
DROP POLICY IF EXISTS "Dev: Allow all board item deletes" ON board_items;

CREATE POLICY "Users can read items in accessible boards"
  ON board_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_items.board_id
      AND (
        -- User owns the board
        b.owner_id IN (
          SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        -- User is a member
        OR EXISTS (
          SELECT 1 FROM board_members bm
          JOIN inspectors i ON i.id = bm.user_id
          WHERE bm.board_id = b.id
          AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        -- Board is public
        OR b.is_public = true
        -- Admin
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can create items in accessible boards"
  ON board_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_items.board_id
      AND (
        b.owner_id IN (
          SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM board_members bm
          JOIN inspectors i ON i.id = bm.user_id
          WHERE bm.board_id = b.id
          AND bm.role IN ('owner', 'editor')
          AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'dispatcher')
        )
      )
    )
  );

CREATE POLICY "Users can update items in accessible boards"
  ON board_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_items.board_id
      AND (
        b.owner_id IN (
          SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM board_members bm
          JOIN inspectors i ON i.id = bm.user_id
          WHERE bm.board_id = b.id
          AND bm.role IN ('owner', 'editor')
          AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'dispatcher')
        )
      )
    )
  );

CREATE POLICY "Users can delete items in accessible boards"
  ON board_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_items.board_id
      AND (
        b.owner_id IN (
          SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM board_members bm
          JOIN inspectors i ON i.id = bm.user_id
          WHERE bm.board_id = b.id
          AND bm.role IN ('owner', 'editor')
          AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'
        )
      )
    )
  );

-- ================================================
-- BOARD MEMBERS TABLE
-- ================================================
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev: Allow all board member reads" ON board_members;
DROP POLICY IF EXISTS "Dev: Allow all board member inserts" ON board_members;
DROP POLICY IF EXISTS "Dev: Allow all board member updates" ON board_members;
DROP POLICY IF EXISTS "Dev: Allow all board member deletes" ON board_members;

CREATE POLICY "Users can view board members"
  ON board_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_members.board_id
      AND (
        b.owner_id IN (
          SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM board_members bm2
          JOIN inspectors i ON i.id = bm2.user_id
          WHERE bm2.board_id = b.id
          AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Board owners can manage members"
  ON board_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_members.board_id
      AND (
        b.owner_id IN (
          SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'
        )
      )
    )
  );

-- ================================================
-- BOARD COLUMNS TABLE
-- ================================================
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dev: Allow all board column reads" ON board_columns;
DROP POLICY IF EXISTS "Dev: Allow all board column inserts" ON board_columns;
DROP POLICY IF EXISTS "Dev: Allow all board column updates" ON board_columns;
DROP POLICY IF EXISTS "Dev: Allow all board column deletes" ON board_columns;
DROP POLICY IF EXISTS "Anyone can read board columns" ON board_columns;
DROP POLICY IF EXISTS "Admins can manage board columns" ON board_columns;
DROP POLICY IF EXISTS "Board owners can manage columns" ON board_columns;

CREATE POLICY "Authenticated users can read board columns"
  ON board_columns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage board columns"
  ON board_columns FOR ALL
  TO authenticated
  USING (
    -- Admin and dispatcher can manage all columns
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'dispatcher')
    )
    -- Board owners can manage their board's columns
    OR (
      board_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM boards b
        WHERE b.id = board_columns.board_id
        AND b.owner_id IN (
          SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
      )
    )
  );

-- ================================================
-- BOARD GROUPS TABLE
-- ================================================
ALTER TABLE board_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read board groups" ON board_groups;
DROP POLICY IF EXISTS "Board owners and admins can manage groups" ON board_groups;

CREATE POLICY "Users can read board groups"
  ON board_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_groups.board_id
      AND (
        b.owner_id IN (
          SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM board_members bm
          JOIN inspectors i ON i.id = bm.user_id
          WHERE bm.board_id = b.id
          AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR b.is_public = true
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Users can manage board groups"
  ON board_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      WHERE b.id = board_groups.board_id
      AND (
        b.owner_id IN (
          SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM board_members bm
          JOIN inspectors i ON i.id = bm.user_id
          WHERE bm.board_id = b.id
          AND bm.role IN ('owner', 'editor')
          AND i.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'dispatcher')
        )
      )
    )
  );

-- ================================================
-- BOARD VIEWS TABLE
-- ================================================
ALTER TABLE board_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own or shared views" ON board_views;
DROP POLICY IF EXISTS "Users can manage own views" ON board_views;

CREATE POLICY "Users can read own or shared views"
  ON board_views FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR is_shared = true
  );

CREATE POLICY "Users can manage own views"
  ON board_views FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- ================================================
-- ITEM UPDATES / ACTIVITY LOG TABLE
-- ================================================
ALTER TABLE item_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read updates" ON item_updates;
DROP POLICY IF EXISTS "Authenticated users can read item updates" ON item_updates;
DROP POLICY IF EXISTS "Authenticated users can create item updates" ON item_updates;

CREATE POLICY "Authenticated users can read item updates"
  ON item_updates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create item updates"
  ON item_updates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ================================================
-- BOARD PRESENCE TABLE
-- ================================================
ALTER TABLE board_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own presence" ON board_presence;

CREATE POLICY "Users can read all presence"
  ON board_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own presence"
  ON board_presence FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM inspectors WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ================================================
-- BOARD TEMPLATES TABLE (if exists)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'board_templates') THEN
    ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone can read templates" ON board_templates;
    DROP POLICY IF EXISTS "Admins can manage templates" ON board_templates;

    EXECUTE 'CREATE POLICY "Anyone can read templates" ON board_templates FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Admins can manage templates" ON board_templates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ''admin''))';
  END IF;
END $$;

-- ================================================
-- USER ROLES TABLE
-- ================================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

CREATE POLICY "Users can read roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own role
    user_id = auth.uid()
    -- Admins can read all roles
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage user roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- ================================================
-- SERVICE TYPES TABLE (if exists)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'service_types') THEN
    ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Anyone can read service types" ON service_types;
    DROP POLICY IF EXISTS "Admins can manage service types" ON service_types;

    EXECUTE 'CREATE POLICY "Anyone can read service types" ON service_types FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Admins can manage service types" ON service_types FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ''admin''))';
  END IF;
END $$;

-- ================================================
-- COMPANY LOCATIONS TABLE (if exists)
-- ================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_locations') THEN
    ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated users can read company locations" ON company_locations;
    DROP POLICY IF EXISTS "Users with permission can manage company locations" ON company_locations;

    EXECUTE 'CREATE POLICY "Authenticated users can read company locations" ON company_locations FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Users with permission can manage company locations" ON company_locations FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN (''admin'', ''dispatcher'')))';
  END IF;
END $$;

-- ================================================
-- DONE! Production RLS policies are now in place
-- ================================================
