-- ================================================
-- Seed Board Columns
-- Migration 014: Add default columns for each board type
-- ================================================

-- First, update the board_type constraint to include 'custom'
ALTER TABLE public.board_columns DROP CONSTRAINT IF EXISTS board_columns_board_type_check;
ALTER TABLE public.board_columns ADD CONSTRAINT board_columns_board_type_check
  CHECK (board_type IN ('routes', 'companies', 'inspectors', 'inspections', 'custom'));

-- ================================================
-- ROUTES BOARD COLUMNS
-- ================================================

INSERT INTO public.board_columns (board_type, column_id, column_name, column_name_ka, column_type, is_visible, is_pinned, position, width, config) VALUES
-- Essential columns
('routes', 'name', 'Route Name', 'მარშრუტის სახელი', 'text', true, true, 1, 250, '{}'),
('routes', 'status', 'Status', 'სტატუსი', 'status', true, false, 2, 150, '{"options": [
  {"label": "Draft", "color": "gray"},
  {"label": "Planned", "color": "blue"},
  {"label": "In Progress", "color": "yellow"},
  {"label": "Completed", "color": "green"},
  {"label": "Cancelled", "color": "red"}
]}'),
('routes', 'assigned_to', 'Assigned To', 'პასუხისმგებელი', 'person', true, false, 3, 200, '{}'),
('routes', 'date', 'Route Date', 'მარშრუტის თარიღი', 'date', true, false, 4, 150, '{}'),
('routes', 'stops', 'Number of Stops', 'გაჩერებების რაოდენობა', 'number', true, false, 5, 120, '{"format": "integer"}'),
('routes', 'distance', 'Total Distance (km)', 'მანძილი (კმ)', 'number', true, false, 6, 150, '{"format": "decimal", "decimals": 1}'),
('routes', 'duration', 'Estimated Duration', 'სავარაუდო ხანგრძლივობა', 'text', true, false, 7, 150, '{}'),
('routes', 'priority', 'Priority', 'პრიორიტეტი', 'status', true, false, 8, 120, '{"options": [
  {"label": "Low", "color": "gray"},
  {"label": "Medium", "color": "blue"},
  {"label": "High", "color": "orange"},
  {"label": "Urgent", "color": "red"}
]}')
ON CONFLICT (board_type, column_id) DO NOTHING;

-- ================================================
-- COMPANIES BOARD COLUMNS
-- ================================================

INSERT INTO public.board_columns (board_type, column_id, column_name, column_name_ka, column_type, is_visible, is_pinned, position, width, config) VALUES
('companies', 'name', 'Company Name', 'კომპანიის სახელი', 'text', true, true, 1, 250, '{}'),
('companies', 'status', 'Status', 'სტატუსი', 'status', true, false, 2, 150, '{"options": [
  {"label": "Active", "color": "green"},
  {"label": "Pending", "color": "yellow"},
  {"label": "Inactive", "color": "gray"},
  {"label": "Suspended", "color": "red"}
]}'),
('companies', 'location', 'Location', 'ლოკაცია', 'location', true, false, 3, 200, '{}'),
('companies', 'contact_person', 'Contact Person', 'საკონტაქტო პირი', 'person', true, false, 4, 180, '{}'),
('companies', 'phone', 'Phone', 'ტელეფონი', 'text', true, false, 5, 150, '{}'),
('companies', 'last_inspection', 'Last Inspection', 'ბოლო შემოწმება', 'date', true, false, 6, 150, '{}'),
('companies', 'next_inspection', 'Next Inspection', 'შემდეგი შემოწმება', 'date', true, false, 7, 150, '{}'),
('companies', 'risk_level', 'Risk Level', 'რისკის დონე', 'status', true, false, 8, 120, '{"options": [
  {"label": "Low", "color": "green"},
  {"label": "Medium", "color": "yellow"},
  {"label": "High", "color": "orange"},
  {"label": "Critical", "color": "red"}
]}')
ON CONFLICT (board_type, column_id) DO NOTHING;

-- ================================================
-- INSPECTORS BOARD COLUMNS
-- ================================================

