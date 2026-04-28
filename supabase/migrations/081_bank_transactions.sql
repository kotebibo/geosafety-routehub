-- BOG Payment Tracking: bank_transactions + payment_matches tables
-- Must be applied to ALL 3 Supabase instances

-- Enable pg_trgm for fuzzy name matching (may already exist)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 1. bank_transactions — raw records from BOG API
-- ============================================================
CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_key TEXT UNIQUE NOT NULL,                    -- BOG natural key (idempotent upserts)
  entry_date DATE NOT NULL,
  doc_date DATE,
  amount NUMERIC(15, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GEL',
  sender_name TEXT,
  sender_inn TEXT,                                  -- Sender tax ID
  sender_account TEXT,
  receiver_account TEXT,
  purpose TEXT,                                     -- Payment description
  raw_data JSONB,                                   -- Full BOG response for debugging
  matched_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  match_method TEXT,                                -- 'inn_exact', 'name_regex', 'fuzzy', 'manual'
  match_confidence NUMERIC(3, 2),                   -- 0.00 to 1.00
  status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (status IN ('matched', 'unmatched', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bank_transactions_sender_inn ON public.bank_transactions(sender_inn);
CREATE INDEX idx_bank_transactions_status ON public.bank_transactions(status);
CREATE INDEX idx_bank_transactions_entry_date ON public.bank_transactions(entry_date DESC);
CREATE INDEX idx_bank_transactions_matched_company ON public.bank_transactions(matched_company_id)
  WHERE matched_company_id IS NOT NULL;
CREATE INDEX idx_bank_transactions_sender_name_trgm
  ON public.bank_transactions USING gin (sender_name gin_trgm_ops);

-- ============================================================
-- 2. payment_matches — audit trail for match decisions
-- ============================================================
CREATE TABLE public.payment_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.bank_transactions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  matched_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = auto-matched
  match_method TEXT NOT NULL,
  confidence NUMERIC(3, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_matches_transaction ON public.payment_matches(transaction_id);
CREATE INDEX idx_payment_matches_company ON public.payment_matches(company_id);

-- ============================================================
-- 3. Add normalized_name to companies for fuzzy matching
-- ============================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Trigram index on normalized company names
CREATE INDEX IF NOT EXISTS idx_companies_normalized_name_trgm
  ON public.companies USING gin (normalized_name gin_trgm_ops);

-- ============================================================
-- 4. RLS policies
-- ============================================================
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_matches ENABLE ROW LEVEL SECURITY;

-- bank_transactions: admin/dispatcher can read all, admin can write
CREATE POLICY "bank_transactions_select"
  ON public.bank_transactions FOR SELECT TO authenticated
  USING (public.is_admin_or_dispatcher());

CREATE POLICY "bank_transactions_insert"
  ON public.bank_transactions FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "bank_transactions_update"
  ON public.bank_transactions FOR UPDATE TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "bank_transactions_delete"
  ON public.bank_transactions FOR DELETE TO authenticated
  USING (public.is_admin_user());

-- payment_matches: admin/dispatcher can read, admin can write
CREATE POLICY "payment_matches_select"
  ON public.payment_matches FOR SELECT TO authenticated
  USING (public.is_admin_or_dispatcher());

CREATE POLICY "payment_matches_insert"
  ON public.payment_matches FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user());

-- ============================================================
-- 5. Updated_at trigger
-- ============================================================
CREATE TRIGGER set_bank_transactions_updated_at
  BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. Matching RPC function
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_bank_transaction(p_transaction_id UUID)
RETURNS TEXT AS $$
DECLARE
  txn RECORD;
  matched_id UUID;
  method TEXT;
  conf NUMERIC(3, 2);
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

  -- Tier 1: Exact tax ID match
  IF txn.sender_inn IS NOT NULL AND txn.sender_inn != '' THEN
    SELECT id INTO matched_id
    FROM public.companies
    WHERE tax_id = txn.sender_inn
    LIMIT 1;

    IF matched_id IS NOT NULL THEN
      method := 'inn_exact';
      conf := 1.00;
    END IF;
  END IF;

  -- Tier 2: Exact name match (case-insensitive)
  IF matched_id IS NULL AND txn.sender_name IS NOT NULL THEN
    SELECT id INTO matched_id
    FROM public.companies
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(txn.sender_name))
    LIMIT 1;

    IF matched_id IS NOT NULL THEN
      method := 'name_exact';
      conf := 0.95;
    END IF;
  END IF;

  -- Tier 3: Fuzzy name match via pg_trgm
  IF matched_id IS NULL AND txn.sender_name IS NOT NULL THEN
    SELECT id, similarity(COALESCE(normalized_name, LOWER(name)), LOWER(txn.sender_name)) AS sim
    INTO matched_id, conf
    FROM public.companies
    WHERE similarity(COALESCE(normalized_name, LOWER(name)), LOWER(txn.sender_name)) > 0.4
    ORDER BY sim DESC
    LIMIT 1;

    IF matched_id IS NOT NULL THEN
      method := 'fuzzy';
      -- conf already set from similarity()
    END IF;
  END IF;

  -- Apply match or leave unmatched
  IF matched_id IS NOT NULL THEN
    UPDATE public.bank_transactions
    SET matched_company_id = matched_id,
        match_method = method,
        match_confidence = conf,
        status = 'matched',
        updated_at = NOW()
    WHERE id = p_transaction_id;

    -- Audit trail
    INSERT INTO public.payment_matches (transaction_id, company_id, match_method, confidence)
    VALUES (p_transaction_id, matched_id, method, conf);

    RETURN method;
  END IF;

  RETURN 'unmatched';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================================
-- 7. Page permission for payments
-- ============================================================
INSERT INTO permissions (name, resource, action, description, category) VALUES
  ('pages:payments', 'pages', 'payments', 'Access bank payments page', 'Pages')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_name, permission) VALUES
  ('dispatcher', 'pages:payments')
ON CONFLICT (role_name, permission) DO NOTHING;

-- Batch matching function
CREATE OR REPLACE FUNCTION public.match_unmatched_transactions()
RETURNS TABLE(transaction_id UUID, result TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT bt.id, public.match_bank_transaction(bt.id)
  FROM public.bank_transactions bt
  WHERE bt.status = 'unmatched'
  ORDER BY bt.entry_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
