-- ================================================
-- More Board Templates
-- Migration 023: Add industry-specific board templates
-- ================================================

-- Insert additional templates (using ON CONFLICT to avoid duplicates)
INSERT INTO public.board_templates (name, name_ka, description, board_type, icon, color, category, default_columns, is_featured) VALUES

-- INSPECTION & COMPLIANCE
(
    'Inspection Tracker',
    'ინსპექციის თვალყურის დევნება',
    'Track inspections, findings, and compliance status across locations',
    'custom',
    'clipboard-check',
    'orange',
    'Operations',
    '[
        {"id": "name", "name": "Location", "type": "text", "width": 180},
        {"id": "inspection_date", "name": "Inspection Date", "type": "date", "width": 130},
        {"id": "inspector", "name": "Inspector", "type": "person", "width": 150},
        {"id": "status", "name": "Status", "type": "status", "width": 130},
        {"id": "findings", "name": "Findings", "type": "number", "width": 100},
        {"id": "next_due", "name": "Next Due", "type": "date", "width": 130},
        {"id": "notes", "name": "Notes", "type": "text", "width": 200}
    ]'::jsonb,
    true
),

-- ROUTE PLANNING
(
    'Route Planner',
    'მარშრუტის დამგეგმავი',
    'Plan and track delivery routes with stops and schedules',
    'custom',
    'map-pin',
    'green',
    'Operations',
    '[
        {"id": "name", "name": "Route Name", "type": "text", "width": 180},
        {"id": "driver", "name": "Driver", "type": "person", "width": 150},
        {"id": "status", "name": "Status", "type": "status", "width": 130},
        {"id": "stops", "name": "Stops", "type": "number", "width": 80},
        {"id": "distance", "name": "Distance (km)", "type": "number", "width": 120},
        {"id": "scheduled_date", "name": "Scheduled", "type": "date", "width": 130},
        {"id": "completed", "name": "Completed", "type": "checkbox", "width": 100}
    ]'::jsonb,
    true
),

-- COMPANY MANAGEMENT
(
    'Company Directory',
    'კომპანიების დირექტორია',
    'Manage company contacts and information',
    'custom',
    'building',
    'blue',
    'Sales & CRM',
    '[
        {"id": "name", "name": "Company Name", "type": "text", "width": 200},
        {"id": "contact_person", "name": "Contact", "type": "text", "width": 150},
        {"id": "phone", "name": "Phone", "type": "phone", "width": 140},
        {"id": "status", "name": "Status", "type": "status", "width": 130},
        {"id": "account_manager", "name": "Account Manager", "type": "person", "width": 150},
        {"id": "contract_date", "name": "Contract Date", "type": "date", "width": 130},
        {"id": "notes", "name": "Notes", "type": "text", "width": 180}
    ]'::jsonb,
    false
),

-- EMPLOYEE ONBOARDING
(
    'Employee Onboarding',
    'თანამშრომლის ადაპტაცია',
    'Track new employee onboarding tasks and progress',
    'custom',
    'user-plus',
    'purple',
    'HR & Recruiting',
    '[
        {"id": "name", "name": "Task", "type": "text", "width": 220},
        {"id": "employee", "name": "Employee", "type": "person", "width": 150},
        {"id": "status", "name": "Status", "type": "status", "width": 130},
        {"id": "due_date", "name": "Due Date", "type": "date", "width": 120},
        {"id": "assigned_to", "name": "Responsible", "type": "person", "width": 150},
        {"id": "completed", "name": "Done", "type": "checkbox", "width": 80}
    ]'::jsonb,
    false
),

-- EQUIPMENT INVENTORY
(
    'Equipment Inventory',
    'აღჭურვილობის ინვენტარი',
    'Track equipment, maintenance schedules, and assignments',
    'custom',
    'package',
    'gray',
    'Operations',
    '[
        {"id": "name", "name": "Equipment Name", "type": "text", "width": 200},
        {"id": "serial_number", "name": "Serial #", "type": "text", "width": 140},
        {"id": "status", "name": "Status", "type": "status", "width": 130},
        {"id": "assigned_to", "name": "Assigned To", "type": "person", "width": 150},
        {"id": "last_maintenance", "name": "Last Maintenance", "type": "date", "width": 140},
        {"id": "next_maintenance", "name": "Next Due", "type": "date", "width": 130}
    ]'::jsonb,
    false
),