INSERT INTO public.board_columns (board_type, column_id, column_name, column_name_ka, column_type, is_visible, is_pinned, position, width, config) VALUES
('inspectors', 'name', 'Inspector Name', 'ინსპექტორის სახელი', 'text', true, true, 1, 200, '{}'),
('inspectors', 'status', 'Status', 'სტატუსი', 'status', true, false, 2, 150, '{"options": [
  {"label": "Active", "color": "green"},
  {"label": "On Leave", "color": "yellow"},
  {"label": "Busy", "color": "orange"},
  {"label": "Inactive", "color": "gray"}
]}'),
('inspectors', 'role', 'Role', 'როლი', 'text', true, false, 3, 150, '{}'),
('inspectors', 'zone', 'Zone', 'ზონა', 'text', true, false, 4, 150, '{}'),
('inspectors', 'phone', 'Phone', 'ტელეფონი', 'text', true, false, 5, 150, '{}'),
('inspectors', 'assigned_routes', 'Assigned Routes', 'მინიჭებული მარშრუტები', 'number', true, false, 6, 150, '{"format": "integer"}'),
('inspectors', 'completed_inspections', 'Completed', 'დასრულებული', 'number', true, false, 7, 120, '{"format": "integer"}'),
('inspectors', 'efficiency', 'Efficiency', 'ეფექტურობა', 'status', true, false, 8, 120, '{"options": [
  {"label": "Excellent", "color": "green"},
  {"label": "Good", "color": "blue"},
  {"label": "Average", "color": "yellow"},
  {"label": "Needs Improvement", "color": "red"}
]}')
ON CONFLICT (board_type, column_id) DO NOTHING;

-- ================================================
-- INSPECTIONS BOARD COLUMNS
-- ================================================

INSERT INTO public.board_columns (board_type, column_id, column_name, column_name_ka, column_type, is_visible, is_pinned, position, width, config) VALUES
('inspections', 'name', 'Inspection Title', 'შემოწმების სათაური', 'text', true, true, 1, 250, '{}'),
('inspections', 'status', 'Status', 'სტატუსი', 'status', true, false, 2, 150, '{"options": [
  {"label": "Scheduled", "color": "blue"},
  {"label": "In Progress", "color": "yellow"},
  {"label": "Completed", "color": "green"},
  {"label": "Failed", "color": "red"},
  {"label": "Rescheduled", "color": "orange"}
]}'),
('inspections', 'inspector', 'Inspector', 'ინსპექტორი', 'person', true, false, 3, 180, '{}'),
('inspections', 'company', 'Company', 'კომპანია', 'text', true, false, 4, 200, '{}'),
('inspections', 'location', 'Location', 'ლოკაცია', 'location', true, false, 5, 200, '{}'),
('inspections', 'scheduled_date', 'Scheduled Date', 'დაგეგმილი თარიღი', 'date', true, false, 6, 150, '{}'),
('inspections', 'completed_date', 'Completed Date', 'დასრულების თარიღი', 'date', true, false, 7, 150, '{}'),
('inspections', 'result', 'Result', 'შედეგი', 'status', true, false, 8, 120, '{"options": [
  {"label": "Passed", "color": "green"},
  {"label": "Passed with Notes", "color": "blue"},
  {"label": "Failed", "color": "red"},
  {"label": "Pending Review", "color": "yellow"}
]}')
ON CONFLICT (board_type, column_id) DO NOTHING;

-- ================================================
-- CUSTOM BOARD COLUMNS (Minimal default set)
-- ================================================

INSERT INTO public.board_columns (board_type, column_id, column_name, column_name_ka, column_type, is_visible, is_pinned, position, width, config) VALUES
('custom', 'name', 'Item Name', 'ელემენტის სახელი', 'text', true, true, 1, 250, '{}'),
('custom', 'status', 'Status', 'სტატუსი', 'status', true, false, 2, 150, '{"options": [
  {"label": "Not Started", "color": "gray"},
  {"label": "In Progress", "color": "blue"},
  {"label": "Done", "color": "green"},
  {"label": "Stuck", "color": "red"}
]}'),
('custom', 'assigned_to', 'Person', 'პირი', 'person', true, false, 3, 180, '{}'),
('custom', 'date', 'Date', 'თარიღი', 'date', true, false, 4, 150, '{}'),
('custom', 'priority', 'Priority', 'პრიორიტეტი', 'status', true, false, 5, 120, '{"options": [
  {"label": "Low", "color": "gray"},
  {"label": "Medium", "color": "blue"},
  {"label": "High", "color": "orange"},
  {"label": "Critical", "color": "red"}
]}')
ON CONFLICT (board_type, column_id) DO NOTHING;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
