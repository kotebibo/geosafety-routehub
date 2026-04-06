-- Migration 080: Add service_type and email column types to board_subitem_columns
-- Aligns subitem column types with parent board_columns

ALTER TABLE public.board_subitem_columns
  DROP CONSTRAINT IF EXISTS board_subitem_columns_column_type_check;

ALTER TABLE public.board_subitem_columns
  ADD CONSTRAINT board_subitem_columns_column_type_check
  CHECK (column_type IN (
    'text', 'status', 'person', 'date', 'date_range',
    'number', 'checkbox', 'phone', 'email', 'files',
    'service_type'
  ));
