-- RPC function to compute payment stats entirely in the database
-- Avoids fetching all rows to the client for aggregation

CREATE OR REPLACE FUNCTION get_payment_stats(
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL,
  p_match_source TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_transactions', COUNT(*)::int,
    'total_amount', COALESCE(SUM(amount), 0),
    'matched_count', COUNT(*) FILTER (WHERE status = 'matched')::int,
    'matched_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'matched'), 0),
    'unmatched_count', COUNT(*) FILTER (WHERE status = 'unmatched')::int,
    'unmatched_amount', COALESCE(SUM(amount) FILTER (WHERE status = 'unmatched'), 0),
    'ignored_count', COUNT(*) FILTER (WHERE status = 'ignored')::int,
    'match_rate', CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE (COUNT(*) FILTER (WHERE status = 'matched') * 100 / COUNT(*))::int
    END
  )
  FROM bank_transactions
  WHERE (p_from_date IS NULL OR entry_date >= p_from_date)
    AND (p_to_date IS NULL OR entry_date <= p_to_date)
    AND (p_match_source IS NULL OR match_source = p_match_source);
$$;

GRANT EXECUTE ON FUNCTION get_payment_stats(DATE, DATE, TEXT) TO authenticated;
