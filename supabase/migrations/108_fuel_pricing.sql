-- Fuel pricing: a single global price per liter that every officer inherits,
-- with an optional per-officer override. The global value lives in a tiny
-- key-value settings table; the override is a column on officer_transport.
--
-- Apply staging-first:
--   node scripts/run-migration.mjs 108_fuel_pricing.sql --stage
--   (then --prod on prod day)
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.app_settings;
--   ALTER TABLE public.officer_transport DROP COLUMN IF EXISTS fuel_price_per_liter;

-- Global key-value settings (currently: fuel_price_per_liter).
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read settings; only admin/dispatcher may change them.
DROP POLICY IF EXISTS app_settings_read ON public.app_settings;
CREATE POLICY app_settings_read ON public.app_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS app_settings_write ON public.app_settings;
CREATE POLICY app_settings_write ON public.app_settings
  FOR ALL USING (is_admin_or_dispatcher()) WITH CHECK (is_admin_or_dispatcher());

COMMENT ON TABLE public.app_settings IS 'Global app settings (key-value). e.g. fuel_price_per_liter.';

-- Optional per-officer fuel price override (falls back to the global price).
ALTER TABLE public.officer_transport
  ADD COLUMN IF NOT EXISTS fuel_price_per_liter NUMERIC;

COMMENT ON COLUMN public.officer_transport.fuel_price_per_liter IS
  'Per-officer fuel price override (₾/L). NULL → use the global app_settings price.';
