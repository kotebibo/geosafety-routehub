-- ================================================
-- Monday.com-Style Boards System
-- Migration 006: Board Configuration & Activity Tracking
-- ================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- BOARD COLUMNS CONFIGURATION
-- Stores column settings per board type
-- ================================================
CREATE TABLE IF NOT EXISTS public.board_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_type VARCHAR(50) NOT NULL CHECK (board_type IN ('routes', 'companies', 'inspectors', 'inspections')),
    column_id VARCHAR(100) NOT NULL,
    column_name VARCHAR(255) NOT NULL,
    column_name_ka VARCHAR(255), -- Georgian translation
    column_type VARCHAR(50) NOT NULL CHECK (column_type IN ('text', 'status', 'person', 'date', 'number', 'location', 'actions')),
    is_visible BOOLEAN DEFAULT true,
    is_pinned BOOLEAN DEFAULT false,
    position INTEGER NOT NULL,
    width INTEGER DEFAULT 150, -- Width in pixels
    config JSONB DEFAULT '{}'::jsonb, -- Column-specific configuration (e.g., status options, number format)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(board_type, column_id)
);

-- Index for fast board column lookups
CREATE INDEX idx_board_columns_board_type ON public.board_columns(board_type);
CREATE INDEX idx_board_columns_position ON public.board_columns(board_type, position);

-- ================================================
-- BOARD VIEWS (Saved Filters/Sorts)
-- Allows users to save their preferred board configurations
-- ================================================
CREATE TABLE IF NOT EXISTS public.board_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
    board_type VARCHAR(50) NOT NULL CHECK (board_type IN ('routes', 'companies', 'inspectors', 'inspections')),
    view_name VARCHAR(255) NOT NULL,
    view_name_ka VARCHAR(255), -- Georgian translation
    filters JSONB DEFAULT '[]'::jsonb, -- Array of filter objects
    sort_config JSONB DEFAULT '{}'::jsonb, -- {column: 'name', direction: 'asc'}
    column_config JSONB DEFAULT '[]'::jsonb, -- Array of visible column IDs with custom widths
    is_default BOOLEAN DEFAULT false,
    is_shared BOOLEAN DEFAULT false, -- Admin can share views with team
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast view lookups
CREATE INDEX idx_board_views_user_board ON public.board_views(user_id, board_type);
CREATE INDEX idx_board_views_shared ON public.board_views(board_type, is_shared) WHERE is_shared = true;

-- Ensure only one default view per user per board type
CREATE UNIQUE INDEX idx_board_views_default ON public.board_views(user_id, board_type, is_default)
WHERE is_default = true;

-- ================================================
-- ITEM UPDATES (Activity Feed)
-- Tracks all changes to items for activity feed
-- ================================================
CREATE TABLE IF NOT EXISTS public.item_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('route', 'company', 'inspector', 'inspection', 'board_item')),
    item_id UUID NOT NULL,
    user_id UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
    update_type VARCHAR(50) NOT NULL CHECK (update_type IN ('created', 'updated', 'deleted', 'status_changed', 'assigned', 'reassigned', 'comment', 'completed')),
    field_name VARCHAR(100), -- Which field was updated (e.g., 'status', 'inspector_id')
    old_value TEXT, -- Previous value (JSON string)
    new_value TEXT, -- New value (JSON string)
    content TEXT, -- For comments or additional context
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast activity feed queries
CREATE INDEX idx_item_updates_item ON public.item_updates(item_type, item_id, created_at DESC);
CREATE INDEX idx_item_updates_user ON public.item_updates(user_id, created_at DESC);
CREATE INDEX idx_item_updates_type ON public.item_updates(update_type, created_at DESC);
CREATE INDEX idx_item_updates_created_at ON public.item_updates(created_at DESC);

-- ================================================
-- BOARD PRESENCE (Real-time Tracking)
-- Tracks which users are currently viewing each board
-- ================================================
CREATE TABLE IF NOT EXISTS public.board_presence (
    user_id UUID NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
    board_type VARCHAR(50) NOT NULL CHECK (board_type IN ('routes', 'companies', 'inspectors', 'inspections')),
    board_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID, -- Use default UUID for general board viewing
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_editing BOOLEAN DEFAULT false,
    editing_item_id UUID, -- Which specific item they're editing
    PRIMARY KEY (user_id, board_type, board_id)
);

