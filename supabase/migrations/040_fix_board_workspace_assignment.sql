-- ================================================
-- Fix Board Workspace Assignment
-- Migration 040: Ensure all boards have workspace_id set
-- ================================================

-- First, check which boards are missing workspace_id
-- SELECT id, name, owner_id, workspace_id FROM public.boards WHERE workspace_id IS NULL;

-- ================================================
-- STEP 1: Create default workspaces for users who need one
-- ================================================

-- Create default workspace for any user with boards but no workspace
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
WHERE b.owner_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.owner_id = b.owner_id
)
ON CONFLICT DO NOTHING;

-- ================================================
-- STEP 2: Ensure workspace_members entries exist for workspace owners
-- The trigger should handle this, but let's make sure
-- ================================================

INSERT INTO public.workspace_members (workspace_id, user_id, role, added_by)
SELECT w.id, w.owner_id, 'owner', w.owner_id
FROM public.workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    WHERE wm.workspace_id = w.id
    AND wm.user_id = w.owner_id
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ================================================
-- STEP 3: Assign orphaned boards to their owner's default workspace
-- ================================================

-- Update boards without workspace_id
UPDATE public.boards b
SET workspace_id = (
    SELECT w.id
    FROM public.workspaces w
    WHERE w.owner_id = b.owner_id
    AND w.is_default = true
    LIMIT 1
)
WHERE b.workspace_id IS NULL
AND b.owner_id IS NOT NULL;

-- ================================================
-- STEP 4: For any remaining boards, try to assign to ANY workspace the owner has
-- ================================================

UPDATE public.boards b
SET workspace_id = (
    SELECT w.id
    FROM public.workspaces w
    WHERE w.owner_id = b.owner_id
    ORDER BY w.created_at
    LIMIT 1
)
WHERE b.workspace_id IS NULL
AND b.owner_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM public.workspaces w WHERE w.owner_id = b.owner_id
);

-- ================================================
-- STEP 5: Log results
-- ================================================

DO $$
DECLARE
    v_boards_without_workspace INTEGER;
    v_total_boards INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_boards_without_workspace
    FROM public.boards
    WHERE workspace_id IS NULL;

    SELECT COUNT(*) INTO v_total_boards
    FROM public.boards;

    RAISE NOTICE 'Migration complete: % boards without workspace out of % total boards',
        v_boards_without_workspace,
        v_total_boards;
END $$;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
