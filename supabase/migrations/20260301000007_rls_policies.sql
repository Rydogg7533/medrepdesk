-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_chase_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's account_id
CREATE OR REPLACE FUNCTION get_account_id()
RETURNS uuid AS $$
  SELECT account_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- CASES
CREATE POLICY "cases_select" ON cases FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "cases_insert" ON cases FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "cases_update" ON cases FOR UPDATE USING (account_id = get_account_id());
CREATE POLICY "cases_delete" ON cases FOR DELETE USING (account_id = get_account_id() AND get_user_role() = 'owner');

-- PURCHASE ORDERS
CREATE POLICY "pos_select" ON purchase_orders FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "pos_insert" ON purchase_orders FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "pos_update" ON purchase_orders FOR UPDATE USING (account_id = get_account_id());
CREATE POLICY "pos_delete" ON purchase_orders FOR DELETE USING (account_id = get_account_id() AND get_user_role() = 'owner');

-- PO CHASE LOG
CREATE POLICY "chase_select" ON po_chase_log FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "chase_insert" ON po_chase_log FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "chase_update" ON po_chase_log FOR UPDATE USING (account_id = get_account_id());

-- COMMUNICATIONS
CREATE POLICY "comms_select" ON communications FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "comms_insert" ON communications FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "comms_update" ON communications FOR UPDATE USING (account_id = get_account_id());

-- CONTACTS
CREATE POLICY "contacts_select" ON contacts FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (account_id = get_account_id());
CREATE POLICY "contacts_delete" ON contacts FOR DELETE USING (account_id = get_account_id() AND get_user_role() = 'owner');

-- DISTRIBUTORS
CREATE POLICY "distributors_select" ON distributors FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "distributors_insert" ON distributors FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "distributors_update" ON distributors FOR UPDATE USING (account_id = get_account_id());
CREATE POLICY "distributors_delete" ON distributors FOR DELETE USING (account_id = get_account_id() AND get_user_role() = 'owner');

-- FACILITIES (global readable by all, private scoped to account)
CREATE POLICY "facilities_select" ON facilities FOR SELECT USING (is_global = true OR account_id = get_account_id());
CREATE POLICY "facilities_insert" ON facilities FOR INSERT WITH CHECK (is_global = false AND account_id = get_account_id());
CREATE POLICY "facilities_update" ON facilities FOR UPDATE USING (account_id = get_account_id() AND is_global = false);

-- SURGEONS (same pattern as facilities)
CREATE POLICY "surgeons_select" ON surgeons FOR SELECT USING (is_global = true OR account_id = get_account_id());
CREATE POLICY "surgeons_insert" ON surgeons FOR INSERT WITH CHECK (is_global = false AND account_id = get_account_id());
CREATE POLICY "surgeons_update" ON surgeons FOR UPDATE USING (account_id = get_account_id() AND is_global = false);

-- COMMISSIONS (owner only for modifications)
CREATE POLICY "commissions_select" ON commissions FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "commissions_insert" ON commissions FOR INSERT WITH CHECK (account_id = get_account_id() AND get_user_role() = 'owner');
CREATE POLICY "commissions_update" ON commissions FOR UPDATE USING (account_id = get_account_id() AND get_user_role() = 'owner');

-- REFERRALS (owner only)
CREATE POLICY "referrals_select" ON referrals FOR SELECT USING (referrer_account_id = get_account_id() AND get_user_role() = 'owner');
CREATE POLICY "referrals_insert" ON referrals FOR INSERT WITH CHECK (get_user_role() = 'owner');

-- REFERRAL PAYOUTS (owner only)
CREATE POLICY "payouts_select" ON referral_payouts FOR SELECT USING (referrer_account_id = get_account_id() AND get_user_role() = 'owner');

-- NOTIFICATIONS
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- PUSH SUBSCRIPTIONS
CREATE POLICY "push_select" ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_insert" ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_delete" ON push_subscriptions FOR DELETE USING (user_id = auth.uid());

-- CASE DOCUMENTS
CREATE POLICY "docs_select" ON case_documents FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "docs_insert" ON case_documents FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "docs_delete" ON case_documents FOR DELETE USING (account_id = get_account_id() AND get_user_role() = 'owner');

-- AI EXTRACTIONS
CREATE POLICY "ai_select" ON ai_extractions FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "ai_insert" ON ai_extractions FOR INSERT WITH CHECK (account_id = get_account_id());

-- AUDIT LOGS (read only)
CREATE POLICY "audit_select" ON audit_logs FOR SELECT USING (account_id = get_account_id() AND get_user_role() = 'owner');
