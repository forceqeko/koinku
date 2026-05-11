-- ============================================
-- Atomic Transaction RPCs for Koin Ku
-- Run this in Supabase SQL Editor
-- ============================================
-- These functions replace the old multi-step pattern (insert row, then
-- call adjust_account_balance/adjust_wishlist_amount multiple times from
-- the frontend) with a single RPC per operation. Everything inside a
-- plpgsql function runs in one DB transaction, so if any statement fails
-- (constraint violation, RLS block, network cut) Postgres rolls the
-- whole thing back automatically. The frontend no longer needs manual
-- rollback.
--
-- Admin fee model (Opsi A): admin_fee is a field on the transfer/saving
-- row itself. We do NOT insert a separate "expense" row for the fee.
-- The source account is debited by (amount + admin_fee) so the fee is
-- already reflected in the balance.
-- ============================================


-- ─── create_transaction_atomic ───────────────
-- Inserts a transaction and applies all balance/wishlist side effects
-- in a single atomic operation. Returns the new transaction id.
CREATE OR REPLACE FUNCTION create_transaction_atomic(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  uid uuid := auth.uid();
  new_tx_id uuid;
  p_type        text        := payload->>'type';
  p_amt         numeric     := (payload->>'amount')::numeric;
  p_fee         numeric     := COALESCE(NULLIF(payload->>'admin_fee', '')::numeric, 0);
  p_date        timestamptz := (payload->>'date')::timestamptz;
  p_desc        text        := payload->>'description';
  p_from        uuid        := NULLIF(payload->>'from_account_id', '')::uuid;
  p_to          uuid        := NULLIF(payload->>'to_account_id', '')::uuid;
  p_category    uuid        := NULLIF(payload->>'category_id', '')::uuid;
  p_purpose     uuid        := NULLIF(payload->>'purpose_id', '')::uuid;
  p_source      uuid        := NULLIF(payload->>'source_id', '')::uuid;
  p_wishlist    uuid        := NULLIF(payload->>'wishlist_id', '')::uuid;
  p_bill        uuid        := NULLIF(payload->>'bill_purpose_id', '')::uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;

  -- Insert the transaction row. CHECK constraints at the table level
  -- enforce amount > 0, valid type, required accounts per type, etc.
  INSERT INTO transactions (
    user_id, date, type, description, amount, admin_fee,
    from_account_id, to_account_id,
    category_id, purpose_id, source_id, wishlist_id, bill_purpose_id
  )
  VALUES (
    uid, p_date, p_type, p_desc, p_amt,
    CASE WHEN p_fee > 0 THEN p_fee ELSE NULL END,
    p_from, p_to,
    p_category, p_purpose, p_source, p_wishlist, p_bill
  )
  RETURNING id INTO new_tx_id;

  -- Apply balance changes based on type.
  IF p_type = 'income' THEN
    UPDATE accounts SET balance = balance + p_amt
      WHERE id = p_to AND user_id = uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Akun tujuan tidak ditemukan'; END IF;

  ELSIF p_type IN ('expense', 'bill') THEN
    UPDATE accounts SET balance = balance - p_amt
      WHERE id = p_from AND user_id = uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Akun sumber tidak ditemukan'; END IF;

  ELSIF p_type IN ('transfer', 'saving') THEN
    UPDATE accounts SET balance = balance - (p_amt + p_fee)
      WHERE id = p_from AND user_id = uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Akun sumber tidak ditemukan'; END IF;

    UPDATE accounts SET balance = balance + p_amt
      WHERE id = p_to AND user_id = uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Akun tujuan tidak ditemukan'; END IF;
  END IF;

  -- Saving: also increase wishlist progress
  IF p_type = 'saving' AND p_wishlist IS NOT NULL THEN
    UPDATE wishlists SET current_amount = current_amount + p_amt
      WHERE id = p_wishlist AND user_id = uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Wishlist tidak ditemukan'; END IF;
  END IF;

  RETURN new_tx_id;
END;
$$;


-- ─── update_transaction_atomic ───────────────
-- Reverses the old transaction's balance effects, updates the row, then
-- applies the new transaction's balance effects. All atomic.
CREATE OR REPLACE FUNCTION update_transaction_atomic(tx_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  uid uuid := auth.uid();
  old_tx transactions%ROWTYPE;
  old_amt numeric;
  old_fee numeric;

  p_type        text        := payload->>'type';
  p_amt         numeric     := (payload->>'amount')::numeric;
  p_fee         numeric     := COALESCE(NULLIF(payload->>'admin_fee', '')::numeric, 0);
  p_date        timestamptz := (payload->>'date')::timestamptz;
  p_desc        text        := payload->>'description';
  p_from        uuid        := NULLIF(payload->>'from_account_id', '')::uuid;
  p_to          uuid        := NULLIF(payload->>'to_account_id', '')::uuid;
  p_category    uuid        := NULLIF(payload->>'category_id', '')::uuid;
  p_purpose     uuid        := NULLIF(payload->>'purpose_id', '')::uuid;
  p_source      uuid        := NULLIF(payload->>'source_id', '')::uuid;
  p_wishlist    uuid        := NULLIF(payload->>'wishlist_id', '')::uuid;
  p_bill        uuid        := NULLIF(payload->>'bill_purpose_id', '')::uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;

  -- Lock and read the current transaction.
  SELECT * INTO old_tx FROM transactions
    WHERE id = tx_id AND user_id = uid AND deleted_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan atau sudah dihapus';
  END IF;

  old_amt := old_tx.amount;
  old_fee := COALESCE(old_tx.admin_fee, 0);

  -- Reverse old balance effects (always increases balance on the source,
  -- so non-negative CHECK cannot fire here).
  IF old_tx.type = 'income' THEN
    UPDATE accounts SET balance = balance - old_amt
      WHERE id = old_tx.to_account_id AND user_id = uid;
  ELSIF old_tx.type IN ('expense', 'bill') THEN
    UPDATE accounts SET balance = balance + old_amt
      WHERE id = old_tx.from_account_id AND user_id = uid;
  ELSIF old_tx.type IN ('transfer', 'saving') THEN
    UPDATE accounts SET balance = balance + (old_amt + old_fee)
      WHERE id = old_tx.from_account_id AND user_id = uid;
    UPDATE accounts SET balance = balance - old_amt
      WHERE id = old_tx.to_account_id AND user_id = uid;
  END IF;

  IF old_tx.type = 'saving' AND old_tx.wishlist_id IS NOT NULL THEN
    UPDATE wishlists SET current_amount = current_amount - old_amt
      WHERE id = old_tx.wishlist_id AND user_id = uid;
  END IF;

  -- Apply new data to the row. Fields not relevant to the new type are
  -- explicitly cleared so there are no leftovers from the old type.
  UPDATE transactions SET
    date            = p_date,
    type            = p_type,
    description     = p_desc,
    amount          = p_amt,
    admin_fee       = CASE WHEN p_fee > 0 THEN p_fee ELSE NULL END,
    from_account_id = p_from,
    to_account_id   = p_to,
    category_id     = p_category,
    purpose_id      = p_purpose,
    source_id       = p_source,
    wishlist_id     = p_wishlist,
    bill_purpose_id = p_bill
  WHERE id = tx_id AND user_id = uid;

  -- Apply new balance effects.
  IF p_type = 'income' THEN
    UPDATE accounts SET balance = balance + p_amt
      WHERE id = p_to AND user_id = uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Akun tujuan tidak ditemukan'; END IF;

  ELSIF p_type IN ('expense', 'bill') THEN
    UPDATE accounts SET balance = balance - p_amt
      WHERE id = p_from AND user_id = uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Akun sumber tidak ditemukan'; END IF;

  ELSIF p_type IN ('transfer', 'saving') THEN
    UPDATE accounts SET balance = balance - (p_amt + p_fee)
      WHERE id = p_from AND user_id = uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Akun sumber tidak ditemukan'; END IF;

    UPDATE accounts SET balance = balance + p_amt
      WHERE id = p_to AND user_id = uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Akun tujuan tidak ditemukan'; END IF;
  END IF;

  IF p_type = 'saving' AND p_wishlist IS NOT NULL THEN
    UPDATE wishlists SET current_amount = current_amount + p_amt
      WHERE id = p_wishlist AND user_id = uid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Wishlist tidak ditemukan'; END IF;
  END IF;
END;
$$;


-- ─── delete_transaction_atomic ───────────────
-- Soft-deletes a transaction and reverses its balance/wishlist effects
-- atomically.
CREATE OR REPLACE FUNCTION delete_transaction_atomic(tx_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  uid uuid := auth.uid();
  old_tx transactions%ROWTYPE;
  old_amt numeric;
  old_fee numeric;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;

  SELECT * INTO old_tx FROM transactions
    WHERE id = tx_id AND user_id = uid AND deleted_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan atau sudah dihapus';
  END IF;

  old_amt := old_tx.amount;
  old_fee := COALESCE(old_tx.admin_fee, 0);

  -- Reverse balance.
  IF old_tx.type = 'income' THEN
    UPDATE accounts SET balance = balance - old_amt
      WHERE id = old_tx.to_account_id AND user_id = uid;
  ELSIF old_tx.type IN ('expense', 'bill') THEN
    UPDATE accounts SET balance = balance + old_amt
      WHERE id = old_tx.from_account_id AND user_id = uid;
  ELSIF old_tx.type IN ('transfer', 'saving') THEN
    UPDATE accounts SET balance = balance + (old_amt + old_fee)
      WHERE id = old_tx.from_account_id AND user_id = uid;
    UPDATE accounts SET balance = balance - old_amt
      WHERE id = old_tx.to_account_id AND user_id = uid;
  END IF;

  IF old_tx.type = 'saving' AND old_tx.wishlist_id IS NOT NULL THEN
    UPDATE wishlists SET current_amount = current_amount - old_amt
      WHERE id = old_tx.wishlist_id AND user_id = uid;
  END IF;

  -- Soft delete the transaction.
  UPDATE transactions
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = tx_id AND user_id = uid;
END;
$$;


-- ─── Grants ──────────────────────────────────
GRANT EXECUTE ON FUNCTION create_transaction_atomic(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION update_transaction_atomic(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_transaction_atomic(uuid) TO authenticated;
