-- ============================================
-- Manual backfill for historical initial_balance
-- Based on the original account seed values you found
-- This updates ONLY initial_balance, not current balance
-- IMPORTANT:
-- 1. Replace the UUID below with your real auth.users.id
-- 2. This script is safe for multi-user because it filters by user_id
-- ============================================

-- To find your user_id, run:
-- SELECT id, email FROM auth.users ORDER BY created_at;

-- Replace this value before running:
-- example: '11111111-2222-3333-4444-555555555555'

UPDATE accounts SET initial_balance = 2088456 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'BRI';
UPDATE accounts SET initial_balance = 315406 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'SeaBank';
UPDATE accounts SET initial_balance = 0 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'Bank JAGO';
UPDATE accounts SET initial_balance = 19875 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'DANA';
UPDATE accounts SET initial_balance = 75038 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'GOPAY';
UPDATE accounts SET initial_balance = 8994 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'OVO';
UPDATE accounts SET initial_balance = 4665 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'ShopeePay';
UPDATE accounts SET initial_balance = 170000 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'Cash';
UPDATE accounts SET initial_balance = 0 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'Bibit';
UPDATE accounts SET initial_balance = 0 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'Gotrade';
UPDATE accounts SET initial_balance = 0 WHERE user_id = 'REPLACE_WITH_YOUR_USER_ID' AND name = 'Tring';
