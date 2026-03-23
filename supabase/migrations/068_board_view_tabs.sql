-- Board View Tabs: per-board view tabs with independent filter/sort/group state
-- Each board gets a default "Main Table" tab that cannot be deleted

CREATE TABLE public.board_view_tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    view_name VARCHAR(255) NOT NULL,
    view_name_ka VARCHAR(255),
    view_type VARCHAR(50) NOT NULL DEFAULT 'table'
        CHECK (view_type IN ('table', 'kanban', 'calendar', 'chart', 'timeline')),
    icon VARCHAR(50) DEFAULT 'table',
    position INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    filters JSONB DEFAULT '[]'::jsonb,
    sort_config JSONB DEFAULT NULL,
    group_by_column VARCHAR(100) DEFAULT NULL,
    created_by UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_board_view_tabs_board ON public.board_view_tabs(board_id, position);

-- Enforce exactly one default tab per board
CREATE UNIQUE INDEX idx_board_view_tabs_default
    ON public.board_view_tabs(board_id) WHERE is_default = true;

-- Updated_at trigger
CREATE TRIGGER set_board_view_tabs_updated_at
    BEFORE UPDATE ON public.board_view_tabs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.board_view_tabs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "board_view_tabs_select"
    ON public.board_view_tabs FOR SELECT TO authenticated
    USING (public.can_access_board(board_id));

CREATE POLICY "board_view_tabs_insert"
    ON public.board_view_tabs FOR INSERT TO authenticated
    WITH CHECK (public.can_edit_board(board_id));

CREATE POLICY "board_view_tabs_update"
    ON public.board_view_tabs FOR UPDATE TO authenticated
    USING (public.can_edit_board(board_id));

CREATE POLICY "board_view_tabs_delete"
    ON public.board_view_tabs FOR DELETE TO authenticated
    USING (public.can_edit_board(board_id));

-- Seed default "Main Table" tab for all existing boards
INSERT INTO public.board_view_tabs (board_id, view_name, view_name_ka, view_type, position, is_default)
SELECT id, 'Main Table', 'მთავარი ცხრილი', 'table', 0, true
FROM public.boards
WHERE NOT EXISTS (
    SELECT 1 FROM public.board_view_tabs WHERE board_view_tabs.board_id = boards.id
);
