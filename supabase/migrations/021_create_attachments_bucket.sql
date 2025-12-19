-- Create the attachments storage bucket for file uploads
-- Run this in Supabase Dashboard > SQL Editor if the bucket doesn't exist

-- Note: Storage buckets must be created via Supabase Dashboard or API
-- This SQL creates RLS policies for the bucket once it's created

-- First, you need to create the bucket manually in Supabase Dashboard:
-- 1. Go to Storage in the sidebar
-- 2. Click "New bucket"
-- 3. Name: "attachments"
-- 4. Leave "Public bucket" UNCHECKED (private is more secure)
-- 5. Click "Create bucket"

-- Then run these policies:

-- Drop existing policies first (in case they exist)
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to attachments bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads from attachments bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to attachments bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from attachments bucket" ON storage.objects;

-- Allow uploads to attachments bucket (authenticated + anon for dev)
CREATE POLICY "Allow uploads to attachments bucket"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'attachments');

-- Allow reads from attachments bucket (for signed URLs)
CREATE POLICY "Allow reads from attachments bucket"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'attachments');

-- Allow updates to attachments bucket
CREATE POLICY "Allow updates to attachments bucket"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'attachments');

-- Allow deletes from attachments bucket
CREATE POLICY "Allow deletes from attachments bucket"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'attachments');
