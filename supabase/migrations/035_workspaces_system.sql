-- ================================================
-- Workspaces System
-- Migration 035: Add workspaces layer above boards
-- Enables grouping and organizing boards into workspaces
-- ================================================

-- ================================================
-- WORKSPACES TABLE
-- Stores workspace definitions
-- ================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_ka VARCHAR(255), -- Georgian translation
    description TEXT,
    icon VARCHAR(50) DEFAULT 'folder',
    color VARCHAR(50) DEFAULT 'blue',
    owner_id UUID NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{
        "allowBoardCreation": true,
        "archivedBoards": []
    }'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast workspace lookups
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id, created_at DESC);
CREATE INDEX idx_workspaces_default ON public.workspaces(owner_id, is_default) WHERE is_default = true;

-- ================================================
-- WORKSPACE MEMBERS TABLE
-- Tracks workspace membership and roles
-- ================================================
CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'guest')),
    added_by UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);

-- Index for member lookups
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);

-- ================================================
-- ADD WORKSPACE_ID TO BOARDS TABLE
-- Links boards to workspaces (nullable for backwards compatibility)
-- ================================================
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Index for workspace-board lookups
CREATE INDEX IF NOT EXISTS idx_boards_workspace ON public.boards(workspace_id) WHERE workspace_id IS NOT NULL;

-- ================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- FUNCTION: Auto-add workspace owner as member
-- ================================================
CREATE OR REPLACE FUNCTION add_workspace_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.workspace_members (workspace_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_workspace_owner_as_member AFTER INSERT ON public.workspaces
    FOR EACH ROW EXECUTE FUNCTION add_workspace_owner_as_member();

-- ================================================
-- FUNCTION: Create default workspace for new users
-- ================================================
CREATE OR REPLACE FUNCTION create_default_workspace_for_user()
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
            NEW.id,
            true,
            'home',
            'blue'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default workspace when inspector is created
CREATE TRIGGER create_default_workspace AFTER INSERT ON public.inspectors
    FOR EACH ROW EXECUTE FUNCTION create_default_workspace_for_user();

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- WORKSPACES: Users can view workspaces they're members of
CREATE POLICY "Users can view accessible workspaces"
    ON public.workspaces FOR SELECT
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        OR id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

CREATE POLICY "Users can create workspaces"
    ON public.workspaces FOR INSERT
    WITH CHECK (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
    );

CREATE POLICY "Workspace owners and admins can update workspaces"
    ON public.workspaces FOR UPDATE
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        OR id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Workspace owners can delete workspaces"
    ON public.workspaces FOR DELETE
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        AND is_default = false -- Cannot delete default workspace
    );

-- WORKSPACE MEMBERS: Members can view other members
CREATE POLICY "Users can view workspace members"
    ON public.workspace_members FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            OR id IN (
                SELECT workspace_id FROM public.workspace_members wm
                WHERE wm.user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            )
        )
    );

CREATE POLICY "Workspace owners and admins can add members"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            OR id IN (
                SELECT workspace_id FROM public.workspace_members
                WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
                AND role IN ('owner', 'admin')
            )
        )
    );

CREATE POLICY "Workspace owners and admins can update members"
    ON public.workspace_members FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            OR id IN (
                SELECT workspace_id FROM public.workspace_members
                WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
                AND role IN ('owner', 'admin')
            )
        )
    );

CREATE POLICY "Workspace owners and admins can remove members"
    ON public.workspace_members FOR DELETE
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            OR id IN (
                SELECT workspace_id FROM public.workspace_members
                WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
                AND role IN ('owner', 'admin')
            )
        )
        -- Cannot remove workspace owner
        AND NOT (
            user_id IN (
                SELECT owner_id FROM public.workspaces
                WHERE id = workspace_id
            )
        )
    );

-- ================================================
-- EXTEND BOARDS POLICIES FOR WORKSPACE ACCESS
-- Users with workspace access can view boards in that workspace
-- ================================================

-- Drop and recreate boards view policy to include workspace access
DROP POLICY IF EXISTS "Users can view accessible boards" ON public.boards;
CREATE POLICY "Users can view accessible boards"
    ON public.boards FOR SELECT
    USING (
        -- Owner can view
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        -- Public boards
        OR is_public = true
        -- Direct board membership
        OR id IN (
            SELECT board_id FROM public.board_members
            WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
        -- Workspace membership grants access
        OR (
            workspace_id IS NOT NULL
            AND workspace_id IN (
                SELECT workspace_id FROM public.workspace_members
                WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            )
        )
    );

-- Extend board insert policy for workspace members
DROP POLICY IF EXISTS "Users can create boards" ON public.boards;
CREATE POLICY "Users can create boards"
    ON public.boards FOR INSERT
    WITH CHECK (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        AND (
            -- No workspace = user-owned board
            workspace_id IS NULL
            -- Workspace must allow board creation and user must be member
            OR (
                workspace_id IN (
                    SELECT w.id FROM public.workspaces w
                    JOIN public.workspace_members wm ON wm.workspace_id = w.id
                    WHERE wm.user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
                    AND wm.role IN ('owner', 'admin', 'member')
                    AND (w.settings->>'allowBoardCreation')::boolean = true
                )
            )
        )
    );

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE public.workspaces IS 'Workspaces group and organize multiple boards';
COMMENT ON TABLE public.workspace_members IS 'Workspace access control - who can access each workspace';
COMMENT ON COLUMN public.workspaces.is_default IS 'Default workspace for user - cannot be deleted';
COMMENT ON COLUMN public.workspaces.settings IS 'Workspace settings including allowBoardCreation and archivedBoards array';
COMMENT ON COLUMN public.boards.workspace_id IS 'Optional workspace this board belongs to';

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
