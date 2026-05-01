-- ============================================
-- Add initial_balance to accounts
-- Run this in Supabase SQL Editor
-- ============================================

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS initial_balance NUMERIC DEFAULT NULL;

UPDATE accounts
SET initial_balance = balance
WHERE initial_balance IS NULL;

ALTER TABLE accounts
ALTER COLUMN initial_balance SET DEFAULT 0;
