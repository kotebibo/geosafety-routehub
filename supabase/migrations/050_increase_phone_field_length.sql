-- Migration: Increase contact_phone field length
-- Some Monday.com entries have multiple phone numbers in the contact_phone field

ALTER TABLE companies
ALTER COLUMN contact_phone TYPE VARCHAR(255);

-- Add a comment for documentation
COMMENT ON COLUMN companies.contact_phone IS 'Contact phone number(s) - can contain multiple numbers separated by semicolons';
