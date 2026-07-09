-- Health check logs for tracking performance over time
CREATE TABLE IF NOT EXISTS public.health_check_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL, -- healthy, degraded, unhealthy
  avg_ms integer NOT NULL,
  max_ms integer NOT NULL,
  checks jsonb NOT NULL, -- array of {name, status, time_ms}
  region text, -- vercel region serving the request
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for time-range queries
CREATE INDEX idx_health_check_logs_created_at ON public.health_check_logs (created_at DESC);

-- Auto-cleanup: keep only last 30 days
CREATE OR REPLACE FUNCTION cleanup_old_health_logs() RETURNS trigger AS $$
BEGIN
  DELETE FROM public.health_check_logs WHERE created_at < now() - interval '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_health_logs_trigger
  AFTER INSERT ON public.health_check_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_old_health_logs();

-- RLS: only admins can read, service role inserts
ALTER TABLE public.health_check_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY health_logs_select ON public.health_check_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY health_logs_insert ON public.health_check_logs
  FOR INSERT WITH CHECK (true); -- service role inserts from API
