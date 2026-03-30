-- ================================================
-- Soft Delete for Board Items
-- Migration 076: Add deleted_at column for soft delete support
-- ================================================

-- Add soft delete column
ALTER TABLE public.board_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for filtering out deleted items efficiently
CREATE INDEX IF NOT EXISTS idx_board_items_not_deleted ON public.board_items(board_id)
  WHERE deleted_at IS NULL;

-- Update the trigger to also handle soft deletes (track when deleted_at changes)
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
        -- Soft delete detected (deleted_at set from NULL to a value)
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            INSERT INTO public.item_updates (
                item_type,
                item_id,
                user_id,
                update_type,
                content
            ) VALUES (
                'board_item',
                NEW.id,
                COALESCE(NEW.created_by, OLD.created_by),
                'deleted',
                'Deleted item: ' || OLD.name
            );
            RETURN NEW;
        END IF;

        -- Restore detected (deleted_at cleared)
        IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            INSERT INTO public.item_updates (
                item_type,
                item_id,
                user_id,
                update_type,
                content
            ) VALUES (
                'board_item',
                NEW.id,
                COALESCE(NEW.created_by, OLD.created_by),
                'created',
                'Restored item: ' || NEW.name
            );
            RETURN NEW;
        END IF;

        -- Skip logging for already-deleted items
        IF NEW.deleted_at IS NOT NULL THEN
            RETURN NEW;
        END IF;

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
        IF OLD.data IS DISTINCT FROM NEW.data THEN
            SELECT ARRAY(
                SELECT DISTINCT key
                FROM (
                    SELECT jsonb_object_keys(COALESCE(OLD.data, '{}'::jsonb)) AS key
                    UNION
                    SELECT jsonb_object_keys(COALESCE(NEW.data, '{}'::jsonb)) AS key
                ) AS keys
            ) INTO all_keys;

            FOREACH current_key IN ARRAY all_keys
            LOOP
                old_value := OLD.data ->> current_key;
                new_value := NEW.data ->> current_key;

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

-- Recreate trigger
DROP TRIGGER IF EXISTS track_item_changes ON public.board_items;
CREATE TRIGGER track_item_changes
    AFTER INSERT OR UPDATE ON public.board_items
    FOR EACH ROW EXECUTE FUNCTION create_item_update();
