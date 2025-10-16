-- Personal Data Protection Compliance Phases
-- This migration adds support for tracking the 5-phase onboarding process
-- for new companies in the personal data protection service

-- Create enum for company compliance status
CREATE TYPE compliance_status AS ENUM (
  'new',           -- Newly signed, needs to complete 5 phases
  'in_progress',   -- Currently going through phases
  'certified',     -- Completed all phases
  'active'        -- Regular checkups only
);

-- Create table for tracking phase completions
CREATE TABLE IF NOT EXISTS pdp_compliance_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Compliance tracking
  compliance_status compliance_status NOT NULL DEFAULT 'new',
  
  -- Phase 1: Initial Assessment / პირველადი შეფასება
  phase_1_date DATE,
  phase_1_completed BOOLEAN DEFAULT FALSE,
  phase_1_notes TEXT,
  
  -- Phase 2: Documentation / დოკუმენტაციის მომზადება
  phase_2_date DATE,
  phase_2_completed BOOLEAN DEFAULT FALSE,
  phase_2_notes TEXT,
  
  -- Phase 3: Implementation / დანერგვა
  phase_3_date DATE,
  phase_3_completed BOOLEAN DEFAULT FALSE,
  phase_3_notes TEXT,
  
  -- Phase 4: Training / ტრენინგი
  phase_4_date DATE,
  phase_4_completed BOOLEAN DEFAULT FALSE,
  phase_4_notes TEXT,
  
  -- Phase 5: Certification / სერტიფიცირება
  phase_5_date DATE,
  phase_5_completed BOOLEAN DEFAULT FALSE,
  phase_5_notes TEXT,
  
  -- Certification info
  certification_date DATE,
  certificate_number TEXT,
  
  -- Next regular checkup (after certification)
  next_checkup_date DATE,
  checkup_interval_days INTEGER DEFAULT 90, -- Default 3 months
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure one record per company
  CONSTRAINT unique_company_compliance UNIQUE(company_id)
);

-- Create indexes
CREATE INDEX idx_pdp_compliance_status ON pdp_compliance_phases(compliance_status);
CREATE INDEX idx_pdp_next_checkup ON pdp_compliance_phases(next_checkup_date);
CREATE INDEX idx_pdp_company ON pdp_compliance_phases(company_id);

-- Create RLS policies
ALTER TABLE pdp_compliance_phases ENABLE ROW LEVEL SECURITY;

-- View policy: All authenticated users can view
CREATE POLICY "View compliance phases" ON pdp_compliance_phases
  FOR SELECT
  USING (auth.role() IN ('authenticated'));

-- Insert policy: Admin and Dispatcher only
CREATE POLICY "Insert compliance phases" ON pdp_compliance_phases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

-- Update policy: Admin and Dispatcher only
CREATE POLICY "Update compliance phases" ON pdp_compliance_phases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'dispatcher')
    )
  );

-- Delete policy: Admin only
CREATE POLICY "Delete compliance phases" ON pdp_compliance_phases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Add trigger to update updated_at
CREATE TRIGGER update_pdp_compliance_phases_updated_at
  BEFORE UPDATE ON pdp_compliance_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create a view for easier querying
CREATE OR REPLACE VIEW pdp_compliance_overview AS
SELECT 
  p.*,
  c.name as company_name,
  c.address as company_address,
  c.contact_name as contact_person,
  c.contact_phone,
  c.contact_email,
  CASE 
    WHEN p.phase_5_completed THEN 'სერტიფიცირებული'
    WHEN p.phase_4_completed THEN 'ფაზა 5 - სერტიფიცირება'
    WHEN p.phase_3_completed THEN 'ფაზა 4 - ტრენინგი'
    WHEN p.phase_2_completed THEN 'ფაზა 3 - დანერგვა'
    WHEN p.phase_1_completed THEN 'ფაზა 2 - დოკუმენტაცია'
    ELSE 'ფაზა 1 - პირველადი შეფასება'
  END as current_phase_status,
  CASE
    WHEN p.phase_1_completed 
     AND p.phase_2_completed 
     AND p.phase_3_completed 
     AND p.phase_4_completed 
     AND p.phase_5_completed
    THEN 5
    WHEN p.phase_1_completed 
     AND p.phase_2_completed 
     AND p.phase_3_completed 
     AND p.phase_4_completed
    THEN 4
    WHEN p.phase_1_completed 
     AND p.phase_2_completed 
     AND p.phase_3_completed
    THEN 3
    WHEN p.phase_1_completed 
     AND p.phase_2_completed
    THEN 2
    WHEN p.phase_1_completed
    THEN 1
    ELSE 0
  END as phases_completed,
  (p.phase_1_completed::int + p.phase_2_completed::int + p.phase_3_completed::int + 
   p.phase_4_completed::int + p.phase_5_completed::int) * 20 as progress_percentage
FROM pdp_compliance_phases p
JOIN companies c ON p.company_id = c.id;

-- Grant permissions
GRANT SELECT ON pdp_compliance_overview TO authenticated;
