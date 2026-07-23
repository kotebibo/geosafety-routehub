-- Week-plan comments: a lightweight thread on an officer's week (keyed by
-- inspector_id + week_start, matching week_plans). Both the officer and managers
-- can post. Idempotent.

CREATE TABLE IF NOT EXISTS public.week_plan_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_week_plan_comments_week
  ON public.week_plan_comments (inspector_id, week_start, created_at);

ALTER TABLE public.week_plan_comments ENABLE ROW LEVEL SECURITY;

-- The officer sees/creates comments on their own week; managers on anyone's.
DROP POLICY IF EXISTS week_plan_comments_select ON public.week_plan_comments;
CREATE POLICY week_plan_comments_select ON public.week_plan_comments
  FOR SELECT USING (inspector_id = auth.uid() OR is_admin_or_dispatcher());

DROP POLICY IF EXISTS week_plan_comments_insert ON public.week_plan_comments;
CREATE POLICY week_plan_comments_insert ON public.week_plan_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND (inspector_id = auth.uid() OR is_admin_or_dispatcher())
  );

COMMENT ON TABLE public.week_plan_comments IS
  'Comments on an officer''s week plan (inspector_id + week_start); officer and managers can post.';
