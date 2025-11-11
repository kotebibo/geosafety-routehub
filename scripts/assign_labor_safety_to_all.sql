-- Assign "შრომის უსაფრთხოება" (Labor Safety) service to all companies without services

-- First, get the service_type_id for "შრომის უსაფრთხოება"
DO $$
DECLARE
  labor_safety_id UUID;
  company_record RECORD;
  companies_updated INTEGER := 0;
BEGIN
  -- Get the ID for შრომის უსაფრთხოება service type
  SELECT id INTO labor_safety_id
  FROM service_types
  WHERE name_ka = 'შრომის უსაფრთხოება'
  LIMIT 1;

  IF labor_safety_id IS NULL THEN
    RAISE EXCEPTION 'Service type "შრომის უსაფრთხოება" not found!';
  END IF;

  RAISE NOTICE 'Found Labor Safety service type: %', labor_safety_id;

  -- Loop through all companies that don't have any services
  FOR company_record IN
    SELECT c.id, c.name
    FROM companies c
    WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 
        FROM company_services cs 
        WHERE cs.company_id = c.id 
          AND cs.status = 'active'
      )
  LOOP
    -- Insert the labor safety service for this company
    INSERT INTO company_services (
      company_id,
      service_type_id,
      priority,
      status,
      created_at,
      updated_at
    ) VALUES (
      company_record.id,
      labor_safety_id,
      'medium',
      'active',
      NOW(),
      NOW()
    );

    companies_updated := companies_updated + 1;

    IF companies_updated % 50 = 0 THEN
      RAISE NOTICE 'Assigned services to % companies...', companies_updated;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Successfully assigned "შრომის უსაფრთხოება" to % companies!', companies_updated;
END $$;

-- Verify the results
SELECT 
  COUNT(*) as total_companies,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM company_services cs 
    WHERE cs.company_id = companies.id 
      AND cs.status = 'active'
  )) as companies_with_services,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM company_services cs 
    WHERE cs.company_id = companies.id 
      AND cs.status = 'active'
  )) as companies_without_services
FROM companies
WHERE status = 'active';
