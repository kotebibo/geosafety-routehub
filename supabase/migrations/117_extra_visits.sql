-- Unplanned / extra visits: an object the officer (or admin) adds mid-week off
-- the original plan. Each is its own home→object trip and is a REQUEST the admin
-- approves (for fuel). Any object may become an extra visit — even one already
-- planned/visited this week.
--
-- Apply staging-first:
--   node scripts/run-migration.mjs 117_extra_visits.sql --stage
--
-- ROLLBACK: DROP TABLE IF EXISTS public.extra_visits;

CREATE TABLE IF NOT EXISTS public.extra_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  board_id uuid REFERENCES public.boards(id) ON DELETE SET NULL,
  -- board_items.id — no FK embed (item-centric; matches routing conventions).
  board_item_id uuid,
  visit_date date NOT NULL,
  distance_km numeric,
  reason text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extra_visits_inspector_date
  ON public.extra_visits (inspector_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_extra_visits_status ON public.extra_visits (status);

ALTER TABLE public.extra_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS extra_visits_select ON public.extra_visits;
CREATE POLICY extra_visits_select ON public.extra_visits
  FOR SELECT USING (inspector_id = auth.uid() OR is_admin_or_dispatcher());

-- Officer adds own; admin may add on the officer's behalf and approve/reject.
DROP POLICY IF EXISTS extra_visits_write ON public.extra_visits;
CREATE POLICY extra_visits_write ON public.extra_visits
  FOR ALL USING (inspector_id = auth.uid() OR is_admin_user())
  WITH CHECK (inspector_id = auth.uid() OR is_admin_user());

COMMENT ON TABLE public.extra_visits IS
  'Unplanned/extra visits (own home→object trip). Request → admin approves for fuel.';
