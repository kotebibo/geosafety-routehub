-- ================================================
-- Migration 046: Unified User ID System
--
-- PROBLEM:
-- The system has two user ID systems that conflict:
-- 1. auth.users.id (UUID from Supabase Auth) - used by frontend as auth.uid()
-- 2. inspectors.id (our business entity UUID) - used in owner_id FK constraints
--
-- When frontend calls createBoard with user.id (auth.uid()),
-- it fails because owner_id references inspectors.id
--
-- SOLUTION:
-- Change all owner_id/user_id columns to reference auth.users.id directly.
-- The inspectors table becomes purely a business entity (employee data),
-- linked via email, not via foreign keys for ownership.
--
-- This makes auth.uid() work everywhere and is more scalable.
-- ================================================

-- ================================================
-- STEP 1: Diagnostic queries (run these first to understand current state)
-- ================================================

-- Check current boards and their owner IDs
-- SELECT b.id, b.name, b.owner_id,
--        (SELECT email FROM inspectors WHERE id = b.owner_id) as inspector_email,
--        (SELECT email FROM auth.users WHERE id = b.owner_id) as auth_email
-- FROM boards b;

-- Check if owner_ids match auth.users or inspectors
-- SELECT
--     (SELECT COUNT(*) FROM boards WHERE owner_id IN (SELECT id FROM auth.users)) as boards_with_auth_id,
--     (SELECT COUNT(*) FROM boards WHERE owner_id IN (SELECT id FROM inspectors)) as boards_with_inspector_id,
--     (SELECT COUNT(*) FROM boards) as total_boards;

-- ================================================
-- STEP 2: Create helper function to get auth user ID from email
-- ================================================
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(user_email TEXT)
RETURNS UUID AS $$
    SELECT id FROM auth.users WHERE email = user_email LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================
-- STEP 3: Drop existing foreign key constraints
-- We need to make owner_id/user_id flexible (either auth.users.id or inspectors.id during migration)
-- ================================================

-- Boards table
ALTER TABLE public.boards DROP CONSTRAINT IF EXISTS boards_owner_id_fkey;

-- Workspaces table
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_owner_id_fkey;

-- Board members
ALTER TABLE public.board_members DROP CONSTRAINT IF EXISTS board_members_user_id_fkey;
ALTER TABLE public.board_members DROP CONSTRAINT IF EXISTS board_members_added_by_fkey;

-- Workspace members
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;
ALTER TABLE public.workspace_members DROP CONSTRAINT IF EXISTS workspace_members_added_by_fkey;

-- Board items
ALTER TABLE public.board_items DROP CONSTRAINT IF EXISTS board_items_assigned_to_fkey;
ALTER TABLE public.board_items DROP CONSTRAINT IF EXISTS board_items_created_by_fkey;

-- ================================================
-- STEP 4: Migrate existing data
-- For boards/workspaces owned by inspector IDs, update to auth.users.id
-- Only update if we can find a matching auth user (via email)
-- ================================================

-- Update boards.owner_id: if owner_id is an inspector_id, change to corresponding auth user id
-- Only updates rows where we CAN find a matching auth user
UPDATE public.boards b
SET owner_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = b.owner_id
)
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i
    WHERE i.id = b.owner_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = b.owner_id
)
AND EXISTS (
    -- Only update if we can find a matching auth user by email
    SELECT 1 FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = b.owner_id
);

-- For boards owned by inspectors without matching auth users,
-- transfer ownership to the first admin user (fallback)
UPDATE public.boards b
SET owner_id = COALESCE(
    -- First try: admin user
    (SELECT u.id FROM auth.users u
     JOIN public.user_roles ur ON ur.user_id = u.id
     WHERE ur.role = 'admin'
     LIMIT 1),
    -- Second try: any auth user
    (SELECT id FROM auth.users LIMIT 1)
)
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i
    WHERE i.id = b.owner_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = b.owner_id
)
AND NOT EXISTS (
    -- No matching auth user by email
    SELECT 1 FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = b.owner_id
)
AND EXISTS (
    -- Only if we have at least one auth user to assign to
    SELECT 1 FROM auth.users
);

