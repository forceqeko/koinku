-- ============================================
-- Fitur Hutang & Piutang SQL Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Tabel Utama Hutang/Piutang
CREATE TABLE IF NOT EXISTS debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hutang', 'piutang')),
  counterparty TEXT NOT NULL,
  principal_amount NUMERIC NOT NULL CHECK (principal_amount > 0),
  interest_rate NUMERIC NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  tenor_months INTEGER CHECK (tenor_months > 0),
  start_date DATE NOT NULL,
  due_date DATE,
  notes TEXT,
  is_settled BOOLEAN NOT NULL DEFAULT false,
  settled_at TIMESTAMPTZ,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pembayaran/Cicilan Hutang
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  notes TEXT,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own debts" ON debts;
CREATE POLICY "Users can manage own debts"
  ON debts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own debt payments" ON debt_payments;
CREATE POLICY "Users can manage own debt payments"
  ON debt_payments FOR ALL USING (auth.uid() = user_id);

-- Trigger untuk updated_at
DROP TRIGGER IF EXISTS trg_debts_updated_at ON debts;
CREATE TRIGGER trg_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
