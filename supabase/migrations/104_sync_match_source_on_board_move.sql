-- Keep bank_transactions.match_source in sync when a contract item moves
-- between boards in the "ხელშეკრულებები" workspace (active/one_time/paused/
-- ended). match_bank_transaction() only stamps match_source once, at match
-- time — it never re-runs when an already-matched company's contract moves
-- to a different board (e.g. via the in-app "Move to board" feature,
-- board-transfer.service.ts moveItemToBoard()), so the payments page kept
-- showing transactions under their stale source until the next reconcile.

CREATE OR REPLACE FUNCTION public.sync_match_source_on_contract_move()
RETURNS TRIGGER AS $$
DECLARE
  ws_id UUID;
  new_board_name TEXT;
  new_source TEXT;
  tax_col_id TEXT;
  tax_id TEXT;
  unmatched_txn RECORD;
BEGIN
  SELECT id INTO ws_id FROM public.workspaces WHERE name ILIKE 'ხელშეკრულებები' LIMIT 1;
  IF ws_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT b.name INTO new_board_name FROM public.boards b
  WHERE b.id = NEW.board_id AND b.workspace_id = ws_id;
  IF new_board_name IS NULL OR new_board_name ILIKE '%დამატებითი%' THEN
    -- moved outside the tracked workspace, or into the excluded services board
    RETURN NEW;
  END IF;

  new_source := CASE
    WHEN new_board_name ILIKE '%ერთჯერადი%' THEN 'one_time'
    WHEN new_board_name ILIKE '%შეჩერებული%' THEN 'paused'
    WHEN new_board_name ILIKE '%შეწყვეტილ%' OR new_board_name ILIKE '%დასრულებულ%' THEN 'ended'
    ELSE 'active'
  END;

  SELECT bc.column_id INTO tax_col_id
  FROM public.board_columns bc
  WHERE bc.board_id = NEW.board_id
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
    RETURN NEW;
  END IF;

  tax_id := NEW.data ->> tax_col_id;
  IF tax_id IS NULL OR tax_id = '' THEN
    RETURN NEW;
  END IF;

  -- Re-stamp already-matched transactions for this company with the new source
  UPDATE public.bank_transactions
  SET match_source = new_source,
      updated_at = NOW()
  WHERE sender_inn = tax_id
    AND status = 'matched';

  -- Give previously-unmatched transactions for this company a chance to match now
  FOR unmatched_txn IN
    SELECT id FROM public.bank_transactions
    WHERE sender_inn = tax_id AND status != 'matched'
  LOOP
    PERFORM public.match_bank_transaction(unmatched_txn.id);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_match_source_on_contract_move ON public.board_items;
CREATE TRIGGER trg_sync_match_source_on_contract_move
AFTER UPDATE OF board_id ON public.board_items
FOR EACH ROW
WHEN (OLD.board_id IS DISTINCT FROM NEW.board_id)
EXECUTE FUNCTION public.sync_match_source_on_contract_move();
