-- Scope contract-board matching to the "ხელშეკრულებები" workspace instead
-- of searching board names across the entire boards table. boards.name has
-- no uniqueness constraint, so the previous global name-based search could
-- match unrelated/duplicate boards from other workspaces. Also explicitly
-- excludes the "დამატებითი მომსახურეობები" (additional services) board,
-- which lives in the same workspace but isn't a payments source.

CREATE OR REPLACE FUNCTION public.match_bank_transaction(p_transaction_id UUID)
RETURNS TEXT AS $$
DECLARE
  txn RECORD;
  tax_col_id TEXT;
  board_rec RECORD;
  found_source TEXT;
  ws_id UUID;
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

  SELECT id INTO ws_id FROM public.workspaces WHERE name ILIKE 'ხელშეკრულებები' LIMIT 1;
  IF ws_id IS NULL THEN
    RETURN 'unmatched';
  END IF;

  -- Search boards in priority order: active > one_time > paused > ended
  FOR board_rec IN
    SELECT b.id AS board_id, b.name,
      CASE
        WHEN b.name ILIKE '%ერთჯერადი%' THEN 'one_time'
        WHEN b.name ILIKE '%შეჩერებული%' THEN 'paused'
        WHEN b.name ILIKE '%შეწყვეტილ%' OR b.name ILIKE '%დასრულებულ%' THEN 'ended'
        ELSE 'active'
      END AS source_type
    FROM public.boards b
    WHERE b.workspace_id = ws_id
      AND b.name NOT ILIKE '%დამატებითი%'
    ORDER BY
      CASE
        WHEN b.name ILIKE '%ერთჯერადი%' THEN 2
        WHEN b.name ILIKE '%შეჩერებული%' THEN 3
        WHEN b.name ILIKE '%შეწყვეტილ%' OR b.name ILIKE '%დასრულებულ%' THEN 4
        ELSE 1
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
