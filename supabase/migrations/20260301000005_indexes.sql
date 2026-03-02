-- Cases
CREATE INDEX idx_cases_account_status ON cases(account_id, status);
CREATE INDEX idx_cases_scheduled_date ON cases(scheduled_date);
CREATE INDEX idx_cases_account_date ON cases(account_id, scheduled_date);
CREATE INDEX idx_cases_case_number ON cases(case_number);

-- Purchase Orders
CREATE INDEX idx_pos_account_status ON purchase_orders(account_id, status);
CREATE INDEX idx_pos_case_id ON purchase_orders(case_id);
CREATE INDEX idx_pos_invoice_number ON purchase_orders(invoice_number);
CREATE INDEX idx_pos_po_number ON purchase_orders(po_number);
CREATE INDEX idx_pos_expected_payment ON purchase_orders(expected_payment_date);

-- PO Chase Log
CREATE INDEX idx_chase_case_id ON po_chase_log(case_id);
CREATE INDEX idx_chase_follow_up ON po_chase_log(next_follow_up, follow_up_done);
CREATE INDEX idx_chase_promised_date ON po_chase_log(promised_date, follow_up_done);

-- Communications
CREATE INDEX idx_comms_case_id ON communications(case_id);
CREATE INDEX idx_comms_follow_up ON communications(follow_up_date, follow_up_done);
CREATE INDEX idx_comms_account ON communications(account_id);

-- Commissions
CREATE INDEX idx_commissions_account_status ON commissions(account_id, status);
CREATE INDEX idx_commissions_case_id ON commissions(case_id);
CREATE INDEX idx_commissions_expected_date ON commissions(expected_date);

-- Referrals
CREATE INDEX idx_referrals_referrer ON referrals(referrer_account_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_account_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_account ON notifications(account_id);

-- Contacts
CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_contacts_facility ON contacts(facility_id);
