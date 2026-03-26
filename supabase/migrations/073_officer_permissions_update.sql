-- ==========================================
-- UPDATE OFFICER PERMISSIONS
-- Officers need access to more pages than just checkin/tracking
-- ==========================================

-- Ensure officer has settings page access
INSERT INTO role_permissions (role_name, permission) VALUES
  ('officer', 'pages:dashboard'),
  ('officer', 'pages:news'),
  ('officer', 'pages:checkin'),
  ('officer', 'pages:tracking'),
  ('officer', 'pages:settings'),
  ('officer', 'pages:companies'),
  ('officer', 'pages:routes')
ON CONFLICT (role_name, permission) DO NOTHING;
