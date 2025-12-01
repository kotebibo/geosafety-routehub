-- Seed service types for Georgian safety inspection services
-- These are the standard inspection service types used in Georgia

INSERT INTO service_types (name, name_ka, description, required_inspector_type, default_frequency_days, is_active)
VALUES
  ('Labor Safety', 'შრომის უსაფრთხოება', 'შრომის უსაფრთხოების ინსპექტირება', 'labor_safety', 90, true),
  ('Fire Safety', 'სახანძრო უსაფრთხოება', 'სახანძრო უსაფრთხოების ინსპექტირება', 'fire_safety', 180, true),
  ('Environmental', 'გარემოსდაცვითი', 'გარემოსდაცვითი ინსპექტირება', 'environmental', 365, true),
  ('Food Safety', 'სურსათის უვნებლობა', 'სურსათის უვნებლობის ინსპექტირება', 'food_safety', 90, true),
  ('Construction Safety', 'სამშენებლო უსაფრთხოება', 'სამშენებლო უსაფრთხოების ინსპექტირება', 'construction', 60, true),
  ('Electrical Safety', 'ელექტრო უსაფრთხოება', 'ელექტრო უსაფრთხოების ინსპექტირება', 'electrical', 180, true),
  ('Gas Safety', 'გაზის უსაფრთხოება', 'გაზის მოწყობილობების ინსპექტირება', 'gas_safety', 365, true),
  ('Elevator Inspection', 'ლიფტის ინსპექტირება', 'ლიფტების ტექნიკური ინსპექტირება', 'elevator', 365, true),
  ('Pressure Vessels', 'წნევის ჭურჭელი', 'წნევის ქვეშ მომუშავე მოწყობილობების ინსპექტირება', 'pressure_vessels', 365, true),
  ('Radiation Safety', 'რადიაციული უსაფრთხოება', 'რადიაციული უსაფრთხოების ინსპექტირება', 'radiation', 365, true)
ON CONFLICT (name) DO NOTHING;

-- Verify the insert
SELECT id, name, name_ka, is_active FROM service_types ORDER BY name;
