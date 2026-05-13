-- Match bank transactions by tax ID from ხელშეკრულებები board items
-- instead of the companies table. Only companies with contracts get matched.
-- matched_company_id is no longer set by auto-matching (kept for manual matches only).

CREATE OR REPLACE FUNCTION public.match_bank_transaction(p_transaction_id UUID)
RETURNS TEXT AS $$
DECLARE
  txn RECORD;
  tax_col_id TEXT;
  board_rec RECORD;
  found BOOLEAN := FALSE;
BEGIN
  -- Get the transaction
  SELECT * INTO txn FROM public.bank_transactions WHERE id = p_transaction_id;
  IF txn IS NULL THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  -- Skip if already matched
  IF txn.status = 'matched' THEN
    RETURN 'already_matched';
  END IF;

  -- Only match by tax ID (sender_inn)
  IF txn.sender_inn IS NULL OR txn.sender_inn = '' THEN
    RETURN 'unmatched';
  END IF;

  -- Search across all ხელშეკრულებ boards for a matching tax ID
  FOR board_rec IN
    SELECT b.id AS board_id
    FROM public.boards b
    WHERE b.name ILIKE '%ხელშეკრულებ%'
  LOOP
    -- Find the tax ID column for this board
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

    -- Check if any board item has this tax ID
    IF EXISTS (
      SELECT 1
      FROM public.board_items bi
      WHERE bi.board_id = board_rec.board_id
        AND bi.deleted_at IS NULL
        AND bi.data ->> tax_col_id = txn.sender_inn
    ) THEN
      found := TRUE;
      EXIT;
    END IF;
  END LOOP;

  IF found THEN
    UPDATE public.bank_transactions
    SET match_method = 'inn_board',
        match_confidence = 1.00,
        status = 'matched',
        updated_at = NOW()
    WHERE id = p_transaction_id;

    RETURN 'inn_board';
  END IF;

  RETURN 'unmatched';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
