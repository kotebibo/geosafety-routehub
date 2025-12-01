-- ================================================
-- Add Development Inspector
-- Migration 009: Adds a development inspector for testing
-- ================================================

-- Insert development inspector if not exists
INSERT INTO public.inspectors (
    email,
    full_name,
    phone,
    role,
    status,
    zone,
    certifications
)
VALUES (
    'dev@geosafety.ge',
    'Development Admin',
    '+995-555-0000',
    'admin',
    'active',
    'Tbilisi',
    '{"certifications": ["Safety Inspector", "Quality Assurance"]}'::jsonb
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

-- ================================================
-- Update RLS Policy for Development
-- Allow reading inspectors even without auth (for development)
-- ================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "All authenticated users can read inspectors" ON public.inspectors;

-- Create a more permissive policy for development
-- In production, you should restore the authenticated-only policy
CREATE POLICY "Allow reading inspectors for lookup"
  ON public.inspectors FOR SELECT
  USING (true);  -- Allow all reads (development only)

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
