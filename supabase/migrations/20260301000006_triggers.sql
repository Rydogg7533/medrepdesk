-- Trigger 1: Advance case status when bill sheet submitted
CREATE OR REPLACE FUNCTION advance_case_on_bill_sheet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chase_type = 'bill_sheet_submitted' THEN
    UPDATE cases
    SET status = 'bill_sheet_submitted', updated_at = now()
    WHERE id = NEW.case_id AND status = 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bill_sheet_submitted ON po_chase_log;
CREATE TRIGGER trigger_bill_sheet_submitted
AFTER INSERT ON po_chase_log
FOR EACH ROW EXECUTE FUNCTION advance_case_on_bill_sheet();

-- Trigger 2: Advance case status when PO first requested
CREATE OR REPLACE FUNCTION advance_case_on_po_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chase_type IN ('follow_up_call', 'follow_up_email', 'follow_up_text', 'po_requested') THEN
    UPDATE cases
    SET status = 'po_requested', updated_at = now()
    WHERE id = NEW.case_id AND status = 'bill_sheet_submitted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_po_requested ON po_chase_log;
CREATE TRIGGER trigger_po_requested
AFTER INSERT ON po_chase_log
FOR EACH ROW EXECUTE FUNCTION advance_case_on_po_request();

-- Trigger 3: Advance case and clear follow-ups when PO received
CREATE OR REPLACE FUNCTION advance_case_on_po_received()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    UPDATE cases
    SET status = 'po_received', updated_at = now()
    WHERE id = NEW.case_id;

    UPDATE po_chase_log
    SET follow_up_done = true, updated_at = now()
    WHERE case_id = NEW.case_id AND follow_up_done = false;

    UPDATE communications
    SET follow_up_done = true, updated_at = now()
    WHERE case_id = NEW.case_id AND follow_up_done = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_po_received ON purchase_orders;
CREATE TRIGGER trigger_po_received
AFTER UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION advance_case_on_po_received();

-- Trigger 4: Advance case and confirm commission when PO paid
CREATE OR REPLACE FUNCTION advance_case_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE cases
    SET status = 'paid', updated_at = now()
    WHERE id = NEW.case_id;

    UPDATE commissions
    SET status = 'confirmed', updated_at = now()
    WHERE case_id = NEW.case_id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_po_paid ON purchase_orders;
CREATE TRIGGER trigger_po_paid
AFTER UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION advance_case_on_payment();

-- Trigger 5: Auto-update contact last_contacted_at
CREATE OR REPLACE FUNCTION update_contact_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    UPDATE contacts
    SET last_contacted_at = NEW.created_at, updated_at = now()
    WHERE id = NEW.contact_id::uuid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_contacted ON communications;
CREATE TRIGGER trigger_update_last_contacted
AFTER INSERT ON communications
FOR EACH ROW EXECUTE FUNCTION update_contact_last_contacted();

-- Trigger 6: Audit log function (applied to sensitive tables)
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    account_id, user_id, action, table_name, record_id, old_values, new_values
  ) VALUES (
    COALESCE(NEW.account_id, OLD.account_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_cases ON cases;
CREATE TRIGGER audit_cases
  AFTER INSERT OR UPDATE OR DELETE ON cases
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;
CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION log_audit();

DROP TRIGGER IF EXISTS audit_commissions ON commissions;
CREATE TRIGGER audit_commissions
  AFTER INSERT OR UPDATE OR DELETE ON commissions
  FOR EACH ROW EXECUTE FUNCTION log_audit();
