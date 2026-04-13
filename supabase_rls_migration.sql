-- ============================================
-- Row Level Security (RLS) Policies for Koin Ku
-- Run this in Supabase SQL Editor
-- ============================================
-- This ensures each user can ONLY access their own data.
-- Without this, ANY authenticated user can read/modify ALL data.

-- ─── 1. ACCOUNTS ───────────────────────────────
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own accounts" ON accounts;
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;
CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 2. TRANSACTIONS ──────────────────────────
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 3. EXPENSE CATEGORIES ────────────────────
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own categories" ON expense_categories;
CREATE POLICY "Users can view own categories"
  ON expense_categories FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON expense_categories;
CREATE POLICY "Users can insert own categories"
  ON expense_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON expense_categories;
CREATE POLICY "Users can update own categories"
  ON expense_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON expense_categories;
CREATE POLICY "Users can delete own categories"
  ON expense_categories FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 4. EXPENSE PURPOSES ──────────────────────
ALTER TABLE expense_purposes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own purposes" ON expense_purposes;
CREATE POLICY "Users can view own purposes"
  ON expense_purposes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own purposes" ON expense_purposes;
CREATE POLICY "Users can insert own purposes"
  ON expense_purposes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own purposes" ON expense_purposes;
CREATE POLICY "Users can update own purposes"
  ON expense_purposes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own purposes" ON expense_purposes;
CREATE POLICY "Users can delete own purposes"
  ON expense_purposes FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 5. INCOME SOURCES ────────────────────────
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sources" ON income_sources;
CREATE POLICY "Users can view own sources"
  ON income_sources FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sources" ON income_sources;
CREATE POLICY "Users can insert own sources"
  ON income_sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sources" ON income_sources;
CREATE POLICY "Users can update own sources"
  ON income_sources FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sources" ON income_sources;
CREATE POLICY "Users can delete own sources"
  ON income_sources FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 6. WISHLISTS ──────────────────────────────
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wishlists" ON wishlists;
CREATE POLICY "Users can view own wishlists"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wishlists" ON wishlists;
CREATE POLICY "Users can insert own wishlists"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wishlists" ON wishlists;
CREATE POLICY "Users can update own wishlists"
  ON wishlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wishlists" ON wishlists;
CREATE POLICY "Users can delete own wishlists"
  ON wishlists FOR DELETE
  USING (auth.uid() = user_id);


-- ─── 7. UPDATE RPC FUNCTIONS TO RESPECT RLS ───
-- The previous functions used SECURITY DEFINER which bypasses RLS.
-- We update them to use SECURITY INVOKER so RLS policies apply.

