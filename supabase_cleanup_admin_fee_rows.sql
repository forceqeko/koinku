-- ============================================
-- Cleanup auto-inserted "admin fee" expense rows
-- Run this in Supabase SQL Editor AFTER deploying the atomic RPCs and
-- the updated frontend.
-- ============================================
-- Context:
-- The old frontend code auto-inserted a second "expense" transaction
-- whenever a transfer or saving had an admin_fee > 0. The description
-- always started with "Biaya Admin - " (note the space-dash-space).
-- These rows:
--   - never actually moved money (the source account was already
--     debited by amount + admin_fee on the parent transfer/saving),
--   - duplicated the virtual row shown in the Expense tab,
--   - inflated dashboard & report totals.
--
-- Under the new model (Opsi A), admin_fee stays as a field on the
-- parent row. The virtual row keeps showing the fee in the Expense tab.
-- So we need to remove these orphan rows.
--
-- IMPORTANT:
--   1. Run the PREVIEW query first to see what will be deleted.
--   2. Only run the DELETE after you've reviewed the preview.
--   3. We use soft delete (deleted_at) instead of hard delete so the
--      data is recoverable if anything unexpected shows up.
-- ============================================


-- ─── PREVIEW ─────────────────────────────────
-- Lists every row that would be soft-deleted. Review before the update.
SELECT
  t.id,
  t.date,
  t.type,
  t.description,
  t.amount,
  a.name AS from_account,
  t.created_at
FROM transactions t
LEFT JOIN accounts a ON a.id = t.from_account_id
WHERE t.user_id = auth.uid()
  AND t.type = 'expense'
  AND t.deleted_at IS NULL
  AND t.description LIKE 'Biaya Admin - %'
ORDER BY t.date DESC, t.created_at DESC;


-- ─── CLEANUP (soft delete) ───────────────────
-- Uncomment and run only after reviewing the preview above.
-- If something was deleted by mistake, a superuser can restore by
-- setting deleted_at back to NULL for those ids.
--
-- UPDATE transactions
-- SET deleted_at = NOW(),
--     updated_at = NOW()
-- WHERE user_id = auth.uid()
--   AND type = 'expense'
--   AND deleted_at IS NULL
--   AND description LIKE 'Biaya Admin - %';
