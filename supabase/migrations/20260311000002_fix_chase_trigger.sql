-- Fix: Only 'po_requested' chase_type should advance case to po_requested status.
-- Previously follow_up_call/email/text also triggered this, causing premature status advancement.
CREATE OR REPLACE FUNCTION advance_case_on_po_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chase_type = 'po_requested' THEN
    UPDATE cases
    SET status = 'po_requested', updated_at = now()
    WHERE id = NEW.case_id AND status = 'bill_sheet_submitted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
