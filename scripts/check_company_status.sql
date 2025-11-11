-- Check company status distribution
SELECT 
  status,
  COUNT(*) as count
FROM companies
GROUP BY status
ORDER BY count DESC;

-- Check which companies don't have 'active' status
SELECT 
  COUNT(*) as total_companies,
  COUNT(*) FILTER (WHERE status = 'active') as active_companies,
  COUNT(*) FILTER (WHERE status != 'active' OR status IS NULL) as inactive_companies
FROM companies;

-- Show sample of inactive companies
SELECT id, name, status
FROM companies
WHERE status != 'active' OR status IS NULL
LIMIT 10;
