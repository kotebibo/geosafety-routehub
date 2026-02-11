-- Migration: Clear existing company data before Monday.com import
-- WARNING: This will delete ALL company-related data!
-- Run this ONLY if you want to replace all existing companies with Monday.com data

-- First, delete from tables that reference companies (child tables)

-- Delete PDP compliance phases (if exists)
DELETE FROM pdp_compliance_phases WHERE TRUE;

-- Delete company PDP phases (if exists)
DELETE FROM company_pdp_phases WHERE TRUE;

-- Delete reassignment history
DELETE FROM reassignment_history WHERE TRUE;

-- Delete inspection history
DELETE FROM inspection_history WHERE TRUE;

-- Delete company services
DELETE FROM company_services WHERE TRUE;

-- Delete route stops (they reference companies)
DELETE FROM route_stops WHERE TRUE;

-- Delete company locations
DELETE FROM company_locations WHERE TRUE;

-- Finally, delete all companies
DELETE FROM companies WHERE TRUE;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'All company data has been cleared. Ready for Monday.com import.';
END $$;
