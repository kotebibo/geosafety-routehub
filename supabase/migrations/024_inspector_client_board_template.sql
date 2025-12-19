-- ================================================
-- Monday.com Import Templates
-- Migration 024: Templates matching Monday.com exports
-- ================================================

-- 1. Inspector Client Board - For inspector-assigned companies
INSERT INTO public.board_templates (
    name,
    name_ka,
    description,
    board_type,
    icon,
    color,
    category,
    default_columns,
    is_featured
) VALUES (
    'Inspector Client Board',
    'ინსპექტორის კლიენტების დაფა',
    'Track companies assigned to an inspector with inspection schedules, documentation, training, and risk assessments',
    'custom',
    'clipboard-check',
    'blue',
    'Operations',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანია", "type": "text", "width": 200},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "text", "width": 180},
        {"id": "id_code", "name": "ID Code", "name_ka": "ს/კ", "type": "text", "width": 120},
        {"id": "activity", "name": "Activity", "name_ka": "საქმიანობა", "type": "text", "width": 150},
        {"id": "period", "name": "Period", "name_ka": "პერიოდი", "type": "text", "width": 100},
        {"id": "responsible_person", "name": "Responsible", "name_ka": "პასუხ. პირი", "type": "person", "width": 140},
        {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 130, "config": {"options": [
            {"id": "next_inspection", "label": "შემდეგი ინსპექტირება", "color": "#00c875"},
            {"id": "in_progress", "label": "პროცესშია", "color": "#fdab3d"},
            {"id": "preparing", "label": "მზადებაშია", "color": "#0086c0"},
            {"id": "planned", "label": "დაგეგმილია", "color": "#579bfc"},
            {"id": "to_plan", "label": "დასაგეგმია", "color": "#c4c4c4"}
        ]}},
        {"id": "last_inspection_date", "name": "Last Inspection", "name_ka": "ინსპექტირების ბოლო თარიღი", "type": "date", "width": 140},
        {"id": "doc_send_deadline", "name": "Doc Send Deadline", "name_ka": "გადაგზავნის ბოლო ვადა", "type": "date", "width": 140},
        {"id": "documentation", "name": "Documentation", "name_ka": "დოკუმენტაცია", "type": "status", "width": 130, "config": {"options": [
            {"id": "complete", "label": "სრული", "color": "#00c875"},
            {"id": "partial", "label": "ნაწილობრივ", "color": "#fdab3d"},
            {"id": "missing", "label": "არ არის", "color": "#e2445c"},
            {"id": "sent", "label": "გაგზავნილი", "color": "#0086c0"}
        ]}},
        {"id": "risk_assessment", "name": "Risk Assessment", "name_ka": "რისკების შეფასება", "type": "status", "width": 140, "config": {"options": [
            {"id": "complete", "label": "შესრულებული", "color": "#00c875"},
            {"id": "in_progress", "label": "მიმდინარე", "color": "#fdab3d"},
            {"id": "not_started", "label": "არ დაწყებულა", "color": "#e2445c"}
        ]}},
        {"id": "training", "name": "Training", "name_ka": "სწავლება", "type": "status", "width": 120, "config": {"options": [
            {"id": "complete", "label": "ჩატარდა", "color": "#00c875"},
            {"id": "scheduled", "label": "დაგეგმილი", "color": "#fdab3d"},
            {"id": "overdue", "label": "ვადაგადაცილებული", "color": "#e2445c"},
            {"id": "not_required", "label": "არ საჭიროებს", "color": "#c4c4c4"}
        ]}},
        {"id": "training_record", "name": "Training Record", "name_ka": "სწავლების უწყისი", "type": "files", "width": 120},
        {"id": "training_date", "name": "Training Date", "name_ka": "სწ. თარიღი", "type": "date", "width": 120},
        {"id": "next_training_date", "name": "Next Training", "name_ka": "მომდევნო სწავლება", "type": "date", "width": 130},
        {"id": "training_comment", "name": "Training Comment", "name_ka": "სწავლების კომენტარი", "type": "text", "width": 180},
        {"id": "doc_package", "name": "Doc Package", "name_ka": "დოკუმენტაციის პაკეტი", "type": "files", "width": 120},
        {"id": "phone", "name": "Phone", "name_ka": "ნომერი", "type": "phone", "width": 130},
        {"id": "email", "name": "Email", "name_ka": "მეილი", "type": "text", "width": 180},
        {"id": "director", "name": "Director", "name_ka": "დირექტორი", "type": "text", "width": 150}
    ]'::jsonb,
    true
)
ON CONFLICT DO NOTHING;

