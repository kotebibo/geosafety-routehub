-- Migration: Increase contact_phone field length
-- Some Monday.com entries have multiple phone numbers in the contact_phone field

-- Must drop dependent views before altering column type
DROP VIEW IF EXISTS public.companies_with_location_count;
DROP VIEW IF EXISTS public.pdp_compliance_overview;

ALTER TABLE companies
ALTER COLUMN contact_phone TYPE VARCHAR(255);

-- Recreate the view
CREATE VIEW public.companies_with_location_count
WITH (security_invoker = true)
AS
SELECT
  c.*,
  COALESCE(loc_count.count, 0) as location_count,
  pl.id as primary_location_id,
  pl.name as primary_location_name,
  pl.address as primary_location_address
FROM public.companies c
LEFT JOIN (
  SELECT company_id, COUNT(*) as count
  FROM public.company_locations
  GROUP BY company_id
) loc_count ON loc_count.company_id = c.id
LEFT JOIN public.company_locations pl ON pl.company_id = c.id AND pl.is_primary = true;

GRANT SELECT ON public.companies_with_location_count TO authenticated;
GRANT SELECT ON public.companies_with_location_count TO anon;

-- Recreate pdp_compliance_overview view
CREATE VIEW public.pdp_compliance_overview
WITH (security_invoker = true)
AS
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
FROM public.pdp_compliance_phases p
JOIN public.companies c ON p.company_id = c.id;

GRANT SELECT ON public.pdp_compliance_overview TO authenticated;

-- Add a comment for documentation
COMMENT ON COLUMN companies.contact_phone IS 'Contact phone number(s) - can contain multiple numbers separated by semicolons';
