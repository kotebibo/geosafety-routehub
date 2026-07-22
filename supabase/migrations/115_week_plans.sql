-- Week-level plan lifecycle: an officer plans NEXT week, submits it as a request,
-- and an admin approves (which is when that week's fuel is "purchased"). The
-- km/fuel figures are snapshotted at approval so later edits don't silently move
-- the purchased amount unless re-approved.
--
-- Apply staging-first:
--   node scripts/run-migration.mjs 115_week_plans.sql --stage
--
-- ROLLBACK: DROP TABLE IF EXISTS public.week_plans;

CREATE TABLE IF NOT EXISTS public.week_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  board_id uuid REFERENCES public.boards(id) ON DELETE SET NULL,
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  -- Snapshot at approval (the "purchased" amounts).
  total_km numeric,
  fuel_liters numeric,
  fuel_cost numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inspector_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_week_plans_inspector_week
  ON public.week_plans (inspector_id, week_start);
CREATE INDEX IF NOT EXISTS idx_week_plans_status ON public.week_plans (status);

ALTER TABLE public.week_plans ENABLE ROW LEVEL SECURITY;

-- Officer reads own; admin/dispatcher read all.
DROP POLICY IF EXISTS week_plans_select ON public.week_plans;
CREATE POLICY week_plans_select ON public.week_plans
  FOR SELECT USING (inspector_id = auth.uid() OR is_admin_or_dispatcher());

-- Officer manages own draft; admin manages any (approve / edit on the officer's behalf).
DROP POLICY IF EXISTS week_plans_write ON public.week_plans;
CREATE POLICY week_plans_write ON public.week_plans
  FOR ALL USING (inspector_id = auth.uid() OR is_admin_user())
  WITH CHECK (inspector_id = auth.uid() OR is_admin_user());

COMMENT ON TABLE public.week_plans IS
  'Officer weekly plan request/approval lifecycle (draft → submitted → approved). Fuel snapshot at approval.';
