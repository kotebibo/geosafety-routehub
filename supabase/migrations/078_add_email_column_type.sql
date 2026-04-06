-- Migration 078: Add email column type
-- Adds 'email' to the board_columns column_type CHECK constraint

ALTER TABLE public.board_columns
DROP CONSTRAINT IF EXISTS board_columns_column_type_check;

ALTER TABLE public.board_columns
ADD CONSTRAINT board_columns_column_type_check
CHECK (column_type IN (
  'text', 'status', 'person', 'date', 'date_range', 'number',
  'location', 'actions', 'route', 'company', 'company_address',
  'service_type', 'checkbox', 'phone', 'email', 'files', 'updates'
));
