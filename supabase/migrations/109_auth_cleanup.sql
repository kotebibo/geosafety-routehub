-- Cleanup for abandoned/expired auth artifacts (see 108_auth_login_2fa.sql).
--
-- login_2fa_challenges rows are single-use and expire 10 minutes after
-- issuance, but nothing ever deleted them — a user who requested a code and
-- walked away left the row (code/token hashes, IP, user agent) behind
-- forever. Same for auth_rate_limits counters after their window/lockout
-- passed. cleanup_auth_challenges() removes both and is invoked daily per
-- instance by /api/cron/cleanup-auth (schedule in the root vercel.json).
--
-- Retention is 24h past expiry rather than immediate: recent-but-dead rows
-- are useful when investigating a user's login complaint, and the hashes
-- they hold are worthless once expired/consumed.

-- Supports the cleanup delete; the table only ever had lookups by
-- (user_id, purpose) and cookie_token_hash before.
CREATE INDEX IF NOT EXISTS idx_login_2fa_challenges_expires_at
  ON public.login_2fa_challenges (expires_at);

CREATE OR REPLACE FUNCTION public.cleanup_auth_challenges(
  p_challenge_retention_hours INT DEFAULT 24,
  p_rate_limit_retention_hours INT DEFAULT 24
)
RETURNS TABLE (deleted_challenges INT, deleted_rate_limits INT) AS $$
DECLARE
  v_challenges INT;
  v_rate_limits INT;
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

  RETURN QUERY SELECT v_challenges, v_rate_limits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Service-role only, like everything else in this area: no grant to
-- authenticated/anon — the cron route calls it through the service client.
REVOKE EXECUTE ON FUNCTION public.cleanup_auth_challenges(INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_auth_challenges(INT, INT) FROM anon, authenticated;
