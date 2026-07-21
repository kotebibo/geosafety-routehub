-- Recovery-flow audit events + trusted devices for 2FA.
--
-- 1. auth_audit_log gains password-recovery event types (the recovery flow
--    was previously invisible to the audit log) and a trusted-device event.
-- 2. trusted_devices lets a user skip the email 2FA challenge on a browser
--    they've verified once ("remember this device for 30 days"). Only the
--    SHA-256 of the cookie token is stored — same posture as
--    login_2fa_challenges: RLS on, no policies, service-role only.
-- 3. cleanup_auth_challenges() (109) is recreated to also purge expired
--    trusted devices, with a third count in its return.

-- ================================================
-- SECTION 1: extend auth_audit_log event types
-- ================================================

ALTER TABLE public.auth_audit_log
  DROP CONSTRAINT IF EXISTS auth_audit_log_event_type_check;

ALTER TABLE public.auth_audit_log
  ADD CONSTRAINT auth_audit_log_event_type_check CHECK (event_type IN (
    'login_success',
    'login_failed',
    'login_locked',
    '2fa_challenge_sent',
    '2fa_verify_success',
    '2fa_verify_failed',
    '2fa_resend',
    '2fa_enabled',
    '2fa_disabled',
    '2fa_disabled_by_admin',
    '2fa_trusted_device_used',
    'password_reset_requested',
    'password_reset_completed'
  ));

-- ================================================
-- SECTION 2: trusted_devices
-- ================================================

CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  ip INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user
  ON public.trusted_devices (user_id);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- ================================================
-- SECTION 3: cleanup covers trusted devices too
-- Return type changes (third column), so the old function must be dropped
-- first — CREATE OR REPLACE cannot change an output signature.
-- ================================================

DROP FUNCTION IF EXISTS public.cleanup_auth_challenges(INT, INT);

CREATE OR REPLACE FUNCTION public.cleanup_auth_challenges(
  p_challenge_retention_hours INT DEFAULT 24,
  p_rate_limit_retention_hours INT DEFAULT 24
)
RETURNS TABLE (deleted_challenges INT, deleted_rate_limits INT, deleted_trusted_devices INT) AS $$
DECLARE
  v_challenges INT;
  v_rate_limits INT;
  v_trusted INT;
BEGIN
  -- expires_at is NOT NULL and always ~10 min after creation, so this single
  -- predicate covers every abandoned, expired, and consumed row.
  DELETE FROM public.login_2fa_challenges
  WHERE expires_at < now() - make_interval(hours => p_challenge_retention_hours);
  GET DIAGNOSTICS v_challenges = ROW_COUNT;

  -- Only counters whose window is long over and that are not (and will not
  -- again be) locked out — deleting a live row would reset someone's count.
  DELETE FROM public.auth_rate_limits
  WHERE window_start < now() - make_interval(hours => p_rate_limit_retention_hours)
    AND (locked_until IS NULL OR locked_until < now());
  GET DIAGNOSTICS v_rate_limits = ROW_COUNT;

  -- A trusted-device cookie past its 30-day expiry can never verify again.
  DELETE FROM public.trusted_devices
  WHERE expires_at < now() - make_interval(hours => p_challenge_retention_hours);
  GET DIAGNOSTICS v_trusted = ROW_COUNT;

  RETURN QUERY SELECT v_challenges, v_rate_limits, v_trusted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.cleanup_auth_challenges(INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_auth_challenges(INT, INT) FROM anon, authenticated;
