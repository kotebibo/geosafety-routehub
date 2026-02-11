-- ================================================
-- Monday.com Company Board Templates
-- Migration 051: Add 9 company contract board templates from Monday.com
-- ================================================

-- Insert company contract board templates
INSERT INTO public.board_templates (name, name_ka, description, board_type, icon, color, category, default_columns, is_featured) VALUES

-- 1. ჯეო სეიფთი (Geo Safety) - Main contracts board
(
    'Geo Safety Contracts',
    'ჯეო სეიფთი',
    'Main company contracts board for Geo Safety',
    'custom',
    'building',
    'blue',
    'კომპანიის ხელშეკრულებები',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანიის სახელი", "type": "text", "width": 250, "pinned": true},
        {"id": "tax_id", "name": "Tax ID", "name_ka": "საიდენტიფიკაციო კოდი", "type": "text", "width": 150},
        {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 130, "options": [
            {"label": "აქტიური", "color": "green"},
            {"label": "შეჩერებული", "color": "yellow"},
            {"label": "შეწყვეტილი", "color": "red"}
        ]},
        {"id": "contract_start", "name": "Contract Start", "name_ka": "ხელშეკრულების დაწყება", "type": "date", "width": 140},
        {"id": "contract_end", "name": "Contract End", "name_ka": "ხელშეკრულების დასრულება", "type": "date", "width": 140},
        {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ტელეფონი", "type": "phone", "width": 150},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "long_text", "width": 250},
        {"id": "director", "name": "Director", "name_ka": "დირექტორი/მფლობელი", "type": "text", "width": 180},
        {"id": "initial_payment", "name": "Initial Payment", "name_ka": "საწყისი გადასახადი", "type": "number", "width": 130},
        {"id": "monthly_payment", "name": "Monthly Payment", "name_ka": "ყოველთვიური გადასახადი", "type": "number", "width": 150},
        {"id": "email", "name": "Email", "name_ka": "ელ.ფოსტა", "type": "text", "width": 200},
        {"id": "payment_method", "name": "Payment Method", "name_ka": "გადახდის მეთოდი", "type": "status", "width": 140, "options": [
            {"label": "ნაღდი", "color": "green"},
            {"label": "უნაღდო", "color": "blue"},
            {"label": "ორივე", "color": "purple"}
        ]},
        {"id": "vat_status", "name": "VAT Status", "name_ka": "დღგ სტატუსი", "type": "status", "width": 160, "options": [
            {"label": "დღგ-ს გადამხდელი", "color": "blue"},
            {"label": "არ არის დღგ-ს გადამხდელი", "color": "gray"}
        ]},
        {"id": "service_description", "name": "Service Description", "name_ka": "მომსახურების აღწერა", "type": "long_text", "width": 300}
    ]'::jsonb,
    true
),

-- 2. სეიფთი ქორფ (Safety Corp)
(
    'Safety Corp Contracts',
    'სეიფთი ქორფ',
    'Safety Corp company contracts',
    'custom',
    'shield',
    'green',
    'კომპანიის ხელშეკრულებები',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანიის სახელი", "type": "text", "width": 250, "pinned": true},
        {"id": "tax_id", "name": "Tax ID", "name_ka": "საიდენტიფიკაციო კოდი", "type": "text", "width": 150},
        {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 130, "options": [
            {"label": "აქტიური", "color": "green"},
            {"label": "შეჩერებული", "color": "yellow"},
            {"label": "შეწყვეტილი", "color": "red"}
        ]},
        {"id": "contract_start", "name": "Contract Start", "name_ka": "ხელშეკრულების დაწყება", "type": "date", "width": 140},
        {"id": "contract_end", "name": "Contract End", "name_ka": "ხელშეკრულების დასრულება", "type": "date", "width": 140},
        {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ტელეფონი", "type": "phone", "width": 150},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "long_text", "width": 250},
        {"id": "director", "name": "Director", "name_ka": "დირექტორი/მფლობელი", "type": "text", "width": 180},
        {"id": "monthly_payment", "name": "Monthly Payment", "name_ka": "ყოველთვიური გადასახადი", "type": "number", "width": 150},
        {"id": "email", "name": "Email", "name_ka": "ელ.ფოსტა", "type": "text", "width": 200},
        {"id": "payment_method", "name": "Payment Method", "name_ka": "გადახდის მეთოდი", "type": "status", "width": 140, "options": [
            {"label": "ნაღდი", "color": "green"},
            {"label": "უნაღდო", "color": "blue"},
            {"label": "ორივე", "color": "purple"}
        ]},
        {"id": "vat_status", "name": "VAT Status", "name_ka": "დღგ სტატუსი", "type": "status", "width": 160, "options": [
            {"label": "დღგ-ს გადამხდელი", "color": "blue"},
            {"label": "არ არის დღგ-ს გადამხდელი", "color": "gray"}
        ]},
        {"id": "service_description", "name": "Service Description", "name_ka": "მომსახურების აღწერა", "type": "long_text", "width": 300}
    ]'::jsonb,
    true
),