-- BUG TRACKER
(
    'Bug Tracker',
    'შეცდომების თვალყურის დევნება',
    'Track bugs, issues, and feature requests',
    'custom',
    'bug',
    'red',
    'Project Management',
    '[
        {"id": "name", "name": "Issue Title", "type": "text", "width": 250},
        {"id": "status", "name": "Status", "type": "status", "width": 130},
        {"id": "priority", "name": "Priority", "type": "status", "width": 110},
        {"id": "assigned_to", "name": "Assignee", "type": "person", "width": 150},
        {"id": "reported_date", "name": "Reported", "type": "date", "width": 120},
        {"id": "due_date", "name": "Due Date", "type": "date", "width": 120}
    ]'::jsonb,
    false
),

-- MEETING NOTES
(
    'Meeting Notes',
    'შეხვედრის ჩანაწერები',
    'Track meetings, attendees, and action items',
    'custom',
    'users',
    'cyan',
    'Productivity',
    '[
        {"id": "name", "name": "Meeting Title", "type": "text", "width": 220},
        {"id": "meeting_date", "name": "Date", "type": "date", "width": 120},
        {"id": "organizer", "name": "Organizer", "type": "person", "width": 150},
        {"id": "status", "name": "Status", "type": "status", "width": 120},
        {"id": "action_items", "name": "Action Items", "type": "number", "width": 120},
        {"id": "notes", "name": "Notes", "type": "text", "width": 200}
    ]'::jsonb,
    false
),

-- CONTENT CALENDAR
(
    'Content Calendar',
    'კონტენტის კალენდარი',
    'Plan and schedule content across channels',
    'custom',
    'calendar',
    'pink',
    'Marketing',
    '[
        {"id": "name", "name": "Content Title", "type": "text", "width": 220},
        {"id": "content_type", "name": "Type", "type": "status", "width": 120},
        {"id": "status", "name": "Status", "type": "status", "width": 130},
        {"id": "author", "name": "Author", "type": "person", "width": 150},
        {"id": "publish_date", "name": "Publish Date", "type": "date", "width": 130},
        {"id": "channel", "name": "Channel", "type": "text", "width": 120}
    ]'::jsonb,
    false
),

-- EXPENSE TRACKER
(
    'Expense Tracker',
    'ხარჯების თვალყურის დევნება',
    'Track expenses and reimbursements',
    'custom',
    'dollar-sign',
    'green',
    'Finance',
    '[
        {"id": "name", "name": "Description", "type": "text", "width": 220},
        {"id": "amount", "name": "Amount", "type": "number", "width": 120},
        {"id": "category", "name": "Category", "type": "status", "width": 130},
        {"id": "submitted_by", "name": "Submitted By", "type": "person", "width": 150},
        {"id": "expense_date", "name": "Date", "type": "date", "width": 120},
        {"id": "status", "name": "Status", "type": "status", "width": 120},
        {"id": "receipt", "name": "Receipt", "type": "files", "width": 100}
    ]'::jsonb,
    false
),

-- DAILY STANDUP
(
    'Daily Standup',
    'ყოველდღიური შეხვედრა',
    'Track daily progress, blockers, and plans',
    'custom',
    'sunrise',
    'yellow',
    'Productivity',
    '[
        {"id": "name", "name": "Team Member", "type": "person", "width": 180},
        {"id": "date", "name": "Date", "type": "date", "width": 120},
        {"id": "yesterday", "name": "Yesterday", "type": "text", "width": 200},
        {"id": "today", "name": "Today", "type": "text", "width": 200},
        {"id": "blockers", "name": "Blockers", "type": "text", "width": 180}
    ]'::jsonb,
    false
)

ON CONFLICT DO NOTHING;

-- Update the featured templates
UPDATE public.board_templates SET is_featured = true WHERE name IN ('Project Management', 'Inspection Tracker', 'Route Planner');

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
