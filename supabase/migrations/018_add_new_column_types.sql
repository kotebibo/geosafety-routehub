-- ================================================
-- Add New Column Types
-- Migration 018: Extend column_type constraint to include new types
-- ================================================

-- NOTE: Authorization Requirements (to implement when re-enabling auth):
-- - 'service_type' column: Only admin accounts should be able to configure/modify
--   service types in the service_types table. Regular users can only SELECT.
-- - The service_type picker in boards should be read-only for non-admin users.

-- Drop the existing constraint
ALTER TABLE public.board_columns DROP CONSTRAINT IF EXISTS board_columns_column_type_check;

-- Add the new constraint with additional column types
ALTER TABLE public.board_columns ADD CONSTRAINT board_columns_column_type_check
  CHECK (column_type IN (
    'text',
    'status',
    'person',
    'date',
    'number',
    'location',
    'actions',
    'route',
    'company',
    'service_type',
    'checkbox',
    'phone',
    'files'
  ));

-- ================================================
-- Create Supabase Storage bucket for attachments
-- NOTE: Run this in Supabase Dashboard > Storage if not auto-created:
-- 1. Create a bucket named 'attachments'
-- 2. Set it to public (for easy file access)
-- 3. Add policy: Allow authenticated users to upload
-- ================================================

-- NOTE: Certificate Expiry Tracking (for future implementation):
-- - Track inspector certifications and their expiry dates
-- - Alert when certifications are expiring soon
-- - Requires admin approval to implement

-- NOTE: Risk Scoring System (for future implementation):
-- Company risk assessment based on:
-- - Failed inspections count and severity
-- - Time since last inspection
-- - Violation patterns and repeat offenses
-- - Compliance rate over time
-- Features:
-- - Automatic risk score calculation (1-100 scale)
-- - Color-coded risk indicators (green/yellow/orange/red)
-- - Risk trend tracking (improving/declining/stable)
-- - Priority scheduling based on risk level
-- - Risk factor breakdown dashboard

-- NOTE: Compliance Dashboard (for future implementation):
-- - Overview of compliance rates by company/route/service type
-- - Charts showing trends over time
-- - Violation breakdown by category
-- - Scheduled vs completed inspections metrics

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
