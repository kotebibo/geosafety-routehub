-- ================================================
-- Board Groups Support
-- Migration 016: Add groups for organizing board items like Monday.com
-- ================================================

-- ================================================
-- BOARD GROUPS TABLE
-- Stores group definitions for each board
-- ================================================
CREATE TABLE IF NOT EXISTS public.board_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#579bfc', -- Hex color code
    position INTEGER NOT NULL DEFAULT 0, -- For manual ordering
    is_collapsed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast group lookups
CREATE INDEX idx_board_groups_board ON public.board_groups(board_id, position);

-- ================================================
-- ADD GROUP_ID TO BOARD_ITEMS
-- ================================================
ALTER TABLE public.board_items
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.board_groups(id) ON DELETE SET NULL;

-- Index for fast item lookups by group
CREATE INDEX IF NOT EXISTS idx_board_items_group ON public.board_items(group_id) WHERE group_id IS NOT NULL;

-- ================================================
-- TRIGGERS
-- ================================================
CREATE TRIGGER update_board_groups_updated_at BEFORE UPDATE ON public.board_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- FUNCTION: Create default groups when a new board is created
-- ================================================
CREATE OR REPLACE FUNCTION create_default_board_groups()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default groups for new boards
    INSERT INTO public.board_groups (board_id, name, color, position) VALUES
        (NEW.id, 'New', '#579bfc', 0),
        (NEW.id, 'In Progress', '#fdab3d', 1),
        (NEW.id, 'Done', '#00c875', 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create groups for new boards
CREATE TRIGGER create_board_groups AFTER INSERT ON public.boards
    FOR EACH ROW EXECUTE FUNCTION create_default_board_groups();

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS
ALTER TABLE public.board_groups ENABLE ROW LEVEL SECURITY;

-- BOARD GROUPS: Users can view groups in boards they have access to
CREATE POLICY "Users can view groups in accessible boards"
    ON public.board_groups FOR SELECT
    USING (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            OR is_public = true
            OR id IN (
                SELECT board_id FROM public.board_members
                WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            )
        )
    );

CREATE POLICY "Users can create groups in boards they have edit access to"
    ON public.board_groups FOR INSERT
    WITH CHECK (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            OR id IN (
                SELECT board_id FROM public.board_members
                WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
                AND role IN ('owner', 'editor')
            )
        )
    );

CREATE POLICY "Users can update groups in boards they have edit access to"
    ON public.board_groups FOR UPDATE
    USING (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            OR id IN (
                SELECT board_id FROM public.board_members
                WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
                AND role IN ('owner', 'editor')
            )
        )
    );

CREATE POLICY "Users can delete groups in boards they have edit access to"
    ON public.board_groups FOR DELETE
    USING (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            OR id IN (
                SELECT board_id FROM public.board_members
                WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
                AND role IN ('owner', 'editor')
            )
        )
    );

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE public.board_groups IS 'Groups for organizing board items into collapsible sections like Monday.com';
COMMENT ON COLUMN public.board_items.group_id IS 'Reference to the group this item belongs to';

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