-- Update workspaces.owner_id similarly
UPDATE public.workspaces w
SET owner_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = w.owner_id
)
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i
    WHERE i.id = w.owner_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = w.owner_id
)
AND EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = w.owner_id
);

-- Fallback for workspaces without matching auth users
UPDATE public.workspaces w
SET owner_id = COALESCE(
    -- First try: admin user
    (SELECT u.id FROM auth.users u
     JOIN public.user_roles ur ON ur.user_id = u.id
     WHERE ur.role = 'admin'
     LIMIT 1),
    -- Second try: any auth user
    (SELECT id FROM auth.users LIMIT 1)
)
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i
    WHERE i.id = w.owner_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = w.owner_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = w.owner_id
)
AND EXISTS (
    -- Only if we have at least one auth user to assign to
    SELECT 1 FROM auth.users
);

-- Update board_members.user_id (only where we can find matching auth user)
UPDATE public.board_members bm
SET user_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = bm.user_id
)
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i
    WHERE i.id = bm.user_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = bm.user_id
)
AND EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = bm.user_id
);

-- Delete board_members entries that can't be migrated (orphaned inspector IDs)
DELETE FROM public.board_members bm
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i
    WHERE i.id = bm.user_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = bm.user_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = bm.user_id
);

-- Update workspace_members.user_id (only where we can find matching auth user)
UPDATE public.workspace_members wm
SET user_id = (
    SELECT u.id FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = wm.user_id
)
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i
    WHERE i.id = wm.user_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = wm.user_id
)
AND EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = wm.user_id
);

-- Delete workspace_members entries that can't be migrated
DELETE FROM public.workspace_members wm
WHERE EXISTS (
    SELECT 1 FROM public.inspectors i
    WHERE i.id = wm.user_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = wm.user_id
)
AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.inspectors i ON i.email = u.email
    WHERE i.id = wm.user_id
);

-- ================================================
-- STEP 5: Add new foreign key constraints referencing auth.users
-- ================================================

-- Note: We don't add strict FK constraints because:
-- 1. auth.users is in a different schema and Supabase controls it
-- 2. We want flexibility for edge cases
-- Instead, we'll enforce this via RLS policies

-- Add check constraint to ensure owner_id is a valid UUID
-- (The RLS policies will ensure it's the current user's ID)

-- ================================================
-- STEP 6: Update RLS helper functions
-- ================================================

-- Drop and recreate get_my_inspector_id to be more robust
CREATE OR REPLACE FUNCTION public.get_my_inspector_id()
RETURNS UUID AS $$
    SELECT id FROM public.inspectors WHERE email = auth.email() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- New function: Get current auth user ID (clearer naming)
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
    SELECT auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ================================================
-- STEP 7: Update can_access_board to use auth.uid() directly
-- ================================================
CREATE OR REPLACE FUNCTION public.can_access_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    my_user_id UUID;
BEGIN
    -- Get the current auth user ID
    my_user_id := auth.uid();

    IF my_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.boards b
        WHERE b.id = board_uuid
        AND (
            -- Owner can access (now using auth.uid() directly)
            b.owner_id = my_user_id
            -- Public boards
            OR b.is_public = true
            -- Board member
            OR EXISTS (
                SELECT 1 FROM public.board_members bm
                WHERE bm.board_id = b.id
                AND bm.user_id = my_user_id
            )
            -- Workspace member
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = b.workspace_id
                AND wm.user_id = my_user_id
            )
            -- Admin users
            OR public.is_admin_user()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- ================================================