-- 3. ბლექ სი სეიფთი (Black Sea Safety)
(
    'Black Sea Safety Contracts',
    'ბლექ სი სეიფთი',
    'Black Sea Safety company contracts',
    'custom',
    'anchor',
    'cyan',
    'კომპანიის ხელშეკრულებები',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანიის სახელი", "type": "text", "width": 250, "pinned": true},
        {"id": "tax_id", "name": "Tax ID", "name_ka": "საიდენტიფიკაციო კოდი", "type": "text", "width": 150},
        {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 130, "options": [
            {"label": "აქტიური", "color": "green"},
            {"label": "შეჩერებული", "color": "yellow"},
            {"label": "შეწყვეტილი", "color": "red"}
        ]},
        {"id": "contract_start", "name": "Contract Start", "name_ka": "ხელშეკრულების დაწყება", "type": "date", "width": 140},
        {"id": "contract_end", "name": "Contract End", "name_ka": "ხელშეკრულების დასრულება", "type": "date", "width": 140},
        {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ტელეფონი", "type": "phone", "width": 150},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "long_text", "width": 250},
        {"id": "director", "name": "Director", "name_ka": "დირექტორი/მფლობელი", "type": "text", "width": 180},
        {"id": "initial_payment", "name": "Initial Payment", "name_ka": "საწყისი გადასახადი", "type": "number", "width": 130},
        {"id": "monthly_payment", "name": "Monthly Payment", "name_ka": "ყოველთვიური გადასახადი", "type": "number", "width": 150},
        {"id": "email", "name": "Email", "name_ka": "ელ.ფოსტა", "type": "text", "width": 200},
        {"id": "payment_method", "name": "Payment Method", "name_ka": "გადახდის მეთოდი", "type": "status", "width": 140, "options": [
            {"label": "ნაღდი", "color": "green"},
            {"label": "უნაღდო", "color": "blue"},
            {"label": "ორივე", "color": "purple"}
        ]},
        {"id": "vat_status", "name": "VAT Status", "name_ka": "დღგ სტატუსი", "type": "status", "width": 160, "options": [
            {"label": "დღგ-ს გადამხდელი", "color": "blue"},
            {"label": "არ არის დღგ-ს გადამხდელი", "color": "gray"}
        ]},
        {"id": "service_description", "name": "Service Description", "name_ka": "მომსახურების აღწერა", "type": "long_text", "width": 300}
    ]'::jsonb,
    true
),

