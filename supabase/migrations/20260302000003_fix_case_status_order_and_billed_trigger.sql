-- Fix case status CHECK constraint to correct pipeline order:
-- po_received comes BEFORE billed (receive PO, then send to distributor = billed)
ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_status_check;
ALTER TABLE cases ADD CONSTRAINT cases_status_check CHECK (status IN (
  'scheduled', 'confirmed', 'completed',
  'bill_sheet_submitted', 'po_requested',
  'po_received', 'billed', 'paid', 'cancelled'
));

-- Trigger: Advance case to 'billed' when po_email_sent is set to true on a purchase order
CREATE OR REPLACE FUNCTION advance_case_on_po_emailed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_email_sent = true AND (OLD.po_email_sent = false OR OLD.po_email_sent IS NULL) THEN
    UPDATE cases
    SET status = 'billed', updated_at = now()
    WHERE id = NEW.case_id AND status = 'po_received';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_po_emailed ON purchase_orders;
CREATE TRIGGER trigger_po_emailed
AFTER UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION advance_case_on_po_emailed();
