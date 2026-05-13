-- Add match_source column to bank_transactions to track which board matched
-- Values: 'active', 'paused', 'ended', 'one_time', null (unmatched/manual)

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS match_source TEXT;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_match_source
  ON public.bank_transactions(match_source)
  WHERE match_source IS NOT NULL;

-- Updated matching function: searches all contract-related boards
-- and tags transactions with their match source
CREATE OR REPLACE FUNCTION public.match_bank_transaction(p_transaction_id UUID)
RETURNS TEXT AS $$
DECLARE
  txn RECORD;
  tax_col_id TEXT;
  board_rec RECORD;
  found_source TEXT;
BEGIN
  SELECT * INTO txn FROM public.bank_transactions WHERE id = p_transaction_id;
  IF txn IS NULL THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF txn.status = 'matched' THEN
    RETURN 'already_matched';
  END IF;

  IF txn.sender_inn IS NULL OR txn.sender_inn = '' THEN
    RETURN 'unmatched';
  END IF;

  -- Search boards in priority order: active > one_time > paused > ended
  FOR board_rec IN
    SELECT b.id AS board_id, b.name,
      CASE
        WHEN b.name ILIKE '%ერთჯერადი%' THEN 'one_time'
        WHEN b.name ILIKE '%შეჩერებული%' THEN 'paused'
        WHEN b.name ILIKE '%შეწყვეტილ%' OR b.name ILIKE '%დასრულებულ%' THEN 'ended'
        WHEN b.name ILIKE '%ხელშეკრულებ%' THEN 'active'
        ELSE 'other'
      END AS source_type
    FROM public.boards b
    WHERE b.name ILIKE '%ხელშეკრულებ%'
       OR b.name ILIKE '%შეწყვეტილ%'
       OR b.name ILIKE '%დასრულებულ%'
       OR b.name ILIKE '%შეჩერებული%'
       OR b.name ILIKE '%ერთჯერადი%'
    ORDER BY
      CASE
        WHEN b.name ILIKE '%ხელშეკრულებ%' AND b.name NOT ILIKE '%ერთჯერადი%' THEN 1
        WHEN b.name ILIKE '%ერთჯერადი%' THEN 2
        WHEN b.name ILIKE '%შეჩერებული%' THEN 3
        ELSE 4
      END
  LOOP
    -- Find the tax ID column
    SELECT bc.column_id INTO tax_col_id
    FROM public.board_columns bc
    WHERE bc.board_id = board_rec.board_id
      AND bc.column_type = 'text'
      AND (
        COALESCE(bc.column_name_ka, '') ILIKE '%ს/კ%'
        OR COALESCE(bc.column_name_ka, '') ILIKE '%საიდენტიფიკაციო%'
        OR COALESCE(bc.column_name, '') ILIKE '%ს/კ%'
        OR COALESCE(bc.column_name, '') ILIKE '%საიდენტიფიკაციო%'
        OR COALESCE(bc.column_name, '') ILIKE '%tax%'
        OR COALESCE(bc.column_name, '') ILIKE '%inn%'
      )
    LIMIT 1;

    IF tax_col_id IS NULL THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.board_items bi
      WHERE bi.board_id = board_rec.board_id
        AND bi.deleted_at IS NULL
        AND bi.data ->> tax_col_id = txn.sender_inn
    ) THEN
      found_source := board_rec.source_type;
      EXIT;
    END IF;
  END LOOP;

  IF found_source IS NOT NULL THEN
    UPDATE public.bank_transactions
    SET match_method = 'inn_board',
        match_confidence = 1.00,
        status = 'matched',
        match_source = found_source,
        updated_at = NOW()
    WHERE id = p_transaction_id;

    RETURN 'inn_board:' || found_source;
  END IF;

  RETURN 'unmatched';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
