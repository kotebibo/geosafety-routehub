-- ================================================
-- Migrate Existing Boards to Workspaces
-- Migration 036: Create default workspaces and move existing boards
-- ================================================

-- ================================================
-- STEP 1: Create default workspaces for all existing users
-- who have boards but no default workspace
-- ================================================

-- Insert default workspaces for users with boards who don't have a default workspace yet
INSERT INTO public.workspaces (name, name_ka, description, owner_id, is_default, icon, color)
SELECT DISTINCT
    'My Workspace',
    'ჩემი სამუშაო სივრცე',
    'Default workspace for your boards',
    b.owner_id,
    true,
    'home',
    'blue'
FROM public.boards b
WHERE NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = b.owner_id AND w.is_default = true
)
AND b.owner_id IS NOT NULL;

-- ================================================
-- STEP 2: Move orphaned boards to owner's default workspace
-- ================================================

-- Update boards without workspace_id to use owner's default workspace
UPDATE public.boards b
SET workspace_id = (
    SELECT w.id FROM public.workspaces w
    WHERE w.owner_id = b.owner_id
    AND w.is_default = true
    LIMIT 1
)
WHERE b.workspace_id IS NULL
AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = b.owner_id
    AND w.is_default = true
);

-- ================================================
-- STEP 3: Log migration results
-- ================================================

DO $$
DECLARE
    v_workspaces_created INTEGER;
    v_boards_migrated INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_workspaces_created
    FROM public.workspaces
    WHERE is_default = true;

    SELECT COUNT(*) INTO v_boards_migrated
    FROM public.boards
    WHERE workspace_id IS NOT NULL;

    RAISE NOTICE 'Migration complete: % default workspaces, % boards assigned to workspaces',
        v_workspaces_created,
        v_boards_migrated;
END $$;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
