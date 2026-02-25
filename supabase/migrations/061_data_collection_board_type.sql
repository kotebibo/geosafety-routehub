-- Add 'data_collection' board type for company data collection form
-- ================================================================

-- Update CHECK constraint on boards table
ALTER TABLE public.boards
  DROP CONSTRAINT IF EXISTS boards_board_type_check;

ALTER TABLE public.boards
  ADD CONSTRAINT boards_board_type_check
  CHECK (board_type IN ('routes', 'companies', 'inspectors', 'inspections', 'custom', 'checkins', 'data_collection'));

-- Update CHECK constraint on board_columns table
ALTER TABLE public.board_columns
  DROP CONSTRAINT IF EXISTS board_columns_board_type_check;

ALTER TABLE public.board_columns
  ADD CONSTRAINT board_columns_board_type_check
  CHECK (board_type IN ('routes', 'companies', 'inspectors', 'inspections', 'custom', 'checkins', 'data_collection'));

-- Create a default data_collection board owned by the first admin
INSERT INTO public.boards (id, owner_id, board_type, name, icon, color, settings)
SELECT
  gen_random_uuid(),
  ur.user_id,
  'data_collection',
  'კომპანიების მონაცემები',
  'building',
  '#6161FF',
  '{}'::jsonb
FROM public.user_roles ur
WHERE ur.role = 'admin'
ORDER BY ur.created_at ASC
LIMIT 1;

-- Create default groups for the new board
DO $$
DECLARE
  v_board_id UUID;
BEGIN
  SELECT id INTO v_board_id FROM public.boards WHERE board_type = 'data_collection' LIMIT 1;

  IF v_board_id IS NOT NULL THEN
    INSERT INTO public.board_groups (board_id, name, color, position, is_collapsed)
    VALUES
      (v_board_id, 'ახალი', '#579bfc', 0, false),
      (v_board_id, 'დამუშავებული', '#00c875', 1, false);

    -- Seed default columns for this board
    INSERT INTO public.board_columns (board_id, board_type, column_id, column_name, column_name_ka, column_type, is_visible, is_pinned, position, width, config)
    VALUES
      (v_board_id, 'data_collection', 'sk_code',      'SK Code',      'სკ',              'text',     true, false, 0, 120, '{}'),
      (v_board_id, 'data_collection', 'company_name',  'Company',      'კომპანია',         'text',     true, false, 1, 200, '{}'),
      (v_board_id, 'data_collection', 'services',      'Services',     'მომსახურებები',     'text',     true, false, 2, 250, '{}'),
      (v_board_id, 'data_collection', 'coordinates',   'GPS',          'GPS კოორდინატები', 'text',     true, false, 3, 200, '{}'),
      (v_board_id, 'data_collection', 'notes',         'Notes',        'შენიშვნები',       'text',     true, false, 4, 200, '{}');
  END IF;
END $$;
