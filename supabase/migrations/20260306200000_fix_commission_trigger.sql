-- Remove commission auto-confirm from advance_case_on_payment trigger
-- Commission should stay 'pending' until rep manually marks received
CREATE OR REPLACE FUNCTION advance_case_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE cases
    SET status = 'paid', updated_at = now()
    WHERE id = NEW.case_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
