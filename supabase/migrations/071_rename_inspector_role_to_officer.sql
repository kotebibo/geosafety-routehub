-- ==========================================
-- RENAME 'inspector' ROLE TO 'officer'
-- Updates custom_roles, user_roles, and role_permissions tables
-- ==========================================

-- Rename 'inspector' role to 'officer' in custom_roles
UPDATE custom_roles SET name = 'officer', display_name = 'Officer' WHERE name = 'inspector';

-- Update user_roles to use 'officer' instead of 'inspector'
UPDATE user_roles SET role = 'officer' WHERE role = 'inspector';

-- Update role_permissions to reference 'officer' instead of 'inspector'
UPDATE role_permissions SET role_name = 'officer' WHERE role_name = 'inspector';

-- Update 'pages:inspectors' permission to 'pages:officers'
UPDATE permissions SET name = 'pages:officers', action = 'officers', description = 'Access officers page' WHERE name = 'pages:inspectors';

-- Update role_permissions referencing the old permission name
UPDATE role_permissions SET permission = 'pages:officers' WHERE permission = 'pages:inspectors';