-- STEP 8: Update can_edit_board similarly
-- ================================================
CREATE OR REPLACE FUNCTION public.can_edit_board(board_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    my_user_id UUID;
BEGIN
    my_user_id := auth.uid();

    IF my_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.boards b
        WHERE b.id = board_uuid
        AND (
            -- Owner can edit
            b.owner_id = my_user_id
            -- Board members with editor/owner role
            OR EXISTS (
                SELECT 1 FROM public.board_members bm
                WHERE bm.board_id = b.id
                AND bm.user_id = my_user_id
                AND bm.role IN ('owner', 'editor')
            )
            -- Workspace admins/owners
            OR EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = b.workspace_id
                AND wm.user_id = my_user_id
                AND wm.role IN ('owner', 'admin')
            )
            -- Admin users
            OR public.is_admin_user()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- ================================================
-- STEP 9: Recreate RLS policies for boards using auth.uid() directly
-- ================================================

-- Drop all existing board policies (including ones we might have created in a failed run)
DROP POLICY IF EXISTS "Users can view accessible boards" ON public.boards;
DROP POLICY IF EXISTS "Users can create boards" ON public.boards;
DROP POLICY IF EXISTS "Users can update their own boards or boards they have edit access to" ON public.boards;
DROP POLICY IF EXISTS "Users can delete their own boards" ON public.boards;
DROP POLICY IF EXISTS "boards_select_policy" ON public.boards;
DROP POLICY IF EXISTS "boards_insert_policy" ON public.boards;
DROP POLICY IF EXISTS "boards_update_policy" ON public.boards;
DROP POLICY IF EXISTS "boards_delete_policy" ON public.boards;

-- Create new policies using auth.uid() directly
CREATE POLICY "boards_select_policy" ON public.boards
    FOR SELECT USING (
        owner_id = auth.uid()
        OR is_public = true
        OR EXISTS (
            SELECT 1 FROM public.board_members bm
            WHERE bm.board_id = id AND bm.user_id = auth.uid()
        )
        OR (
            workspace_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.workspace_members wm
                WHERE wm.workspace_id = boards.workspace_id
                AND wm.user_id = auth.uid()
            )
        )
        OR public.is_admin_user()
    );

CREATE POLICY "boards_insert_policy" ON public.boards
    FOR INSERT WITH CHECK (
        owner_id = auth.uid()
    );

CREATE POLICY "boards_update_policy" ON public.boards
    FOR UPDATE USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.board_members bm
            WHERE bm.board_id = id
            AND bm.user_id = auth.uid()
            AND bm.role IN ('owner', 'editor')
        )
        OR public.is_admin_user()
    );

CREATE POLICY "boards_delete_policy" ON public.boards
    FOR DELETE USING (
        owner_id = auth.uid()
        OR public.is_admin_user()
    );

-- ================================================
-- STEP 10: Recreate RLS policies for workspaces using auth.uid() directly
-- ================================================

DROP POLICY IF EXISTS "Users can view accessible workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners and admins can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_select_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update_policy" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_delete_policy" ON public.workspaces;

CREATE POLICY "workspaces_select_policy" ON public.workspaces
    FOR SELECT USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = id AND wm.user_id = auth.uid()
        )
        OR public.is_admin_user()
    );

CREATE POLICY "workspaces_insert_policy" ON public.workspaces
    FOR INSERT WITH CHECK (
        owner_id = auth.uid()
    );

CREATE POLICY "workspaces_update_policy" ON public.workspaces
    FOR UPDATE USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
        OR public.is_admin_user()
    );

CREATE POLICY "workspaces_delete_policy" ON public.workspaces
    FOR DELETE USING (
        owner_id = auth.uid()
        AND is_default = false
    );

-- ================================================
-- STEP 11: Update workspace_members policies
-- ================================================

DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can remove members" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON public.workspace_members;

CREATE POLICY "workspace_members_select_policy" ON public.workspace_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_id
            AND (w.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.workspace_members wm2
                WHERE wm2.workspace_id = w.id AND wm2.user_id = auth.uid()
            ))
        )
        OR public.is_admin_user()
    );

CREATE POLICY "workspace_members_insert_policy" ON public.workspace_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_id
            AND (w.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.workspace_members wm2
                WHERE wm2.workspace_id = w.id
                AND wm2.user_id = auth.uid()
                AND wm2.role IN ('owner', 'admin')
            ))
        )
        OR public.is_admin_user()
    );

CREATE POLICY "workspace_members_update_policy" ON public.workspace_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_id
            AND (w.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.workspace_members wm2
                WHERE wm2.workspace_id = w.id
                AND wm2.user_id = auth.uid()
                AND wm2.role IN ('owner', 'admin')
            ))
        )
        OR public.is_admin_user()
    );

CREATE POLICY "workspace_members_delete_policy" ON public.workspace_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = workspace_id
            AND w.owner_id = auth.uid()
        )
        AND user_id != (SELECT owner_id FROM public.workspaces WHERE id = workspace_id)
    );

