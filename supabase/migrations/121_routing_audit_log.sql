-- Routing change history: who did what, when. Append-only audit of the routing
-- flow (plan lifecycle, stop check-in/defer, extra visits, fuel prices) so a
-- manager can see the full trail. Idempotent.

CREATE TABLE IF NOT EXISTS public.routing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  -- The officer the action concerns (for per-officer filtering). Null for
  -- global events (e.g. a global fuel-price change).
  inspector_id uuid,
  action text NOT NULL,
  entity text,
  week_start date,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routing_audit_inspector
  ON public.routing_audit_log (inspector_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routing_audit_created
  ON public.routing_audit_log (created_at DESC);

ALTER TABLE public.routing_audit_log ENABLE ROW LEVEL SECURITY;

-- Managers see everything; an officer sees entries about themselves. Writes go
-- through the service client (server-side helper), so no INSERT policy needed.
DROP POLICY IF EXISTS routing_audit_select ON public.routing_audit_log;
CREATE POLICY routing_audit_select ON public.routing_audit_log
  FOR SELECT USING (inspector_id = auth.uid() OR is_admin_or_dispatcher());

COMMENT ON TABLE public.routing_audit_log IS
  'Append-only routing change history (who/when/what) for the manager audit view.';
