-- Migration 025: Add date_range column type
-- This adds support for date range columns (start and end date)

-- Drop the old check constraint
ALTER TABLE public.board_columns
DROP CONSTRAINT IF EXISTS board_columns_column_type_check;

-- Add updated check constraint with date_range type
ALTER TABLE public.board_columns
ADD CONSTRAINT board_columns_column_type_check
CHECK (column_type IN (
  'text',
  'status',
  'person',
  'date',
  'date_range',
  'number',
  'location',
  'actions',
  'route',
  'company',
  'service_type',
  'checkbox',
  'phone',
  'files',
  'updates'
));
