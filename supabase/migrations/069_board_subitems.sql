-- Board Subitems: child rows nested under parent board items (one level deep)
-- Each subitem belongs to a parent board_item and a board (denormalized for RLS)

-- Subitem columns configuration (shared per board)
CREATE TABLE public.board_subitem_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    column_id VARCHAR(100) NOT NULL,
    column_name VARCHAR(255) NOT NULL,
    column_name_ka VARCHAR(255),
    column_type VARCHAR(50) NOT NULL DEFAULT 'text'
        CHECK (column_type IN (
            'text', 'status', 'person', 'date', 'date_range',
            'number', 'checkbox', 'phone', 'files'
        )),
    is_visible BOOLEAN NOT NULL DEFAULT true,
    position INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 150,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for subitem columns
CREATE INDEX idx_board_subitem_columns_board ON public.board_subitem_columns(board_id, position);
CREATE UNIQUE INDEX idx_board_subitem_columns_unique ON public.board_subitem_columns(board_id, column_id);

-- Updated_at trigger
CREATE TRIGGER set_board_subitem_columns_updated_at
    BEFORE UPDATE ON public.board_subitem_columns
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for subitem columns
ALTER TABLE public.board_subitem_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "board_subitem_columns_select"
    ON public.board_subitem_columns FOR SELECT TO authenticated
    USING (public.can_access_board(board_id));

CREATE POLICY "board_subitem_columns_insert"
    ON public.board_subitem_columns FOR INSERT TO authenticated
    WITH CHECK (public.can_edit_board(board_id));

CREATE POLICY "board_subitem_columns_update"
    ON public.board_subitem_columns FOR UPDATE TO authenticated
    USING (public.can_edit_board(board_id));

CREATE POLICY "board_subitem_columns_delete"
    ON public.board_subitem_columns FOR DELETE TO authenticated
    USING (public.can_edit_board(board_id));

-- Subitems table
CREATE TABLE public.board_subitems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_item_id UUID NOT NULL REFERENCES public.board_items(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    name VARCHAR(500) NOT NULL DEFAULT '',
    data JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'default'
        CHECK (status IN ('working_on_it', 'stuck', 'done', 'pending', 'default')),
    assigned_to UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
    due_date DATE,
    created_by UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for subitems
CREATE INDEX idx_board_subitems_parent ON public.board_subitems(parent_item_id, position);
CREATE INDEX idx_board_subitems_board ON public.board_subitems(board_id);
CREATE INDEX idx_board_subitems_data ON public.board_subitems USING GIN (data);

-- Updated_at trigger
CREATE TRIGGER set_board_subitems_updated_at
    BEFORE UPDATE ON public.board_subitems
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for subitems
ALTER TABLE public.board_subitems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "board_subitems_select"
    ON public.board_subitems FOR SELECT TO authenticated
    USING (public.can_access_board(board_id));

CREATE POLICY "board_subitems_insert"
    ON public.board_subitems FOR INSERT TO authenticated
    WITH CHECK (public.can_edit_board(board_id));

CREATE POLICY "board_subitems_update"
    ON public.board_subitems FOR UPDATE TO authenticated
    USING (public.can_edit_board(board_id));

CREATE POLICY "board_subitems_delete"
    ON public.board_subitems FOR DELETE TO authenticated
    USING (public.can_edit_board(board_id));