-- 2. Company Contracts - For contract management with payments
INSERT INTO public.board_templates (
    name,
    name_ka,
    description,
    board_type,
    icon,
    color,
    category,
    default_columns,
    is_featured
) VALUES (
    'Company Contracts',
    'კომპანიების კონტრაქტები',
    'Manage company contracts with payment schedules, invoicing, and contract dates',
    'custom',
    'file-text',
    'green',
    'Finance',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანია", "type": "text", "width": 200},
        {"id": "id_code", "name": "ID Code", "name_ka": "ს/კ", "type": "text", "width": 120},
        {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 150, "config": {"options": [
            {"id": "labor_safety", "label": "შრომის უსაფრთხოება", "color": "#00c875"},
            {"id": "fire_safety", "label": "სახანძრო უსაფრთხოება", "color": "#fdab3d"},
            {"id": "combined", "label": "კომბინირებული", "color": "#0086c0"},
            {"id": "suspended", "label": "შეჩერებული", "color": "#e2445c"},
            {"id": "terminated", "label": "შეწყვეტილი", "color": "#c4c4c4"}
        ]}},
        {"id": "contract_start", "name": "Contract Start", "name_ka": "გაფორმების თარიღი", "type": "date", "width": 130},
        {"id": "contract_end", "name": "Contract End", "name_ka": "დასრულების თარიღი", "type": "date", "width": 130},
        {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ნომერი", "type": "phone", "width": 150},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "text", "width": 200},
        {"id": "director", "name": "Director", "name_ka": "დირექტორი", "type": "text", "width": 150},
        {"id": "initial_payment", "name": "Initial Payment", "name_ka": "პირველადი გადასახადი", "type": "number", "width": 130},
        {"id": "monthly_payment", "name": "Monthly Payment", "name_ka": "ყოველთვიური გადასახადი", "type": "number", "width": 140},
        {"id": "partial_payment", "name": "Partial Payment", "name_ka": "ნაწილობრივი გადახდა", "type": "number", "width": 130},
        {"id": "email", "name": "Email", "name_ka": "მეილი", "type": "text", "width": 180},
        {"id": "files", "name": "Contract Files", "name_ka": "ფაილები", "type": "files", "width": 120},
        {"id": "payment_method", "name": "Payment Method", "name_ka": "გადახდის წესი", "type": "status", "width": 120, "config": {"options": [
            {"id": "prepaid", "label": "წინასწარი", "color": "#00c875"},
            {"id": "postpaid", "label": "თვის ბოლოს", "color": "#fdab3d"},
            {"id": "quarterly", "label": "კვარტალური", "color": "#0086c0"}
        ]}},
        {"id": "invoice_frequency", "name": "Invoice Frequency", "name_ka": "ინვოისის სიხშირე", "type": "status", "width": 130, "config": {"options": [
            {"id": "monthly", "label": "ყოველთვე", "color": "#00c875"},
            {"id": "quarterly", "label": "კვარტალური", "color": "#fdab3d"},
            {"id": "yearly", "label": "წლიური", "color": "#0086c0"},
            {"id": "one_time", "label": "ერთჯერადი", "color": "#c4c4c4"}
        ]}},
        {"id": "vat_status", "name": "VAT Status", "name_ka": "დღგ სტატუსი", "type": "status", "width": 120, "config": {"options": [
            {"id": "vat_payer", "label": "დღგ_ს იხდის", "color": "#00c875"},
            {"id": "non_vat", "label": "არ იხდის დღგ", "color": "#c4c4c4"}
        ]}},
        {"id": "vat_amount", "name": "VAT Amount", "name_ka": "დღგ", "type": "number", "width": 100},
        {"id": "service_type", "name": "Service Type", "name_ka": "მომსახურება", "type": "text", "width": 200},
        {"id": "invoice_amount", "name": "Invoice Amount", "name_ka": "ინვოისის თანხა", "type": "number", "width": 120},
        {"id": "act_amount", "name": "Act Amount", "name_ka": "აქტების თანხა", "type": "number", "width": 120},
        {"id": "invoice_number", "name": "Invoice #", "name_ka": "ინვ. N", "type": "text", "width": 100},
        {"id": "bank_name", "name": "Bank Name", "name_ka": "მიმღები ბანკი", "type": "text", "width": 150},
        {"id": "bank_account", "name": "Bank Account", "name_ka": "ბანკის ანგ", "type": "text", "width": 180},
        {"id": "bank_code", "name": "Bank Code", "name_ka": "ბანკის კოდი", "type": "text", "width": 100},
        {"id": "sales_manager", "name": "Sales Manager", "name_ka": "გაყიდვების მენეჯერი", "type": "person", "width": 150},
        {"id": "notes", "name": "Additional Info", "name_ka": "დამატებითი ინფორმაცია", "type": "text", "width": 200}
    ]'::jsonb,
    true
)
ON CONFLICT DO NOTHING;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
