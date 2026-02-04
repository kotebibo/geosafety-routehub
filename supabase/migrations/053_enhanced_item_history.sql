-- ================================================
-- Enhanced Item History Tracking
-- Migration 053: Track all JSONB column changes and board transfers
-- ================================================

-- ================================================
-- STEP 1: Update item_updates table constraints and columns
-- ================================================

-- Drop existing constraint to add new update types
ALTER TABLE public.item_updates DROP CONSTRAINT IF EXISTS item_updates_update_type_check;

-- Add new constraint with additional update types
ALTER TABLE public.item_updates ADD CONSTRAINT item_updates_update_type_check
  CHECK (update_type IN (
    'created', 'updated', 'deleted', 'status_changed',
    'assigned', 'reassigned', 'comment', 'completed',
    'column_changed',    -- NEW: For tracking individual column value changes
    'moved_to_board'     -- NEW: For tracking item transfers between boards
  ));

-- Add column_id field to track which column changed
ALTER TABLE public.item_updates ADD COLUMN IF NOT EXISTS column_id VARCHAR(100);

-- Add source/target board tracking for moves
ALTER TABLE public.item_updates ADD COLUMN IF NOT EXISTS source_board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL;
ALTER TABLE public.item_updates ADD COLUMN IF NOT EXISTS target_board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL;

-- Add index for column_id lookups
CREATE INDEX IF NOT EXISTS idx_item_updates_column ON public.item_updates(column_id) WHERE column_id IS NOT NULL;

-- Add index for board transfer lookups
CREATE INDEX IF NOT EXISTS idx_item_updates_board_moves ON public.item_updates(source_board_id, target_board_id)
  WHERE update_type = 'moved_to_board';

-- ================================================
-- STEP 2: Add tracking columns to board_items for move history
-- ================================================

-- Track original board for items that have been moved
ALTER TABLE public.board_items ADD COLUMN IF NOT EXISTS original_board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL;

-- Store metadata about moves (column mapping used, unmapped data preserved)
ALTER TABLE public.board_items ADD COLUMN IF NOT EXISTS move_metadata JSONB DEFAULT '{}'::jsonb;

-- ================================================
-- STEP 3: Update trigger function to track JSONB data changes
-- ================================================

CREATE OR REPLACE FUNCTION create_item_update()
RETURNS TRIGGER AS $$
DECLARE
    old_key TEXT;
    new_key TEXT;
    old_value TEXT;
    new_value TEXT;
    all_keys TEXT[];
    current_key TEXT;
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
        -- Name changed
        IF OLD.name IS DISTINCT FROM NEW.name THEN
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
                COALESCE(NEW.created_by, OLD.created_by),
                'column_changed',
                'name',
                OLD.name,
                NEW.name
            );
        END IF;

        -- Status changed
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.item_updates (
                item_type,
                item_id,
                user_id,
                update_type,
                field_name,
                column_id,
                old_value,
                new_value
            ) VALUES (
                'board_item',
                NEW.id,
                COALESCE(NEW.created_by, OLD.created_by),
                'status_changed',
                'status',
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
                column_id,
                old_value,
                new_value
            ) VALUES (
                'board_item',
                NEW.id,
                COALESCE(NEW.created_by, OLD.created_by),
                CASE
                    WHEN OLD.assigned_to IS NULL THEN 'assigned'
                    ELSE 'reassigned'
                END,
                'assigned_to',
                'assigned_to',
                OLD.assigned_to::text,
                NEW.assigned_to::text
            );
        END IF;

        -- Due date changed
        IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
            INSERT INTO public.item_updates (
                item_type,
                item_id,
                user_id,
                update_type,
                field_name,
                column_id,
                old_value,
                new_value
            ) VALUES (
                'board_item',
                NEW.id,
                COALESCE(NEW.created_by, OLD.created_by),
                'column_changed',
                'due_date',
                'due_date',
                OLD.due_date::text,
                NEW.due_date::text
            );
        END IF;

        -- Priority changed
        IF OLD.priority IS DISTINCT FROM NEW.priority THEN
            INSERT INTO public.item_updates (
                item_type,
                item_id,
                user_id,
                update_type,
                field_name,
                column_id,
                old_value,
                new_value
            ) VALUES (
                'board_item',
                NEW.id,
                COALESCE(NEW.created_by, OLD.created_by),
                'column_changed',
                'priority',
                'priority',
                OLD.priority::text,
                NEW.priority::text
            );
        END IF;

        -- Board changed (item moved to different board)
        IF OLD.board_id IS DISTINCT FROM NEW.board_id THEN
            INSERT INTO public.item_updates (
                item_type,
                item_id,
                user_id,
                update_type,
                source_board_id,
                target_board_id,
                content
            ) VALUES (
                'board_item',
                NEW.id,
                COALESCE(NEW.created_by, OLD.created_by),
                'moved_to_board',
                OLD.board_id,
                NEW.board_id,
                'Item moved to different board'
            );
        END IF;

        -- JSONB data column changes
        -- Get all unique keys from both old and new data
        IF OLD.data IS DISTINCT FROM NEW.data THEN
            -- Collect all keys from both old and new JSONB
            SELECT ARRAY(
                SELECT DISTINCT key
                FROM (
                    SELECT jsonb_object_keys(COALESCE(OLD.data, '{}'::jsonb)) AS key
                    UNION
                    SELECT jsonb_object_keys(COALESCE(NEW.data, '{}'::jsonb)) AS key
                ) AS keys
            ) INTO all_keys;

            -- Loop through each key and check for changes
            FOREACH current_key IN ARRAY all_keys
            LOOP
                old_value := OLD.data ->> current_key;
                new_value := NEW.data ->> current_key;

                -- Only log if value actually changed
                IF old_value IS DISTINCT FROM new_value THEN
                    INSERT INTO public.item_updates (
                        item_type,
                        item_id,
                        user_id,
                        update_type,
                        field_name,
                        column_id,
                        old_value,
                        new_value
                    ) VALUES (
                        'board_item',
                        NEW.id,
                        COALESCE(NEW.created_by, OLD.created_by),
                        'column_changed',
                        current_key,
                        current_key,
                        COALESCE(old_value, ''),
                        COALESCE(new_value, '')
                    );
                END IF;
            END LOOP;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- STEP 4: Recreate trigger (in case it needs updating)
-- ================================================

DROP TRIGGER IF EXISTS track_item_changes ON public.board_items;
CREATE TRIGGER track_item_changes
    AFTER INSERT OR UPDATE ON public.board_items
    FOR EACH ROW EXECUTE FUNCTION create_item_update();

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON COLUMN public.item_updates.column_id IS 'The column_id that was changed (matches board_columns.column_id)';
COMMENT ON COLUMN public.item_updates.source_board_id IS 'Source board when item is moved between boards';
COMMENT ON COLUMN public.item_updates.target_board_id IS 'Target board when item is moved between boards';
COMMENT ON COLUMN public.board_items.original_board_id IS 'The original board this item was created in (for tracking move history)';
COMMENT ON COLUMN public.board_items.move_metadata IS 'Metadata about moves: column mappings used, unmapped data preserved';
