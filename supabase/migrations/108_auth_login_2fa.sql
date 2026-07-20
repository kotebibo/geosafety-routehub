-- Secure login hardening + opt-in email-based 2FA.
--
-- Adds: mfa flag on public.users, a challenge table for both login-time 2FA
-- and settings-enrollment verification, a durable (Postgres-backed) rate
-- limiter for login/2FA endpoints — replacing the in-memory limiter in
-- apps/web/src/middleware/rateLimit.ts for these specific flows, since that
-- one resets per serverless instance and never actually saw login traffic —
-- and an auth audit log.
--
-- All new tables are RLS-enabled with no anon/authenticated policies: every
-- read/write happens server-side via the service-role client, since most of
-- these operations occur before a Supabase session exists at all (that's the
-- whole point — the browser must not hold a valid session until 2FA passes).

-- ================================================
-- SECTION 1: public.users additions
-- ================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ;

-- ================================================
-- SECTION 2: login_2fa_challenges
-- One row per issued OTP (login 2FA or settings enrollment). Only the hash
-- of the code, the link token, and the pending-login cookie reference are
-- stored — never the plaintext values.
-- ================================================

CREATE TABLE IF NOT EXISTS public.login_2fa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('login', 'enroll')),
  code_hash TEXT NOT NULL,
  link_token_hash TEXT NOT NULL,
  cookie_token_hash TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  resend_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_2fa_challenges_user_purpose
  ON public.login_2fa_challenges (user_id, purpose, consumed_at);

CREATE INDEX IF NOT EXISTS idx_login_2fa_challenges_cookie_token
  ON public.login_2fa_challenges (cookie_token_hash)
  WHERE cookie_token_hash IS NOT NULL;

ALTER TABLE public.login_2fa_challenges ENABLE ROW LEVEL SECURITY;

-- ================================================
-- SECTION 3: auth_rate_limits + atomic check-and-bump function
--
-- IMPORTANT: Supabase's serverless functions typically go through a
-- transaction-mode connection pooler, which does not guarantee two
-- statements from one invocation share a connection between statements. A
-- SELECT-count-then-UPDATE pattern from the app layer is a real race
-- between concurrent requests. check_and_bump_rate_limit() does the
-- upsert-and-decide in a single atomic statement instead.
-- ================================================

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  scope TEXT NOT NULL,
  identifier TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until TIMESTAMPTZ,
  PRIMARY KEY (scope, identifier)
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_and_bump_rate_limit(
  p_scope TEXT,
  p_identifier TEXT,
  p_max INT,
  p_window_seconds INT,
  p_lockout_seconds INT
)
RETURNS TABLE (allowed BOOLEAN, retry_after_seconds INT) AS $$
DECLARE
  v_row public.auth_rate_limits;
BEGIN
  INSERT INTO public.auth_rate_limits AS r (scope, identifier, count, window_start)
  VALUES (p_scope, p_identifier, 1, now())
  ON CONFLICT (scope, identifier) DO UPDATE SET
    count = CASE
      -- Currently locked out: leave count untouched, locked_until governs the reply.
      WHEN r.locked_until IS NOT NULL AND r.locked_until > now() THEN r.count
      -- Window expired: start a fresh window.
      WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN 1
      -- Within window: bump.
      ELSE r.count + 1
    END,
    window_start = CASE
      WHEN r.locked_until IS NOT NULL AND r.locked_until > now() THEN r.window_start
      WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN now()
      ELSE r.window_start
    END,
    locked_until = CASE
      WHEN r.locked_until IS NOT NULL AND r.locked_until > now() THEN r.locked_until
      WHEN r.window_start < now() - make_interval(secs => p_window_seconds) THEN NULL
      WHEN r.count + 1 >= p_max THEN now() + make_interval(secs => p_lockout_seconds)
      ELSE NULL
    END
  RETURNING r.* INTO v_row;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RETURN QUERY SELECT false, GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_row.locked_until - now())))::INT);
  ELSE
    RETURN QUERY SELECT true, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ================================================
-- SECTION 4: auth_audit_log
-- ================================================

CREATE TABLE IF NOT EXISTS public.auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_success',
    'login_failed',
    'login_locked',
    '2fa_challenge_sent',
    '2fa_verify_success',
    '2fa_verify_failed',
    '2fa_resend',
    '2fa_enabled',
    '2fa_disabled',
    '2fa_disabled_by_admin'
  )),
  ip INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_created
  ON public.auth_audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_audit_log_event_created
  ON public.auth_audit_log (event_type, created_at DESC);

ALTER TABLE public.auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read the audit log via the RLS-scoped client (a future viewer
-- doesn't need the service-role client just to list events). No INSERT
-- policy — all writes go through the service-role client.
CREATE POLICY "auth_audit_log_admin_select" ON public.auth_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin_user());