-- Index for presence queries
CREATE INDEX idx_board_presence_board ON public.board_presence(board_type, last_seen DESC);
CREATE INDEX idx_board_presence_editing ON public.board_presence(board_type, is_editing) WHERE is_editing = true;

-- ================================================
-- USER SETTINGS
-- User preferences for boards and app
-- ================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.inspectors(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'ka' CHECK (language IN ('ka', 'en')),
    notification_settings JSONB DEFAULT '{
        "email_notifications": true,
        "push_notifications": true,
        "activity_feed": true,
        "assignment_changes": true
    }'::jsonb,
    board_preferences JSONB DEFAULT '{
        "default_view": "table",
        "rows_per_page": 50,
        "auto_refresh": true,
        "show_activity_feed": false
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- ITEM COMMENTS
-- Comments on board items
-- ================================================
CREATE TABLE IF NOT EXISTS public.item_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('route', 'company', 'inspector', 'inspection', 'board_item')),
    item_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES public.inspectors(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.item_comments(id) ON DELETE CASCADE, -- For threaded comments
    content TEXT NOT NULL,
    mentions JSONB DEFAULT '[]'::jsonb, -- Array of user IDs mentioned in comment
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of file URLs
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast comment queries
CREATE INDEX idx_item_comments_item ON public.item_comments(item_type, item_id, created_at DESC);
CREATE INDEX idx_item_comments_user ON public.item_comments(user_id, created_at DESC);
CREATE INDEX idx_item_comments_parent ON public.item_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- ================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_board_columns_updated_at BEFORE UPDATE ON public.board_columns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_views_updated_at BEFORE UPDATE ON public.board_views
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_comments_updated_at BEFORE UPDATE ON public.item_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- DEFAULT BOARD COLUMNS
-- Insert default column configurations for each board type
-- ================================================

-- Routes Board Default Columns
INSERT INTO public.board_columns (board_type, column_id, column_name, column_name_ka, column_type, position, width, config) VALUES
('routes', 'name', 'Route Name', 'მარშრუტის სახელი', 'text', 1, 200, '{}'::jsonb),
('routes', 'date', 'Date', 'თარიღი', 'date', 2, 120, '{}'::jsonb),
('routes', 'inspector', 'Inspector', 'ინსპექტორი', 'person', 3, 180, '{}'::jsonb),
('routes', 'status', 'Status', 'სტატუსი', 'status', 4, 130, '{"options": ["planned", "in_progress", "completed", "cancelled"]}'::jsonb),
('routes', 'stops_count', 'Stops', 'გაჩერებები', 'number', 5, 90, '{}'::jsonb),
('routes', 'total_distance_km', 'Distance (km)', 'მანძილი (კმ)', 'number', 6, 120, '{"format": "0.00"}'::jsonb),
('routes', 'total_duration_minutes', 'Duration (min)', 'ხანგრძლივობა (წთ)', 'number', 7, 130, '{}'::jsonb),
('routes', 'actions', 'Actions', 'მოქმედებები', 'actions', 8, 120, '{}'::jsonb)
ON CONFLICT (board_type, column_id) DO NOTHING;

-- Companies Board Default Columns
INSERT INTO public.board_columns (board_type, column_id, column_name, column_name_ka, column_type, position, width, config) VALUES
('companies', 'name', 'Company Name', 'კომპანიის სახელი', 'text', 1, 220, '{"pinned": true}'::jsonb),
('companies', 'address', 'Address', 'მისამართი', 'location', 2, 250, '{}'::jsonb),
('companies', 'type', 'Type', 'ტიპი', 'status', 3, 130, '{"options": ["commercial", "residential", "industrial", "healthcare", "education"]}'::jsonb),
('companies', 'assigned_inspector', 'Inspector', 'ინსპექტორი', 'person', 4, 180, '{}'::jsonb),
('companies', 'last_inspection_date', 'Last Inspection', 'ბოლო შემოწმება', 'date', 5, 140, '{}'::jsonb),
('companies', 'next_inspection_date', 'Next Inspection', 'შემდეგი შემოწმება', 'date', 6, 140, '{}'::jsonb),
('companies', 'priority', 'Priority', 'პრიორიტეტი', 'status', 7, 110, '{"options": ["low", "medium", "high"]}'::jsonb),
('companies', 'status', 'Status', 'სტატუსი', 'status', 8, 110, '{"options": ["active", "inactive", "pending"]}'::jsonb),
('companies', 'actions', 'Actions', 'მოქმედებები', 'actions', 9, 120, '{}'::jsonb)
ON CONFLICT (board_type, column_id) DO NOTHING;

-- Inspections Board Default Columns
INSERT INTO public.board_columns (board_type, column_id, column_name, column_name_ka, column_type, position, width, config) VALUES
('inspections', 'company_name', 'Company', 'კომპანია', 'text', 1, 200, '{}'::jsonb),
('inspections', 'service_type', 'Service Type', 'სერვისის ტიპი', 'status', 2, 150, '{}'::jsonb),
('inspections', 'inspector', 'Inspector', 'ინსპექტორი', 'person', 3, 180, '{}'::jsonb),
('inspections', 'inspection_date', 'Date', 'თარიღი', 'date', 4, 120, '{}'::jsonb),
('inspections', 'check_in_time', 'Check-in', 'შესვლა', 'date', 5, 100, '{"showTime": true}'::jsonb),
('inspections', 'duration_minutes', 'Duration (min)', 'ხანგრძლივობა', 'number', 6, 120, '{}'::jsonb),
('inspections', 'status', 'Status', 'სტატუსი', 'status', 7, 130, '{"options": ["completed", "failed", "in_progress", "skipped", "partial"]}'::jsonb),
('inspections', 'actions', 'Actions', 'მოქმედებები', 'actions', 8, 120, '{}'::jsonb)
ON CONFLICT (board_type, column_id) DO NOTHING;

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all new tables
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_comments ENABLE ROW LEVEL SECURITY;

-- Board Columns: Everyone can read, only admins can modify
CREATE POLICY "Everyone can view board columns"
    ON public.board_columns FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage board columns"
    ON public.board_columns FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Board Views: Users can manage their own views, read shared views
CREATE POLICY "Users can view their own and shared views"
    ON public.board_views FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.inspectors WHERE email = auth.email()
        )
        OR is_shared = true
    );

