-- ============================================
-- 057: Announcements System
-- News & announcements with read tracking
-- ============================================

-- 1. Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Announcement reads (who read what)
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

-- 3. Indexes
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_announcements_published ON announcements(is_published) WHERE is_published = true;
CREATE INDEX idx_announcement_reads_user ON announcement_reads(user_id);
CREATE INDEX idx_announcement_reads_announcement ON announcement_reads(announcement_id);

-- 4. RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read published announcements
CREATE POLICY "authenticated_select_announcements" ON announcements
  FOR SELECT TO authenticated
  USING (is_published = true);

-- Admins can do everything with announcements
CREATE POLICY "admin_all_announcements" ON announcements
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
  );

-- Users can view their own read records
CREATE POLICY "users_select_own_reads" ON announcement_reads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own read records
CREATE POLICY "users_insert_own_reads" ON announcement_reads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Get announcements with read status for current user
CREATE OR REPLACE FUNCTION get_announcements_with_read_status()
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  priority TEXT,
  author_id UUID,
  author_name TEXT,
  is_published BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_read BOOLEAN,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.content,
    a.priority,
    a.author_id,
    COALESCE(u.full_name, u.email::TEXT) AS author_name,
    a.is_published,
    a.created_at,
    a.updated_at,
    (ar.id IS NOT NULL) AS is_read,
    ar.read_at
  FROM announcements a
  LEFT JOIN users u ON u.id = a.author_id
  LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = auth.uid()
  WHERE a.is_published = true
  ORDER BY a.created_at DESC;
END;
$$;

-- 6. Mark announcement as read
CREATE OR REPLACE FUNCTION mark_announcement_read(p_announcement_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO announcement_reads (announcement_id, user_id)
  VALUES (p_announcement_id, auth.uid())
  ON CONFLICT (announcement_id, user_id) DO NOTHING;

  RETURN true;
END;
$$;

-- 7. Get unread announcement count
CREATE OR REPLACE FUNCTION get_unread_announcements_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO result
  FROM announcements a
  WHERE a.is_published = true
    AND NOT EXISTS (
      SELECT 1 FROM announcement_reads ar
      WHERE ar.announcement_id = a.id AND ar.user_id = auth.uid()
    );

  RETURN result;
END;
$$;

-- 8. Updated_at trigger
CREATE OR REPLACE FUNCTION update_announcement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcement_updated_at();
