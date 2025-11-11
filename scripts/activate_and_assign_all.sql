-- Activate all companies and assign Labor Safety service to those without services

DO $$
DECLARE
  labor_safety_id UUID;
  company_record RECORD;
  companies_activated INTEGER := 0;
  services_assigned INTEGER := 0;
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

  -- First, activate all companies
  UPDATE companies
  SET status = 'active',
      updated_at = NOW()
  WHERE status != 'active' OR status IS NULL;

  GET DIAGNOSTICS companies_activated = ROW_COUNT;
  RAISE NOTICE '✅ Activated % companies', companies_activated;

  -- Now assign labor safety service to all companies without services
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

    services_assigned := services_assigned + 1;

    IF services_assigned % 100 = 0 THEN
      RAISE NOTICE 'Assigned services to % companies...', services_assigned;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Successfully assigned "შრომის უსაფრთხოება" to % companies!', services_assigned;
  RAISE NOTICE '📊 Total: Activated % companies, Assigned % services', companies_activated, services_assigned;
END $$;

-- Verify the results
SELECT 
  COUNT(*) as total_companies,
  COUNT(*) FILTER (WHERE status = 'active') as active_companies,
  COUNT(*) FILTER (WHERE status != 'active' OR status IS NULL) as inactive_companies,
  COUNT(*) FILTER (WHERE status = 'active' AND EXISTS (
    SELECT 1 FROM company_services cs 
    WHERE cs.company_id = companies.id 
      AND cs.status = 'active'
  )) as active_with_services,
  COUNT(*) FILTER (WHERE status = 'active' AND NOT EXISTS (
    SELECT 1 FROM company_services cs 
    WHERE cs.company_id = companies.id 
      AND cs.status = 'active'
  )) as active_without_services
FROM companies;
