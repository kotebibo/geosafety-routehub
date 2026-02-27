-- ==========================================
-- PAGE ACCESS PERMISSIONS
-- Adds per-page permissions so admins can control which roles see which pages
-- ==========================================

-- 1. Insert page permissions
INSERT INTO permissions (name, resource, action, description, category) VALUES
  ('pages:dashboard', 'pages', 'dashboard', 'Access home/dashboard page', 'Page Access'),
  ('pages:news', 'pages', 'news', 'Access news page', 'Page Access'),
  ('pages:analytics', 'pages', 'analytics', 'Access analytics page', 'Page Access'),
  ('pages:tracking', 'pages', 'tracking', 'Access live tracking page', 'Page Access'),
  ('pages:checkin', 'pages', 'checkin', 'Access check-in page', 'Page Access'),
  ('pages:checkins_admin', 'pages', 'checkins_admin', 'Access check-ins management page', 'Page Access'),
  ('pages:companies', 'pages', 'companies', 'Access companies page', 'Page Access'),
  ('pages:inspectors', 'pages', 'inspectors', 'Access inspectors page', 'Page Access'),
  ('pages:routes', 'pages', 'routes', 'Access routes page', 'Page Access'),
  ('pages:route_builder', 'pages', 'route_builder', 'Access route builder page', 'Page Access'),
  ('pages:assignments', 'pages', 'assignments', 'Access assignments page', 'Page Access'),
  ('pages:user_management', 'pages', 'user_management', 'Access user management page', 'Page Access'),
  ('pages:roles', 'pages', 'roles', 'Access roles & permissions page', 'Page Access'),
  ('pages:service_types', 'pages', 'service_types', 'Access service types page', 'Page Access'),
  ('pages:settings', 'pages', 'settings', 'Access settings page', 'Page Access')
ON CONFLICT (name) DO NOTHING;

-- 2. Assign page permissions to dispatcher role
-- Matches current hardcoded access: everything except admin-only pages
INSERT INTO role_permissions (role_name, permission) VALUES
  ('dispatcher', 'pages:dashboard'),
  ('dispatcher', 'pages:news'),
  ('dispatcher', 'pages:analytics'),
  ('dispatcher', 'pages:tracking'),
  ('dispatcher', 'pages:checkin'),
  ('dispatcher', 'pages:checkins_admin'),
  ('dispatcher', 'pages:companies'),
  ('dispatcher', 'pages:inspectors'),
  ('dispatcher', 'pages:routes'),
  ('dispatcher', 'pages:route_builder'),
  ('dispatcher', 'pages:assignments'),
  ('dispatcher', 'pages:settings')
ON CONFLICT (role_name, permission) DO NOTHING;

-- 3. Assign page permissions to inspector role
-- Matches current hardcoded access: dashboard, news, checkin, routes, settings
INSERT INTO role_permissions (role_name, permission) VALUES
  ('inspector', 'pages:dashboard'),
  ('inspector', 'pages:news'),
  ('inspector', 'pages:checkin'),
  ('inspector', 'pages:routes'),
  ('inspector', 'pages:settings')
ON CONFLICT (role_name, permission) DO NOTHING;

-- Admin already has '*' which covers all pages automatically
