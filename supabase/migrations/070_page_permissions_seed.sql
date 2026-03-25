-- ==========================================
-- PAGE PERMISSIONS SEED (Corrected)
-- Ensures all page-level permissions exist and role assignments are correct
-- Safe to run multiple times (idempotent with ON CONFLICT DO NOTHING)
-- ==========================================

-- 1. Insert all page permissions
INSERT INTO permissions (name, resource, action, description, category) VALUES
  ('pages:dashboard', 'pages', 'dashboard', 'Access home/dashboard page', 'Pages'),
  ('pages:news', 'pages', 'news', 'Access news page', 'Pages'),
  ('pages:analytics', 'pages', 'analytics', 'Access analytics page', 'Pages'),
  ('pages:tracking', 'pages', 'tracking', 'Access live tracking page', 'Pages'),
  ('pages:checkin', 'pages', 'checkin', 'Access check-in page', 'Pages'),
  ('pages:checkins_admin', 'pages', 'checkins_admin', 'Access check-ins management page', 'Pages'),
  ('pages:companies', 'pages', 'companies', 'Access companies page', 'Pages'),
  ('pages:inspectors', 'pages', 'inspectors', 'Access inspectors page', 'Pages'),
  ('pages:routes', 'pages', 'routes', 'Access routes page', 'Pages'),
  ('pages:route_builder', 'pages', 'route_builder', 'Access route builder page', 'Pages'),
  ('pages:assignments', 'pages', 'assignments', 'Access assignments page', 'Pages'),
  ('pages:user_management', 'pages', 'user_management', 'Access user management page', 'Pages'),
  ('pages:roles', 'pages', 'roles', 'Access roles & permissions page', 'Pages'),
  ('pages:settings', 'pages', 'settings', 'Access settings page', 'Pages')
ON CONFLICT (name) DO NOTHING;

-- 2. Dispatcher page permissions
INSERT INTO role_permissions (role_name, permission) VALUES
  ('dispatcher', 'pages:dashboard'),
  ('dispatcher', 'pages:news'),
  ('dispatcher', 'pages:analytics'),
  ('dispatcher', 'pages:tracking'),
  ('dispatcher', 'pages:checkins_admin'),
  ('dispatcher', 'pages:companies'),
  ('dispatcher', 'pages:inspectors'),
  ('dispatcher', 'pages:routes'),
  ('dispatcher', 'pages:route_builder'),
  ('dispatcher', 'pages:assignments'),
  ('dispatcher', 'pages:settings')
ON CONFLICT (role_name, permission) DO NOTHING;

-- 3. Inspector page permissions
INSERT INTO role_permissions (role_name, permission) VALUES
  ('inspector', 'pages:dashboard'),
  ('inspector', 'pages:news'),
  ('inspector', 'pages:checkin'),
  ('inspector', 'pages:tracking'),
  ('inspector', 'pages:settings')
ON CONFLICT (role_name, permission) DO NOTHING;

-- Admin already gets wildcard '*' in application code, no explicit page permissions needed
