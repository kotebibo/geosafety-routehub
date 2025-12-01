-- ================================================
-- User-Created Boards System
-- Migration 007: Allow users to create custom boards
-- ================================================

-- ================================================
-- BOARDS TABLE
-- Stores user-created boards (instances of board types)
-- ================================================
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
    board_type VARCHAR(50) NOT NULL CHECK (board_type IN ('routes', 'companies', 'inspectors', 'inspections', 'custom')),
    name VARCHAR(255) NOT NULL,
    name_ka VARCHAR(255), -- Georgian translation
    description TEXT,
    icon VARCHAR(50) DEFAULT 'board', -- Icon name for the board
    color VARCHAR(50) DEFAULT 'primary', -- Color theme
    is_template BOOLEAN DEFAULT false, -- Is this a template board?
    is_public BOOLEAN DEFAULT false, -- Can others view this board?
    folder_id UUID, -- For organizing boards into folders (future feature)
    settings JSONB DEFAULT '{
        "allowComments": true,
        "allowActivityFeed": true,
        "defaultView": "table",
        "permissions": {
            "canEdit": [],
            "canView": []
        }
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast board lookups
CREATE INDEX idx_boards_owner ON public.boards(owner_id, created_at DESC);
CREATE INDEX idx_boards_type ON public.boards(board_type);
CREATE INDEX idx_boards_public ON public.boards(is_public) WHERE is_public = true;

-- ================================================
-- BOARD ITEMS TABLE
-- Stores the actual items/rows in each board
-- ================================================
CREATE TABLE IF NOT EXISTS public.board_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0, -- For manual ordering

    -- Dynamic data storage - all column values stored as JSONB
    data JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Common fields for all items
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'default',
    assigned_to UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
    due_date DATE,
    priority INTEGER DEFAULT 0,

    -- Metadata
    created_by UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast item queries
