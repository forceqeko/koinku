-- ============================================
-- Atomic Balance Update Functions for Koin Ku
-- Run this in Supabase SQL Editor
-- ============================================

-- Function: Atomically increment/decrement account balance
CREATE OR REPLACE FUNCTION adjust_account_balance(
  account_id UUID,
  delta NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE accounts
  SET balance = balance + delta
  WHERE id = account_id;
END;
$$;

-- Function: Atomically increment/decrement wishlist current_amount
CREATE OR REPLACE FUNCTION adjust_wishlist_amount(
  wl_id UUID,
  delta NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE wishlists
  SET current_amount = current_amount + delta
  WHERE id = wl_id;
END;
$$;