CREATE POLICY "Users can manage their own views"
    ON public.board_views FOR ALL
    USING (
        user_id IN (
            SELECT id FROM public.inspectors WHERE email = auth.email()
        )
    );

-- Item Updates: Everyone authenticated can read activity
CREATE POLICY "Authenticated users can view item updates"
    ON public.item_updates FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create item updates"
    ON public.item_updates FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Board Presence: Users can manage their own presence
CREATE POLICY "Users can view board presence"
    ON public.board_presence FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own presence"
    ON public.board_presence FOR ALL
    USING (
        user_id IN (
            SELECT id FROM public.inspectors WHERE email = auth.email()
        )
    );

-- User Settings: Users can only access their own settings
CREATE POLICY "Users can view their own settings"
    ON public.user_settings FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM public.inspectors WHERE email = auth.email()
        )
    );

CREATE POLICY "Users can manage their own settings"
    ON public.user_settings FOR ALL
    USING (
        user_id IN (
            SELECT id FROM public.inspectors WHERE email = auth.email()
        )
    );

-- Item Comments: Authenticated users can read/create, owners can update/delete
CREATE POLICY "Authenticated users can view comments"
    ON public.item_comments FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create comments"
    ON public.item_comments FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated' AND
        user_id IN (
            SELECT id FROM public.inspectors WHERE email = auth.email()
        )
    );

CREATE POLICY "Users can update their own comments"
    ON public.item_comments FOR UPDATE
    USING (
        user_id IN (
            SELECT id FROM public.inspectors WHERE email = auth.email()
        )
    );

CREATE POLICY "Users can delete their own comments"
    ON public.item_comments FOR DELETE
    USING (
        user_id IN (
            SELECT id FROM public.inspectors WHERE email = auth.email()
        )
    );

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to clean up old presence records (call periodically)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM public.board_presence
    WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(p_user_id UUID, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
    update_type VARCHAR,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        iu.update_type,
        COUNT(*) as count
    FROM public.item_updates iu
    WHERE iu.user_id = p_user_id
      AND iu.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY iu.update_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE public.board_columns IS 'Configuration for board columns across different board types';
COMMENT ON TABLE public.board_views IS 'User-saved board views with custom filters, sorts, and column configurations';
COMMENT ON TABLE public.item_updates IS 'Activity feed tracking all changes to board items';
COMMENT ON TABLE public.board_presence IS 'Real-time presence tracking for users viewing/editing boards';
COMMENT ON TABLE public.user_settings IS 'User preferences for theme, language, notifications, and board settings';
COMMENT ON TABLE public.item_comments IS 'Comments and discussions on board items';

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