CREATE OR REPLACE FUNCTION adjust_account_balance(
  account_id UUID,
  delta NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to INVOKER
AS $$
BEGIN
  UPDATE accounts
  SET balance = balance + delta
  WHERE id = account_id;
  
  -- Verify the row was actually updated (RLS may block it)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or access denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION adjust_wishlist_amount(
  wl_id UUID,
  delta NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to INVOKER
AS $$
BEGIN
  UPDATE wishlists
  SET current_amount = current_amount + delta
  WHERE id = wl_id;
  
  -- Verify the row was actually updated (RLS may block it)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wishlist not found or access denied';
  END IF;
END;
$$;


-- ============================================
-- POINT 16: SOFT DELETE IMPLEMENTATION
-- ============================================
-- Add deleted_at column to transactions table for soft delete

-- Add deleted_at column if not exists
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at 
ON transactions(deleted_at) 
WHERE deleted_at IS NULL;

-- Create function to soft delete transaction
CREATE OR REPLACE FUNCTION soft_delete_transaction(tx_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE transactions
  SET deleted_at = NOW(),
      updated_at = NOW()
  WHERE id = tx_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found, already deleted, or access denied';
  END IF;
END;
$$;

-- Create function to restore soft-deleted transaction
CREATE OR REPLACE FUNCTION restore_transaction(tx_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE transactions
  SET deleted_at = NULL,
      updated_at = NOW()
  WHERE id = tx_id
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found, not deleted, or access denied';
  END IF;
END;
$$;

-- Update RLS policy for SELECT to exclude soft-deleted records
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Note: DELETE policy still exists but should be used with caution
-- For soft delete, use UPDATE policy instead


-- ============================================
-- POINT 14: SERVER-SIDE VALIDATION (CHECK CONSTRAINTS)
-- ============================================
-- These constraints prevent invalid data even if bypassed via DevTools

-- 1. TRANSACTIONS VALIDATION

-- Amount must be positive
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_transactions_amount_positive;
ALTER TABLE transactions
ADD CONSTRAINT chk_transactions_amount_positive 
CHECK (amount > 0);

-- Admin fee must be non-negative if provided
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_transactions_admin_fee_non_negative;
ALTER TABLE transactions
ADD CONSTRAINT chk_transactions_admin_fee_non_negative 
CHECK (admin_fee IS NULL OR admin_fee >= 0);

-- Type must be valid
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_transactions_type_valid;
ALTER TABLE transactions
ADD CONSTRAINT chk_transactions_type_valid 
CHECK (type IN ('income', 'expense', 'saving', 'transfer', 'bill'));

-- Add bill_purpose_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'bill_purpose_id') THEN
    ALTER TABLE transactions ADD COLUMN bill_purpose_id UUID;
  END IF;
END $$;

-- Description must not be empty
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_transactions_description_not_empty;
ALTER TABLE transactions
ADD CONSTRAINT chk_transactions_description_not_empty 
CHECK (LENGTH(TRIM(description)) > 0);

-- Type-specific account validations
-- Income must have to_account_id
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_income_has_to_account;
ALTER TABLE transactions
ADD CONSTRAINT chk_income_has_to_account 
CHECK (
  type != 'income' OR to_account_id IS NOT NULL
);

-- Expense must have from_account_id
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_expense_has_from_account;
ALTER TABLE transactions
ADD CONSTRAINT chk_expense_has_from_account 
CHECK (
  type != 'expense' OR from_account_id IS NOT NULL
);

-- Transfer/Saving must have both accounts and they must be different
ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS chk_transfer_has_both_accounts;
ALTER TABLE transactions
ADD CONSTRAINT chk_transfer_has_both_accounts 
CHECK (
  (type NOT IN ('transfer', 'saving')) OR 
  (from_account_id IS NOT NULL AND to_account_id IS NOT NULL AND from_account_id != to_account_id)
);


-- 2. ACCOUNTS VALIDATION

-- Balance must be non-negative
ALTER TABLE accounts
DROP CONSTRAINT IF EXISTS chk_accounts_balance_non_negative;
ALTER TABLE accounts
ADD CONSTRAINT chk_accounts_balance_non_negative 
CHECK (balance >= 0);

-- Account type must be valid
ALTER TABLE accounts
DROP CONSTRAINT IF EXISTS chk_accounts_type_valid;
ALTER TABLE accounts
ADD CONSTRAINT chk_accounts_type_valid 
CHECK (type IN ('bank', 'ewallet', 'cash', 'investasi'));

-- Name must not be empty
ALTER TABLE accounts
DROP CONSTRAINT IF EXISTS chk_accounts_name_not_empty;
ALTER TABLE accounts
ADD CONSTRAINT chk_accounts_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);


-- 3. WISHLISTS VALIDATION

-- Target amount must be positive
ALTER TABLE wishlists
DROP CONSTRAINT IF EXISTS chk_wishlists_target_positive;
ALTER TABLE wishlists
ADD CONSTRAINT chk_wishlists_target_positive 
CHECK (target_amount > 0);

-- Current amount must be non-negative
ALTER TABLE wishlists
DROP CONSTRAINT IF EXISTS chk_wishlists_current_non_negative;
ALTER TABLE wishlists
ADD CONSTRAINT chk_wishlists_current_non_negative 
CHECK (current_amount >= 0);

-- Name must not be empty
ALTER TABLE wishlists
DROP CONSTRAINT IF EXISTS chk_wishlists_name_not_empty;
ALTER TABLE wishlists
ADD CONSTRAINT chk_wishlists_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);


-- 4. EXPENSE CATEGORIES VALIDATION

-- Name must not be empty
ALTER TABLE expense_categories
DROP CONSTRAINT IF EXISTS chk_categories_name_not_empty;
ALTER TABLE expense_categories
ADD CONSTRAINT chk_categories_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);


