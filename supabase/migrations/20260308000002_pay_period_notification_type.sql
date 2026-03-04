-- ============================================================
-- Add 'pay_period_closed' to notifications type CHECK constraint
-- ============================================================

-- Drop existing constraint and recreate with new type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'case_tomorrow', 'follow_up_due', 'promised_date_passed',
  'escalation_recommended', 'po_overdue', 'commission_overdue',
  'referral_signup', 'payout_sent', 'weekly_digest', 'payment_failed',
  'pay_period_closed'
));
