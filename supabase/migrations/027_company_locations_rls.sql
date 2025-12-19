-- Enable RLS on company_locations table
ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all company locations
CREATE POLICY "Allow authenticated users to read company_locations"
ON company_locations
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert company locations
CREATE POLICY "Allow authenticated users to insert company_locations"
ON company_locations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update company locations
CREATE POLICY "Allow authenticated users to update company_locations"
ON company_locations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete company locations
CREATE POLICY "Allow authenticated users to delete company_locations"
ON company_locations
FOR DELETE
TO authenticated
USING (true);

-- Also allow anon access for development (since auth is disabled)
CREATE POLICY "Allow anon to read company_locations"
ON company_locations
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow anon to insert company_locations"
ON company_locations
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anon to update company_locations"
ON company_locations
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon to delete company_locations"
ON company_locations
FOR DELETE
TO anon
USING (true);
