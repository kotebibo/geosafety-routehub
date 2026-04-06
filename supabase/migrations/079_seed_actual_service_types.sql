-- Migration 079: Seed actual service types used by GeoSafety
-- Replaces the old generic seed (017) with the 5 real services

-- Clear old generic service types that don't match actual services
DELETE FROM service_types WHERE required_inspector_type IN (
  'fire_safety', 'environmental', 'construction', 'electrical',
  'gas_safety', 'elevator', 'pressure_vessels', 'radiation'
);

-- Upsert the 5 actual services
INSERT INTO service_types (name, name_ka, description, required_inspector_type, default_frequency_days, is_active)
VALUES
  ('Labor Safety', 'შრომის უსაფრთხოება', 'შრომის უსაფრთხოების მომსახურება', 'labor_safety', 30, true),
  ('Labor Rights', 'შრომითი უფლებები', 'შრომითი უფლებების მომსახურება', 'labor_rights', 30, true),
  ('Food Safety', 'სურსათის უვნებლობა', 'სურსათის უვნებლობის მომსახურება', 'food_safety', 30, true),
  ('Personal Data Protection', 'პერსონალური მონაცემების დაცვა', 'პერსონალური მონაცემების დაცვის მომსახურება', 'personal_data', 30, true),
  ('Legal Outsourcing', 'იურიდიული აუთსორსი', 'იურიდიული აუთსორსის მომსახურება', 'legal_outsource', 30, true)
ON CONFLICT (name) DO UPDATE SET
  name_ka = EXCLUDED.name_ka,
  description = EXCLUDED.description,
  required_inspector_type = EXCLUDED.required_inspector_type,
  is_active = true;
