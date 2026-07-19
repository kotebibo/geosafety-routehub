-- Officer vehicle / fuel data for route planning.
-- Admin sets it when registering an officer; the weekly plan's total distance
-- is multiplied by consumption to budget fuel. One row per officer (user).
--
-- QUEUED for the routing "weekly plan / fuel" work. Apply staging-first:
--   node scripts/run-migration.mjs 106_officer_transport.sql --stage
--   (then --prod after verification)
--
-- ROLLBACK:
--   DROP TABLE IF EXISTS public.officer_transport;

CREATE TABLE IF NOT EXISTS public.officer_transport (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  car_model TEXT,
  engine TEXT,
  consumption_l_per_100km NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.officer_transport ENABLE ROW LEVEL SECURITY;

-- Admin manages all rows; officers/dispatchers can read (officer sees own,
-- dispatcher/admin see any) for the fuel calculation.
DROP POLICY IF EXISTS officer_transport_admin_all ON public.officer_transport;
CREATE POLICY officer_transport_admin_all ON public.officer_transport
  FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS officer_transport_select ON public.officer_transport;
CREATE POLICY officer_transport_select ON public.officer_transport
  FOR SELECT USING (user_id = auth.uid() OR is_admin_or_dispatcher());

COMMENT ON TABLE public.officer_transport IS
  'Per-officer vehicle + fuel consumption (L/100km) for weekly route fuel budgeting.';
