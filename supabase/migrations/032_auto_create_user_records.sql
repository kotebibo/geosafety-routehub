-- ================================================
-- AUTO-CREATE USER RECORDS ON SIGNUP
-- Migration 032: Automatically create inspector and user_roles when user signs up
-- ================================================

-- Drop existing function to replace it
DROP FUNCTION IF EXISTS public.upsert_user_profile(UUID, TEXT, TEXT, TEXT);

-- Enhanced function that creates all necessary user records
CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT DEFAULT NULL,
  user_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  existing_inspector_id UUID;
  new_inspector_id UUID;
  final_inspector_id UUID;
  user_display_name TEXT;
  result JSONB;
BEGIN
  -- Determine display name
  user_display_name := COALESCE(user_full_name, SPLIT_PART(user_email, '@', 1));

  -- 1. Upsert users table (profile)
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    user_id,
    user_email,
    user_display_name,
    user_avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();

  -- 2. Check if inspector record exists for this email
  SELECT id INTO existing_inspector_id
  FROM public.inspectors
  WHERE email = user_email
  LIMIT 1;

  IF existing_inspector_id IS NULL THEN
    -- Create new inspector record with 'inspector' role by default
    INSERT INTO public.inspectors (email, full_name, role, status, zone)
    VALUES (
      user_email,
      user_display_name,
      'inspector',  -- Default role, can be changed by admin
      'active',
      'Tbilisi'     -- Default zone
    )
    RETURNING id INTO new_inspector_id;

    final_inspector_id := new_inspector_id;
  ELSE
    final_inspector_id := existing_inspector_id;
  END IF;

  -- 3. Check if user_roles record exists
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = upsert_user_profile.user_id) THEN
    -- Create user_roles record with default 'inspector' role
    -- Admins can upgrade this later
    INSERT INTO public.user_roles (user_id, role, inspector_id)
    VALUES (
      user_id,
      'inspector',  -- Default role for new signups
      final_inspector_id
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- 4. Return result with inspector_id for reference
  result := jsonb_build_object(
    'success', true,
    'user_id', user_id,
    'inspector_id', final_inspector_id,
    'is_new_inspector', existing_inspector_id IS NULL
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ================================================
-- HELPER: Function to upgrade a user to admin
-- Can only be called by existing admins
-- ================================================
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email TEXT)
RETURNS JSONB AS $$
DECLARE
  target_user_id UUID;
  target_inspector_id UUID;
BEGIN
  -- Check if caller is admin
  IF NOT is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;

  -- Get auth user ID
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;

  -- Get inspector ID
  SELECT id INTO target_inspector_id FROM inspectors WHERE email = target_email;

  IF target_inspector_id IS NOT NULL THEN
    -- Update inspector role
    UPDATE inspectors SET role = 'admin' WHERE id = target_inspector_id;
  END IF;

  -- Update user_roles
  UPDATE user_roles SET role = 'admin' WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    -- Create if not exists
    INSERT INTO user_roles (user_id, role, inspector_id)
    VALUES (target_user_id, 'admin', target_inspector_id)
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  END IF;

  RETURN jsonb_build_object('success', true, 'user_id', target_user_id, 'role', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.promote_to_admin(TEXT) TO authenticated;

-- ================================================
-- DONE! New users will automatically get:
-- 1. A record in the 'users' table
-- 2. A record in the 'inspectors' table
-- 3. A record in 'user_roles' with 'inspector' role
--
-- Admins can then upgrade users using:
-- SELECT promote_to_admin('user@email.com');
-- ================================================