-- 5. EXPENSE PURPOSES VALIDATION

-- Name must not be empty
ALTER TABLE expense_purposes
DROP CONSTRAINT IF EXISTS chk_purposes_name_not_empty;
ALTER TABLE expense_purposes
ADD CONSTRAINT chk_purposes_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);


-- 6. INCOME SOURCES VALIDATION

-- Name must not be empty
ALTER TABLE income_sources
DROP CONSTRAINT IF EXISTS chk_sources_name_not_empty;
ALTER TABLE income_sources
ADD CONSTRAINT chk_sources_name_not_empty 
CHECK (LENGTH(TRIM(name)) > 0);


-- ============================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================

-- Create the function (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Helper: Add updated_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'updated_at') THEN
    ALTER TABLE accounts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'updated_at') THEN
    ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wishlists' AND column_name = 'updated_at') THEN
    ALTER TABLE wishlists ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_categories' AND column_name = 'updated_at') THEN
    ALTER TABLE expense_categories ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_purposes' AND column_name = 'updated_at') THEN
    ALTER TABLE expense_purposes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'income_sources' AND column_name = 'updated_at') THEN
    ALTER TABLE income_sources ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Apply triggers only if columns exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS trg_accounts_updated_at ON accounts;
    CREATE TRIGGER trg_accounts_updated_at
      BEFORE UPDATE ON accounts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
    CREATE TRIGGER trg_transactions_updated_at
      BEFORE UPDATE ON transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wishlists' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS trg_wishlists_updated_at ON wishlists;
    CREATE TRIGGER trg_wishlists_updated_at
      BEFORE UPDATE ON wishlists
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_categories' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS trg_expense_categories_updated_at ON expense_categories;
    CREATE TRIGGER trg_expense_categories_updated_at
      BEFORE UPDATE ON expense_categories
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expense_purposes' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS trg_expense_purposes_updated_at ON expense_purposes;
    CREATE TRIGGER trg_expense_purposes_updated_at
      BEFORE UPDATE ON expense_purposes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'income_sources' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS trg_income_sources_updated_at ON income_sources;
    CREATE TRIGGER trg_income_sources_updated_at
      BEFORE UPDATE ON income_sources
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- ============================================
-- BILL PURPOSES TABLE (for recurring bills/tagihan)
-- ============================================

-- Create bill_purposes table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bill_purposes') THEN
    CREATE TABLE bill_purposes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Enable RLS
ALTER TABLE bill_purposes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own bill_purposes" ON bill_purposes;
CREATE POLICY "Users can view own bill_purposes"
  ON bill_purposes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bill_purposes" ON bill_purposes;
CREATE POLICY "Users can insert own bill_purposes"
  ON bill_purposes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bill_purposes" ON bill_purposes;
CREATE POLICY "Users can update own bill_purposes"
  ON bill_purposes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bill_purposes" ON bill_purposes;
CREATE POLICY "Users can delete own bill_purposes"
  ON bill_purposes FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bill_purposes' AND column_name = 'updated_at') THEN
    ALTER TABLE bill_purposes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- Create trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bill_purposes' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS trg_bill_purposes_updated_at ON bill_purposes;
    CREATE TRIGGER trg_bill_purposes_updated_at
      BEFORE UPDATE ON bill_purposes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Name must not be empty constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_bill_purposes_name_not_empty') THEN
    ALTER TABLE bill_purposes
    ADD CONSTRAINT chk_bill_purposes_name_not_empty 
    CHECK (LENGTH(TRIM(name)) > 0);
  END IF;
END $$;