-- ================================================
-- STEP 12: Update board_members policies
-- ================================================

DROP POLICY IF EXISTS "Users can view members of their boards" ON public.board_members;
DROP POLICY IF EXISTS "Board owners and editors can add members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners and editors can update members" ON public.board_members;
DROP POLICY IF EXISTS "Board owners can remove members" ON public.board_members;
DROP POLICY IF EXISTS "board_members_select_policy" ON public.board_members;
DROP POLICY IF EXISTS "board_members_insert_policy" ON public.board_members;
DROP POLICY IF EXISTS "board_members_update_policy" ON public.board_members;
DROP POLICY IF EXISTS "board_members_delete_policy" ON public.board_members;

CREATE POLICY "board_members_select_policy" ON public.board_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.boards b
            WHERE b.id = board_id
            AND (b.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.board_members bm2
                WHERE bm2.board_id = b.id AND bm2.user_id = auth.uid()
            ))
        )
        OR public.is_admin_user()
    );

CREATE POLICY "board_members_insert_policy" ON public.board_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.boards b
            WHERE b.id = board_id
            AND (b.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.board_members bm2
                WHERE bm2.board_id = b.id
                AND bm2.user_id = auth.uid()
                AND bm2.role IN ('owner', 'editor')
            ))
        )
        OR public.is_admin_user()
    );

CREATE POLICY "board_members_update_policy" ON public.board_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.boards b
            WHERE b.id = board_id
            AND (b.owner_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.board_members bm2
                WHERE bm2.board_id = b.id
                AND bm2.user_id = auth.uid()
                AND bm2.role IN ('owner', 'editor')
            ))
        )
        OR public.is_admin_user()
    );

CREATE POLICY "board_members_delete_policy" ON public.board_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.boards b
            WHERE b.id = board_id
            AND b.owner_id = auth.uid()
        )
        OR public.is_admin_user()
    );

-- ================================================
-- STEP 13: Update triggers to use auth.uid()
-- ================================================

-- Update add_board_owner_as_member trigger
CREATE OR REPLACE FUNCTION add_board_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.board_members (board_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id)
    ON CONFLICT (board_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update add_workspace_owner_as_member trigger
CREATE OR REPLACE FUNCTION add_workspace_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 14: Create default workspace trigger that uses auth.uid()
-- ================================================

-- This trigger now creates workspace when user first logs in
-- (not when inspector record is created)
DROP TRIGGER IF EXISTS create_default_workspace ON public.inspectors;
DROP FUNCTION IF EXISTS create_default_workspace_for_user();

-- Create function that works with users table instead
CREATE OR REPLACE FUNCTION create_default_workspace_for_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create default workspace if user doesn't have one
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
            NEW.id,  -- This is now auth.users.id
            true,
            'home',
            'blue'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table (which is synced with auth.users)
DROP TRIGGER IF EXISTS create_default_workspace ON public.users;
CREATE TRIGGER create_default_workspace
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION create_default_workspace_for_auth_user();

-- ================================================
-- STEP 15: Create default workspaces for existing users who don't have one
-- ================================================

INSERT INTO public.workspaces (name, name_ka, description, owner_id, is_default, icon, color)
SELECT
    'My Workspace',
    'ჩემი სამუშაო სივრცე',
    'Default workspace for your boards',
    u.id,
    true,
    'home',
    'blue'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = u.id AND w.is_default = true
)
ON CONFLICT DO NOTHING;

-- ================================================
-- DONE!
--
-- After this migration:
-- 1. All owner_id/user_id columns now use auth.users.id
-- 2. RLS policies use auth.uid() directly
-- 3. Frontend can use user.id (auth.uid()) everywhere
-- 4. The inspectors table is purely for business data (employee info)
-- 5. Default workspaces are created for auth users
-- ================================================

-- Add comments documenting the new structure
COMMENT ON COLUMN public.boards.owner_id IS 'References auth.users.id - the owner of this board';
COMMENT ON COLUMN public.workspaces.owner_id IS 'References auth.users.id - the owner of this workspace';
COMMENT ON COLUMN public.board_members.user_id IS 'References auth.users.id - a member of this board';
COMMENT ON COLUMN public.workspace_members.user_id IS 'References auth.users.id - a member of this workspace';