-- 4. იოლის ფრენჩაიზები (Ioli's Franchises)
(
    'Ioli Franchises',
    'იოლის ფრენჩაიზები',
    'Ioli franchise company contracts',
    'custom',
    'store',
    'orange',
    'კომპანიის ხელშეკრულებები',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანიის სახელი", "type": "text", "width": 250, "pinned": true},
        {"id": "tax_id", "name": "Tax ID", "name_ka": "საიდენტიფიკაციო კოდი", "type": "text", "width": 150},
        {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 130, "options": [
            {"label": "აქტიური", "color": "green"},
            {"label": "შეჩერებული", "color": "yellow"},
            {"label": "შეწყვეტილი", "color": "red"}
        ]},
        {"id": "contract_start", "name": "Contract Start", "name_ka": "ხელშეკრულების დაწყება", "type": "date", "width": 140},
        {"id": "contract_end", "name": "Contract End", "name_ka": "ხელშეკრულების დასრულება", "type": "date", "width": 140},
        {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ტელეფონი", "type": "phone", "width": 150},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "long_text", "width": 250},
        {"id": "director", "name": "Director", "name_ka": "დირექტორი/მფლობელი", "type": "text", "width": 180},
        {"id": "monthly_payment", "name": "Monthly Payment", "name_ka": "ყოველთვიური გადასახადი", "type": "number", "width": 150},
        {"id": "email", "name": "Email", "name_ka": "ელ.ფოსტა", "type": "text", "width": 200},
        {"id": "vat_status", "name": "VAT Status", "name_ka": "დღგ სტატუსი", "type": "status", "width": 160, "options": [
            {"label": "დღგ-ს გადამხდელი", "color": "blue"},
            {"label": "არ არის დღგ-ს გადამხდელი", "color": "gray"}
        ]},
        {"id": "service_description", "name": "Service Description", "name_ka": "მომსახურების აღწერა", "type": "long_text", "width": 300}
    ]'::jsonb,
    true
),

-- 5. პრემიუმ ქორფ (Premium Corp)
(
    'Premium Corp Contracts',
    'პრემიუმ ქორფ',
    'Premium Corp company contracts',
    'custom',
    'crown',
    'purple',
    'კომპანიის ხელშეკრულებები',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანიის სახელი", "type": "text", "width": 250, "pinned": true},
        {"id": "tax_id", "name": "Tax ID", "name_ka": "საიდენტიფიკაციო კოდი", "type": "text", "width": 150},
        {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 130, "options": [
            {"label": "აქტიური", "color": "green"},
            {"label": "შეჩერებული", "color": "yellow"},
            {"label": "შეწყვეტილი", "color": "red"}
        ]},
        {"id": "contract_start", "name": "Contract Start", "name_ka": "ხელშეკრულების დაწყება", "type": "date", "width": 140},
        {"id": "contract_end", "name": "Contract End", "name_ka": "ხელშეკრულების დასრულება", "type": "date", "width": 140},
        {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ტელეფონი", "type": "phone", "width": 150},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "long_text", "width": 250},
        {"id": "director", "name": "Director", "name_ka": "დირექტორი/მფლობელი", "type": "text", "width": 180},
        {"id": "monthly_payment", "name": "Monthly Payment", "name_ka": "ყოველთვიური გადასახადი", "type": "number", "width": 150},
        {"id": "email", "name": "Email", "name_ka": "ელ.ფოსტა", "type": "text", "width": 200},
        {"id": "payment_method", "name": "Payment Method", "name_ka": "გადახდის მეთოდი", "type": "status", "width": 140, "options": [
            {"label": "ნაღდი", "color": "green"},
            {"label": "უნაღდო", "color": "blue"},
            {"label": "ორივე", "color": "purple"}
        ]},
        {"id": "vat_status", "name": "VAT Status", "name_ka": "დღგ სტატუსი", "type": "status", "width": 160, "options": [
            {"label": "დღგ-ს გადამხდელი", "color": "blue"},
            {"label": "არ არის დღგ-ს გადამხდელი", "color": "gray"}
        ]},
        {"id": "service_description", "name": "Service Description", "name_ka": "მომსახურების აღწერა", "type": "long_text", "width": 300}
    ]'::jsonb,
    true
),

-- 6. დამატებითი მომსახურებები (Additional Services)
(
    'Additional Services Contracts',
    'დამატებითი მომსახურებები',
    'Additional services company contracts',
    'custom',
    'plus-circle',
    'teal',
    'კომპანიის ხელშეკრულებები',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანიის სახელი", "type": "text", "width": 250, "pinned": true},
        {"id": "tax_id", "name": "Tax ID", "name_ka": "საიდენტიფიკაციო კოდი", "type": "text", "width": 150},
        {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 130, "options": [
            {"label": "აქტიური", "color": "green"},
            {"label": "შეჩერებული", "color": "yellow"},
            {"label": "შეწყვეტილი", "color": "red"}
        ]},
        {"id": "contract_start", "name": "Contract Start", "name_ka": "ხელშეკრულების დაწყება", "type": "date", "width": 140},
        {"id": "contract_end", "name": "Contract End", "name_ka": "ხელშეკრულების დასრულება", "type": "date", "width": 140},
        {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ტელეფონი", "type": "phone", "width": 150},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "long_text", "width": 250},
        {"id": "director", "name": "Director", "name_ka": "დირექტორი/მფლობელი", "type": "text", "width": 180},
        {"id": "monthly_payment", "name": "Monthly Payment", "name_ka": "ყოველთვიური გადასახადი", "type": "number", "width": 150},
        {"id": "email", "name": "Email", "name_ka": "ელ.ფოსტა", "type": "text", "width": 200},
        {"id": "payment_method", "name": "Payment Method", "name_ka": "გადახდის მეთოდი", "type": "status", "width": 140, "options": [
            {"label": "ნაღდი", "color": "green"},
            {"label": "უნაღდო", "color": "blue"},
            {"label": "ორივე", "color": "purple"}
        ]},
        {"id": "vat_status", "name": "VAT Status", "name_ka": "დღგ სტატუსი", "type": "status", "width": 160, "options": [
            {"label": "დღგ-ს გადამხდელი", "color": "blue"},
            {"label": "არ არის დღგ-ს გადამხდელი", "color": "gray"}
        ]},
        {"id": "service_description", "name": "Service Description", "name_ka": "მომსახურების აღწერა", "type": "long_text", "width": 300}
    ]'::jsonb,
    true
),

-- 7. ერთჯერადი ხელშეკრულებები (One-time Contracts)
(
    'One-time Contracts',
    'ერთჯერადი ხელშეკრულებები',
    'One-time service contracts',
    'custom',
    'file-text',
    'amber',
    'კომპანიის ხელშეკრულებები',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანიის სახელი", "type": "text", "width": 250, "pinned": true},
        {"id": "tax_id", "name": "Tax ID", "name_ka": "საიდენტიფიკაციო კოდი", "type": "text", "width": 150},
        {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 130, "options": [
            {"label": "აქტიური", "color": "blue"},
            {"label": "შესრულებული", "color": "green"},
            {"label": "გაუქმებული", "color": "red"}
        ]},
        {"id": "contract_date", "name": "Contract Date", "name_ka": "ხელშეკრულების თარიღი", "type": "date", "width": 140},
        {"id": "completion_date", "name": "Completion Date", "name_ka": "შესრულების ვადა", "type": "date", "width": 140},
        {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ტელეფონი", "type": "phone", "width": 150},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "long_text", "width": 250},
        {"id": "contact_person", "name": "Contact Person", "name_ka": "საკონტაქტო პირი", "type": "text", "width": 180},
        {"id": "payment", "name": "Payment", "name_ka": "გადასახადი", "type": "number", "width": 130},
        {"id": "email", "name": "Email", "name_ka": "ელ.ფოსტა", "type": "text", "width": 200}
    ]'::jsonb,
    true
),

-- 8. შეჩერებული (Suspended)
(
    'Suspended Contracts',
    'შეჩერებული',
    'Suspended company contracts',
    'custom',
    'pause-circle',
    'yellow',
    'კომპანიის ხელშეკრულებები',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანიის სახელი", "type": "text", "width": 250, "pinned": true},
        {"id": "tax_id", "name": "Tax ID", "name_ka": "საიდენტიფიკაციო კოდი", "type": "text", "width": 150},
        {"id": "suspension_reason", "name": "Suspension Reason", "name_ka": "შეჩერების მიზეზი", "type": "status", "width": 160, "options": [
            {"label": "გადაუხდელობა", "color": "red"},
            {"label": "დროებითი", "color": "yellow"},
            {"label": "სხვა", "color": "gray"}
        ]},
        {"id": "contract_start", "name": "Contract Start", "name_ka": "ხელშეკრულების დაწყება", "type": "date", "width": 140},
        {"id": "contract_end", "name": "Contract End", "name_ka": "ხელშეკრულების დასრულება", "type": "date", "width": 140},
        {"id": "suspended_date", "name": "Suspended Date", "name_ka": "შეჩერების თარიღი", "type": "date", "width": 140},
        {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ტელეფონი", "type": "phone", "width": 150},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "long_text", "width": 250},
        {"id": "director", "name": "Director", "name_ka": "დირექტორი/მფლობელი", "type": "text", "width": 180},
        {"id": "monthly_payment", "name": "Monthly Payment", "name_ka": "ყოველთვიური გადასახადი", "type": "number", "width": 150},
        {"id": "email", "name": "Email", "name_ka": "ელ.ფოსტა", "type": "text", "width": 200},
        {"id": "payment_method", "name": "Payment Method", "name_ka": "გადახდის მეთოდი", "type": "status", "width": 140, "options": [
            {"label": "ნაღდი", "color": "green"},
            {"label": "უნაღდო", "color": "blue"},
            {"label": "ორივე", "color": "purple"}
        ]},
        {"id": "vat_status", "name": "VAT Status", "name_ka": "დღგ სტატუსი", "type": "status", "width": 160, "options": [
            {"label": "დღგ-ს გადამხდელი", "color": "blue"},
            {"label": "არ არის დღგ-ს გადამხდელი", "color": "gray"}
        ]},
        {"id": "notes", "name": "Notes", "name_ka": "შენიშვნა", "type": "long_text", "width": 300}
    ]'::jsonb,
    true
),

-- 9. შეწყვეტილი/დასრულებული (Terminated/Completed)
(
    'Terminated Contracts',
    'შეწყვეტილი/დასრულებული',
    'Terminated or completed company contracts',
    'custom',
    'x-circle',
    'red',
    'კომპანიის ხელშეკრულებები',
    '[
        {"id": "name", "name": "Company Name", "name_ka": "კომპანიის სახელი", "type": "text", "width": 250, "pinned": true},
        {"id": "tax_id", "name": "Tax ID", "name_ka": "საიდენტიფიკაციო კოდი", "type": "text", "width": 150},
        {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 140, "options": [
            {"label": "შეწყვეტილი", "color": "red"},
            {"label": "დასრულებული", "color": "green"},
            {"label": "გაუქმებული", "color": "gray"}
        ]},
        {"id": "contract_start", "name": "Contract Start", "name_ka": "ხელშეკრულების დაწყება", "type": "date", "width": 140},
        {"id": "contract_end", "name": "Contract End", "name_ka": "ხელშეკრულების დასრულება", "type": "date", "width": 140},
        {"id": "termination_date", "name": "Termination Date", "name_ka": "შეწყვეტის თარიღი", "type": "date", "width": 140},
        {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ტელეფონი", "type": "phone", "width": 150},
        {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "long_text", "width": 250},
        {"id": "director", "name": "Director", "name_ka": "დირექტორი/მფლობელი", "type": "text", "width": 180},
        {"id": "initial_payment", "name": "Initial Payment", "name_ka": "საწყისი გადასახადი", "type": "number", "width": 130},
        {"id": "monthly_payment", "name": "Monthly Payment", "name_ka": "ყოველთვიური გადასახადი", "type": "number", "width": 150},
        {"id": "email", "name": "Email", "name_ka": "ელ.ფოსტა", "type": "text", "width": 200},
        {"id": "payment_method", "name": "Payment Method", "name_ka": "გადახდის მეთოდი", "type": "status", "width": 140, "options": [
            {"label": "ნაღდი", "color": "green"},
            {"label": "უნაღდო", "color": "blue"},
            {"label": "ორივე", "color": "purple"}
        ]},
        {"id": "vat_status", "name": "VAT Status", "name_ka": "დღგ სტატუსი", "type": "status", "width": 160, "options": [
            {"label": "დღგ-ს გადამხდელი", "color": "blue"},
            {"label": "არ არის დღგ-ს გადამხდელი", "color": "gray"}
        ]},
        {"id": "termination_reason", "name": "Termination Reason", "name_ka": "შეწყვეტის მიზეზი", "type": "long_text", "width": 300}
    ]'::jsonb,
    true
)

ON CONFLICT DO NOTHING;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