CREATE INDEX idx_board_items_board ON public.board_items(board_id, position);
CREATE INDEX idx_board_items_status ON public.board_items(board_id, status);
CREATE INDEX idx_board_items_assigned ON public.board_items(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_board_items_data ON public.board_items USING GIN (data);

-- ================================================
-- BOARD MEMBERS TABLE
-- Who has access to each board
-- ================================================
CREATE TABLE IF NOT EXISTS public.board_members (
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    added_by UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (board_id, user_id)
);

-- Index for member lookups
CREATE INDEX idx_board_members_user ON public.board_members(user_id);

-- ================================================
-- BOARD TEMPLATES TABLE
-- Pre-defined board templates users can use
-- ================================================
CREATE TABLE IF NOT EXISTS public.board_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_ka VARCHAR(255),
    description TEXT,
    board_type VARCHAR(50) NOT NULL,
    icon VARCHAR(50) DEFAULT 'board',
    color VARCHAR(50) DEFAULT 'primary',
    category VARCHAR(100), -- e.g., "Project Management", "CRM", "Operations"
    default_columns JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of column configurations
    default_items JSONB DEFAULT '[]'::jsonb, -- Sample items for the template
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for template browsing
CREATE INDEX idx_board_templates_category ON public.board_templates(category);
CREATE INDEX idx_board_templates_featured ON public.board_templates(is_featured) WHERE is_featured = true;

-- ================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_items_updated_at BEFORE UPDATE ON public.board_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_templates_updated_at BEFORE UPDATE ON public.board_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- FUNCTION: Auto-add board owner as member
-- ================================================
CREATE OR REPLACE FUNCTION add_board_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.board_members (board_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.owner_id, 'owner', NEW.owner_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_owner_as_member AFTER INSERT ON public.boards
    FOR EACH ROW EXECUTE FUNCTION add_board_owner_as_member();

-- ================================================
-- FUNCTION: Create activity update when item changes
-- ================================================
CREATE OR REPLACE FUNCTION create_item_update()
RETURNS TRIGGER AS $$
BEGIN
    -- On INSERT
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.item_updates (
            item_type,
            item_id,
            user_id,
            update_type,
            content
        ) VALUES (
            'board_item',
            NEW.id,
            NEW.created_by,
            'created',
            'Created item: ' || NEW.name
        );
        RETURN NEW;
    END IF;

    -- On UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- Status changed
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.item_updates (
                item_type,
                item_id,
                user_id,
                update_type,
                field_name,
                old_value,
                new_value
            ) VALUES (
                'board_item',
                NEW.id,
                NEW.created_by,
                'status_changed',
                'status',
                OLD.status,
                NEW.status
            );
        END IF;

        -- Assignment changed
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
            INSERT INTO public.item_updates (
                item_type,
                item_id,
                user_id,
                update_type,
                field_name,
                old_value,
                new_value
            ) VALUES (
                'board_item',
                NEW.id,
                NEW.created_by,
                CASE
                    WHEN OLD.assigned_to IS NULL THEN 'assigned'
                    ELSE 'reassigned'
                END,
                'assigned_to',
                OLD.assigned_to::text,
                NEW.assigned_to::text
            );
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_item_changes AFTER INSERT OR UPDATE ON public.board_items
    FOR EACH ROW EXECUTE FUNCTION create_item_update();

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_templates ENABLE ROW LEVEL SECURITY;

-- BOARDS: Users can view their own boards, boards they're members of, or public boards
CREATE POLICY "Users can view accessible boards"
    ON public.boards FOR SELECT
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        OR is_public = true
        OR id IN (
            SELECT board_id FROM public.board_members
            WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

CREATE POLICY "Users can create boards"
    ON public.boards FOR INSERT
    WITH CHECK (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
    );

CREATE POLICY "Users can update their own boards or boards they have edit access to"
    ON public.boards FOR UPDATE
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        OR id IN (
            SELECT board_id FROM public.board_members
            WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            AND role IN ('owner', 'editor')
        )
    );

CREATE POLICY "Users can delete their own boards"
    ON public.boards FOR DELETE
    USING (
        owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
    );

-- BOARD ITEMS: Users can view/edit items in boards they have access to
CREATE POLICY "Users can view items in accessible boards"
    ON public.board_items FOR SELECT
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

CREATE POLICY "Users can create items in boards they have edit access to"
    ON public.board_items FOR INSERT
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

CREATE POLICY "Users can update items in boards they have edit access to"
    ON public.board_items FOR UPDATE
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

CREATE POLICY "Users can delete items in boards they have edit access to"
    ON public.board_items FOR DELETE
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

-- BOARD MEMBERS: Members can view other members, owners can manage members
CREATE POLICY "Users can view members of their boards"
    ON public.board_members FOR SELECT
    USING (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            OR id IN (
                SELECT board_id FROM public.board_members
                WHERE user_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
            )
        )
    );

CREATE POLICY "Board owners and editors can add members"
    ON public.board_members FOR INSERT
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

CREATE POLICY "Board owners and editors can update members"
    ON public.board_members FOR UPDATE
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

CREATE POLICY "Board owners can remove members"
    ON public.board_members FOR DELETE
    USING (
        board_id IN (
            SELECT id FROM public.boards
            WHERE owner_id IN (SELECT id FROM public.inspectors WHERE email = auth.email())
        )
    );

-- BOARD TEMPLATES: Everyone can view templates
CREATE POLICY "Everyone can view board templates"
    ON public.board_templates FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage board templates"
    ON public.board_templates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ================================================
-- DEFAULT BOARD TEMPLATES
-- ================================================

INSERT INTO public.board_templates (name, name_ka, description, board_type, icon, color, category, default_columns) VALUES
(
    'Project Management',
    'პროექტის მენეჯმენტი',
    'Manage projects with tasks, deadlines, and team collaboration',
    'custom',
    'briefcase',
    'blue',
    'Project Management',
    '[
        {"id": "name", "name": "Task Name", "type": "text", "width": 200},
        {"id": "status", "name": "Status", "type": "status", "width": 130},
        {"id": "assigned_to", "name": "Owner", "type": "person", "width": 150},
        {"id": "due_date", "name": "Due Date", "type": "date", "width": 120},
        {"id": "priority", "name": "Priority", "type": "status", "width": 110}
    ]'::jsonb
),
(
    'CRM Pipeline',
    'CRM პროცესი',
    'Track leads and manage your sales pipeline',
    'custom',
    'users',
    'green',
    'Sales & CRM',
    '[
        {"id": "name", "name": "Lead Name", "type": "text", "width": 180},
        {"id": "company", "name": "Company", "type": "text", "width": 150},
        {"id": "status", "name": "Stage", "type": "status", "width": 130},
        {"id": "value", "name": "Deal Value", "type": "number", "width": 120},
        {"id": "assigned_to", "name": "Owner", "type": "person", "width": 150},
        {"id": "due_date", "name": "Close Date", "type": "date", "width": 120}
    ]'::jsonb
),
(
    'Task Tracker',
    'დავალებების აღრიცხვა',
    'Simple task tracking for daily work',
    'custom',
    'check-square',
    'purple',
    'Productivity',
    '[
        {"id": "name", "name": "Task", "type": "text", "width": 220},
        {"id": "status", "name": "Status", "type": "status", "width": 130},
        {"id": "assigned_to", "name": "Assigned To", "type": "person", "width": 150},
        {"id": "due_date", "name": "Due Date", "type": "date", "width": 120}
    ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to duplicate a board (create from template)
CREATE OR REPLACE FUNCTION duplicate_board(
    p_board_id UUID,
    p_new_name VARCHAR,
    p_owner_id UUID
) RETURNS UUID AS $$
DECLARE
    v_new_board_id UUID;
BEGIN
    -- Create new board
    INSERT INTO public.boards (owner_id, board_type, name, description, icon, color, settings)
    SELECT p_owner_id, board_type, p_new_name, description, icon, color, settings
    FROM public.boards
    WHERE id = p_board_id
    RETURNING id INTO v_new_board_id;

    -- Copy items (optional)
    -- INSERT INTO public.board_items (board_id, position, data, name, status, priority, created_by)
    -- SELECT v_new_board_id, position, data, name, status, priority, p_owner_id
    -- FROM public.board_items
    -- WHERE board_id = p_board_id;

    RETURN v_new_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE public.boards IS 'User-created board instances';
COMMENT ON TABLE public.board_items IS 'Items/rows within boards with dynamic JSONB data storage';
COMMENT ON TABLE public.board_members IS 'Board access control - who can view/edit each board';
COMMENT ON TABLE public.board_templates IS 'Pre-defined board templates users can create boards from';

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
