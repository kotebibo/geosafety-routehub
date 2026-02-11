-- Migration: Add contract-related fields to companies table
-- These fields capture additional data from Monday.com contract boards

-- Add new columns to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS initial_payment NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS monthly_payment NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS invoice_frequency TEXT,
ADD COLUMN IF NOT EXISTS vat_status TEXT,
ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS receiving_bank TEXT,
ADD COLUMN IF NOT EXISTS sales_manager TEXT,
ADD COLUMN IF NOT EXISTS monday_board_id TEXT,
ADD COLUMN IF NOT EXISTS monday_item_id TEXT;

-- Create index on tax_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_tax_id ON companies(tax_id);

-- Create index on monday_item_id for migration tracking
CREATE INDEX IF NOT EXISTS idx_companies_monday_item_id ON companies(monday_item_id);

-- Add comments for documentation
COMMENT ON COLUMN companies.tax_id IS 'Georgian tax identification code (საიდენტიფიკაციო კოდი / ს/კ)';
COMMENT ON COLUMN companies.contract_start_date IS 'Contract start date (გაფორმების თარიღი)';
COMMENT ON COLUMN companies.contract_end_date IS 'Contract end date (დასრულების თარიღი)';
COMMENT ON COLUMN companies.initial_payment IS 'Initial payment amount (პირველადი გადასახადი)';
COMMENT ON COLUMN companies.monthly_payment IS 'Monthly payment amount (ყოველთვიური გადასახადი)';
COMMENT ON COLUMN companies.payment_method IS 'Payment method: prepaid, monthly, etc. (გადახდის წესი)';
COMMENT ON COLUMN companies.invoice_frequency IS 'Invoice frequency: monthly, quarterly, yearly (ინვოისის სიხშირე)';
COMMENT ON COLUMN companies.vat_status IS 'VAT payer status (დღგ სტატუსი)';
COMMENT ON COLUMN companies.invoice_amount IS 'Standard invoice amount (ინვოისის თანხა)';
COMMENT ON COLUMN companies.receiving_bank IS 'Receiving bank for payments (მიმღები ბანკი)';
COMMENT ON COLUMN companies.sales_manager IS 'Assigned sales manager (გაყიდვების მენეჯერი)';
COMMENT ON COLUMN companies.monday_board_id IS 'Original Monday.com board ID for migration tracking';
COMMENT ON COLUMN companies.monday_item_id IS 'Original Monday.com item ID for migration tracking';

-- Create a contracts board template
INSERT INTO board_templates (
  id,
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
  gen_random_uuid(),
  'Contracts Board',
  'ხელშეკრულებების დაფა',
  'Track client contracts with all payment and service details',
  'custom',
  '📋',
  '#6366f1',
  'contracts',
  '[
    {"id": "name", "name": "Company Name", "name_ka": "კომპანიის სახელი", "type": "text", "width": 200, "config": {}},
    {"id": "tax_id", "name": "Tax ID", "name_ka": "ს/კ", "type": "text", "width": 120, "config": {}},
    {"id": "status", "name": "Status", "name_ka": "სტატუსი", "type": "status", "width": 150, "config": {"options": [
      {"id": "labor_safety", "label": "შრომის უსაფრთხოება", "color": "#fdab3d"},
      {"id": "haccp", "label": "სურსათის უვნებლობა (HACCP)", "color": "#faa1f1"},
      {"id": "pdp", "label": "პერსონალური მონაცემების დაცვა", "color": "#e484bd"},
      {"id": "labor_haccp", "label": "შრომის უსაფრთხოება და HACCP", "color": "#ff6d3b"},
      {"id": "labor_pdp", "label": "შრომის უსაფრთხოება და პერსონალური", "color": "#ff7575"},
      {"id": "all_three", "label": "შრომა, HACCP, პერსონალური", "color": "#cab641"},
      {"id": "suspended", "label": "შეჩერებული", "color": "#c4c4c4"},
      {"id": "terminated", "label": "შეწყდა", "color": "#df2f4a"},
      {"id": "pending", "label": "ამოქმედდება", "color": "#74afcc"}
    ]}},
    {"id": "contract_start", "name": "Contract Start", "name_ka": "გაფორმების თარიღი", "type": "date", "width": 120, "config": {}},
    {"id": "contract_end", "name": "Contract End", "name_ka": "დასრულების თარიღი", "type": "date", "width": 120, "config": {}},
    {"id": "contact_phone", "name": "Contact Phone", "name_ka": "საკონტაქტო ნომერი", "type": "phone", "width": 150, "config": {}},
    {"id": "address", "name": "Address", "name_ka": "მისამართი", "type": "text", "width": 250, "config": {}},
    {"id": "director", "name": "Director", "name_ka": "დირექტორი", "type": "text", "width": 150, "config": {}},
    {"id": "monthly_payment", "name": "Monthly Payment", "name_ka": "ყოველთვიური გადასახადი", "type": "number", "width": 120, "config": {"unit": "₾", "unitPosition": "suffix"}},
    {"id": "email", "name": "Email", "name_ka": "მეილი", "type": "text", "width": 180, "config": {}},
    {"id": "payment_method", "name": "Payment Method", "name_ka": "გადახდის წესი", "type": "status", "width": 130, "config": {"options": [
      {"id": "prepaid", "label": "წინასწარი", "color": "#00c875"},
      {"id": "monthly", "label": "მომდევნო თვე", "color": "#fdab3d"},
      {"id": "lump_sum", "label": "ერთიანი გადახდით", "color": "#df2f4a"},
      {"id": "installments", "label": "ნაწილ-ნაწილ", "color": "#037f4c"},
      {"id": "consignment", "label": "კონსიგნაცია", "color": "#9d50dd"},
      {"id": "free", "label": "უსასყიდლო", "color": "#66ccff"}
    ]}},
    {"id": "invoice_frequency", "name": "Invoice Frequency", "name_ka": "ინვოისის სიხშირე", "type": "status", "width": 130, "config": {"options": [
      {"id": "monthly", "label": "ყოველთვე", "color": "#00c875"},
      {"id": "quarterly", "label": "წელიწადში 4", "color": "#fdab3d"},
      {"id": "tri_annual", "label": "წელიწადში 3", "color": "#579bfc"},
      {"id": "semi_annual", "label": "წელიწადში 2", "color": "#9d50dd"},
      {"id": "annual", "label": "წელიწადში 1", "color": "#037f4c"}
    ]}},
    {"id": "vat_status", "name": "VAT Status", "name_ka": "დღგ სტატუსი", "type": "status", "width": 120, "config": {"options": [
      {"id": "vat_payer", "label": "დღგ_ს იხდის", "color": "#00c875"},
      {"id": "non_vat", "label": "დღგ_ს არ იხდის", "color": "#fdab3d"}
    ]}},
    {"id": "files", "name": "Files", "name_ka": "ფაილები", "type": "files", "width": 100, "config": {}},
    {"id": "notes", "name": "Notes", "name_ka": "შენიშვნები", "type": "text", "width": 200, "config": {}}
  ]'::jsonb,
  true
) ON CONFLICT DO NOTHING;
