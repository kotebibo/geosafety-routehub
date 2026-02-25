-- ============================================
-- 059: Check-ins Board Type
-- Adds 'checkins' board type so check-in data
-- can be displayed in Monday.com-style boards
-- ============================================

-- 1. Update boards.board_type CHECK constraint
ALTER TABLE public.boards
DROP CONSTRAINT IF EXISTS boards_board_type_check;

ALTER TABLE public.boards
ADD CONSTRAINT boards_board_type_check
CHECK (board_type IN ('routes', 'companies', 'inspectors', 'inspections', 'custom', 'checkins'));

-- 2. Update board_columns.board_type CHECK constraint
ALTER TABLE public.board_columns
DROP CONSTRAINT IF EXISTS board_columns_board_type_check;

ALTER TABLE public.board_columns
ADD CONSTRAINT board_columns_board_type_check
CHECK (board_type IN ('routes', 'companies', 'inspectors', 'inspections', 'custom', 'checkins'));

-- 3. Fix board_columns.column_type CHECK — add 'company_address' (was missing since migration 025)
ALTER TABLE public.board_columns
DROP CONSTRAINT IF EXISTS board_columns_column_type_check;

ALTER TABLE public.board_columns
ADD CONSTRAINT board_columns_column_type_check
CHECK (column_type IN (
  'text', 'status', 'person', 'date', 'date_range', 'number',
  'location', 'actions', 'route', 'company', 'company_address',
  'service_type', 'checkbox', 'phone', 'files', 'updates'
));

-- 4. Insert check-ins board template
INSERT INTO public.board_templates (
  name,
  name_ka,
  description,
  board_type,
  icon,
  color,
  category,
  default_columns,
  is_featured
) VALUES (
  'Check-ins',
  'ჩეკ-ინები',
  'ინსპექტორების ლოკაციის ჩეკ-ინების ბორდი — ავტომატურად ივსება ახალი ჩეკ-ინებით',
  'checkins',
  'map-pinned',
  'purple',
  'ინსპექტირება',
  '[
    {"id": "inspector", "name": "Inspector", "name_ka": "ინსპექტორი", "type": "text", "width": 180, "pinned": true},
    {"id": "company", "name": "Company", "name_ka": "კომპანია", "type": "text", "width": 200},
    {"id": "location", "name": "Location", "name_ka": "ლოკაცია", "type": "text", "width": 180},
    {"id": "checkin_date", "name": "Date", "name_ka": "თარიღი", "type": "date", "width": 140},
    {"id": "coordinates", "name": "Coordinates", "name_ka": "კოორდინატები", "type": "text", "width": 180},
    {"id": "distance", "name": "Distance (m)", "name_ka": "მანძილი (მ)", "type": "number", "width": 120, "config": {"format": "decimal", "decimals": 0}},
    {"id": "accuracy", "name": "Accuracy (m)", "name_ka": "სიზუსტე (მ)", "type": "number", "width": 120, "config": {"format": "decimal", "decimals": 0}},
    {"id": "gps_updated", "name": "GPS Updated", "name_ka": "GPS განახლდა", "type": "checkbox", "width": 130},
    {"id": "notes", "name": "Notes", "name_ka": "შენიშვნები", "type": "text", "width": 200}
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;
