-- Create table for tracking PDP onboarding phases
CREATE TABLE IF NOT EXISTS company_pdp_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  phase INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 5),
  scheduled_date DATE,
  completed_date DATE,
  inspector_id UUID REFERENCES inspectors(id) ON DELETE SET NULL,
  notes TEXT,
  current_phase INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, phase)
);

-- Create index for faster lookups
CREATE INDEX idx_company_pdp_phases_company_id ON company_pdp_phases(company_id);
CREATE INDEX idx_company_pdp_phases_inspector_id ON company_pdp_phases(inspector_id);

-- Add RLS policies
ALTER TABLE company_pdp_phases ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read company_pdp_phases" ON company_pdp_phases
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated write company_pdp_phases" ON company_pdp_phases
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_company_pdp_phases_updated_at 
  BEFORE UPDATE ON company_pdp_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();