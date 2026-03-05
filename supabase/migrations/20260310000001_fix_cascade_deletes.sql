-- Fix foreign keys that block case deletion.
-- po_email_logs.case_id and po_email_logs.po_id had no ON DELETE clause (defaults to RESTRICT).
-- po_chase_log.po_id had no ON DELETE clause (defaults to RESTRICT).
-- This caused cascading delete of cases to fail when related POs or email logs existed.

-- po_email_logs.case_id → SET NULL (email log is audit data, keep it but unlink)
ALTER TABLE po_email_logs DROP CONSTRAINT IF EXISTS po_email_logs_case_id_fkey;
ALTER TABLE po_email_logs
  ADD CONSTRAINT po_email_logs_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL;

-- po_email_logs.po_id → SET NULL (keep audit trail, unlink PO)
ALTER TABLE po_email_logs DROP CONSTRAINT IF EXISTS po_email_logs_po_id_fkey;
ALTER TABLE po_email_logs
  ADD CONSTRAINT po_email_logs_po_id_fkey
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;

-- po_chase_log.po_id → SET NULL (chase log stays, PO reference cleared)
ALTER TABLE po_chase_log DROP CONSTRAINT IF EXISTS po_chase_log_po_id_fkey;
ALTER TABLE po_chase_log
  ADD CONSTRAINT po_chase_log_po_id_fkey
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
