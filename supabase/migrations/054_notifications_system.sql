-- ==========================================
-- NOTIFICATIONS SYSTEM
-- In-app notifications for user events
-- ==========================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'board_shared', 'assignment_changed', 'route_updated', 'item_mention', 'item_comment'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb, -- Additional context (board_id, item_id, etc.)
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 3. RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Service role can insert notifications for any user
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
CREATE POLICY "Service can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- 4. Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = auth.uid() AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger: Notify user when board is shared with them
CREATE OR REPLACE FUNCTION notify_board_shared()
RETURNS TRIGGER AS $$
DECLARE
  board_name TEXT;
  sharer_name TEXT;
BEGIN
  -- Get board name
  SELECT name INTO board_name FROM boards WHERE id = NEW.board_id;

  -- Get sharer name
  SELECT COALESCE(full_name, email) INTO sharer_name
  FROM users WHERE id = NEW.added_by;

  -- Create notification
  PERFORM create_notification(
    NEW.user_id,
    'board_shared',
    'Board Shared',
    sharer_name || ' shared "' || COALESCE(board_name, 'a board') || '" with you',
    jsonb_build_object(
      'board_id', NEW.board_id,
      'board_name', board_name,
      'shared_by', NEW.added_by,
      'role', NEW.role
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_board_shared ON board_members;
CREATE TRIGGER trigger_notify_board_shared
  AFTER INSERT ON board_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_board_shared();

-- 9. Trigger: Notify inspector when assignment changes
CREATE OR REPLACE FUNCTION notify_assignment_changed()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  service_name TEXT;
BEGIN
  -- Only notify if inspector assignment changed
  IF TG_OP = 'UPDATE' AND OLD.assigned_inspector_id IS DISTINCT FROM NEW.assigned_inspector_id THEN
    -- Get company name
    SELECT c.name INTO company_name
    FROM companies c WHERE c.id = NEW.company_id;

    -- Get service type name
    SELECT st.name_ka INTO service_name
    FROM service_types st WHERE st.id = NEW.service_type_id;

    -- Notify new inspector (if assigned)
    IF NEW.assigned_inspector_id IS NOT NULL THEN
      -- Get user_id from inspector
      DECLARE
        inspector_user_id UUID;
      BEGIN
        SELECT user_id INTO inspector_user_id
        FROM inspectors WHERE id = NEW.assigned_inspector_id;

        IF inspector_user_id IS NOT NULL THEN
          PERFORM create_notification(
            inspector_user_id,
            'assignment_changed',
            'New Assignment',
            'You have been assigned to ' || COALESCE(company_name, 'a company') || ' for ' || COALESCE(service_name, 'inspection'),
            jsonb_build_object(
              'company_id', NEW.company_id,
              'company_name', company_name,
              'service_type_id', NEW.service_type_id,
              'service_name', service_name
            )
          );
        END IF;
      END;
    END IF;

    -- Notify old inspector (if was assigned)
    IF OLD.assigned_inspector_id IS NOT NULL THEN
      DECLARE
        old_inspector_user_id UUID;
      BEGIN
        SELECT user_id INTO old_inspector_user_id
        FROM inspectors WHERE id = OLD.assigned_inspector_id;

        IF old_inspector_user_id IS NOT NULL THEN
          PERFORM create_notification(
            old_inspector_user_id,
            'assignment_changed',
            'Assignment Removed',
            'You have been unassigned from ' || COALESCE(company_name, 'a company'),
            jsonb_build_object(
              'company_id', NEW.company_id,
              'company_name', company_name
            )
          );
        END IF;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_assignment_changed ON company_services;
CREATE TRIGGER trigger_notify_assignment_changed
  AFTER UPDATE ON company_services
  FOR EACH ROW
  EXECUTE FUNCTION notify_assignment_changed();

-- 10. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;

-- Done!
COMMENT ON TABLE notifications IS 'In-app notifications for user events';
