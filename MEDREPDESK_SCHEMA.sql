-- ============================================================
-- MEDREPDESK — FULL DATABASE SCHEMA
-- Apply via: supabase db push
-- All migrations should be split into numbered files in production
-- This file is the complete reference schema
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- ACCOUNTS
-- Billing unit. One account per subscription.
-- ============================================================
CREATE TABLE accounts (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text NOT NULL,
  email                       text NOT NULL,
  plan                        text NOT NULL DEFAULT 'solo'
                                CHECK (plan IN ('solo', 'assistant', 'distributorship')),
  sub_status                  text NOT NULL DEFAULT 'trialing'
                                CHECK (sub_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id          text UNIQUE,
  stripe_sub_id               text UNIQUE,
  stripe_connect_id           text UNIQUE,
  referral_code               text UNIQUE NOT NULL,
  referred_by                 uuid REFERENCES accounts(id),
  -- Notification & digest settings
  escalation_threshold        integer NOT NULL DEFAULT 3,
  digest_enabled              boolean NOT NULL DEFAULT true,
  digest_days                 integer[] NOT NULL DEFAULT '{1}',  -- 0=Sun, 1=Mon ... 6=Sat
  digest_time                 text NOT NULL DEFAULT '07:00',
  -- AI usage tracking (reset monthly)
  ai_extractions_this_month   integer NOT NULL DEFAULT 0,
  ai_digest_this_month        integer NOT NULL DEFAULT 0,
  -- Legal consent
  tos_agreed_at               timestamptz,
  tos_ip_address              text,
  privacy_agreed_at           timestamptz,
  -- Timestamps
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- USERS
-- Extends Supabase Auth. One user per auth.users row.
-- ============================================================
CREATE TABLE users (
  id                          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role                        text NOT NULL DEFAULT 'owner'
                                CHECK (role IN ('owner', 'assistant', 'admin')),
  full_name                   text,
  email                       text NOT NULL,
  timezone                    text NOT NULL DEFAULT 'America/Denver',
  -- Notification preferences (JSONB — per-type toggle and delivery method)
  notification_preferences    jsonb NOT NULL DEFAULT '{
    "case_tomorrow": true,
    "follow_up_due": true,
    "promised_date_passed": true,
    "escalation_recommended": true,
    "po_overdue": true,
    "commission_overdue": true,
    "referral_signup": true,
    "payout_sent": true
  }',
  notification_delivery       jsonb NOT NULL DEFAULT '{
    "case_tomorrow": "push",
    "follow_up_due": "push",
    "promised_date_passed": "both",
    "escalation_recommended": "both",
    "po_overdue": "push",
    "commission_overdue": "both",
    "referral_signup": "push",
    "payout_sent": "both"
  }',
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DISTRIBUTORS
-- Companies reps sell for. Private per account.
-- ============================================================
CREATE TABLE distributors (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                        text NOT NULL,
  billing_email               text,
  billing_email_cc            text[],
  billing_contact_name        text,
  billing_contact_phone       text,
  -- Commission defaults
  default_commission_type     text NOT NULL DEFAULT 'percentage'
                                CHECK (default_commission_type IN ('percentage', 'flat')),
  default_commission_rate     numeric(5,2),      -- e.g. 25.00 for 25%
  default_flat_amount         numeric(10,2),     -- if flat rate
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- FACILITIES
-- Hospitals and ASCs. Private per account + global suggestions.
-- ============================================================
CREATE TABLE facilities (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid REFERENCES accounts(id) ON DELETE CASCADE,  -- NULL = global
  is_global                   boolean NOT NULL DEFAULT false,
  name                        text NOT NULL,
  facility_type               text CHECK (facility_type IN ('hospital', 'asc', 'clinic', 'other')),
  address                     text,
  city                        text,
  state                       text,
  phone                       text,
  billing_phone               text,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SURGEONS
-- Surgeons reps work with. Private per account + global suggestions.
-- ============================================================
CREATE TABLE surgeons (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid REFERENCES accounts(id) ON DELETE CASCADE,  -- NULL = global
  is_global                   boolean NOT NULL DEFAULT false,
  full_name                   text NOT NULL,
  specialty                   text,
  primary_facility_id         uuid REFERENCES facilities(id),
  phone                       text,
  email                       text,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CASES
-- Core entity. Every rep interaction flows through a case.
-- ============================================================
CREATE TABLE cases (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  assigned_to                 uuid REFERENCES users(id),
  case_number                 text NOT NULL,   -- MRD-8X2K-2026-0042
  surgeon_id                  uuid REFERENCES surgeons(id),
  facility_id                 uuid REFERENCES facilities(id),
  distributor_id              uuid REFERENCES distributors(id),
  procedure_type              text CHECK (procedure_type IN (
                                'hip', 'knee', 'shoulder', 'spine', 'trauma', 'other'
                              )),
  scheduled_date              date,
  scheduled_time              time,
  status                      text NOT NULL DEFAULT 'scheduled' CHECK (status IN (
                                'scheduled', 'confirmed', 'completed',
                                'bill_sheet_submitted', 'po_requested',
                                'po_received', 'billed', 'paid', 'cancelled'
                              )),
  case_value                  numeric(10,2),
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, case_number)
);

-- ============================================================
-- PURCHASE ORDERS
-- Linked to cases. Full PO lifecycle.
-- ============================================================
CREATE TABLE purchase_orders (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id                     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  facility_id                 uuid REFERENCES facilities(id),
  distributor_id              uuid REFERENCES distributors(id),
  po_number                   text,
  invoice_number              text NOT NULL,
  invoice_date                date,
  amount                      numeric(10,2),
  issue_date                  date,
  expected_payment_date       date,
  received_date               date,
  paid_date                   date,
  status                      text NOT NULL DEFAULT 'not_requested' CHECK (status IN (
                                'not_requested', 'requested', 'pending',
                                'received', 'processing', 'paid', 'disputed'
                              )),
  photo_url                   text,           -- signed URL (generated on demand)
  storage_path                text,           -- permanent storage path
  po_email_sent               boolean NOT NULL DEFAULT false,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PO CHASE LOG
-- Dedicated tracking for pre-PO and PO follow-up workflow.
-- ============================================================
CREATE TABLE po_chase_log (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id                     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  po_id                       uuid REFERENCES purchase_orders(id),  -- NULL until PO exists
  chase_type                  text NOT NULL CHECK (chase_type IN (
                                'bill_sheet_submitted', 'po_requested',
                                'follow_up_call', 'follow_up_email', 'follow_up_text',
                                'po_received', 'escalation', 'note'
                              )),
  -- Contact snapshot at time of chase
  contact_name                text,
  contact_role                text,
  contact_phone               text,
  contact_email               text,
  facility_id                 uuid REFERENCES facilities(id),
  -- Outcome tracking
  outcome                     text,
  promised_date               date,           -- CRITICAL — when they promised PO would arrive
  action_taken                text CHECK (action_taken IN ('call', 'email', 'text', 'in_person', 'note')),
  -- Follow-up scheduling
  next_follow_up              date,
  follow_up_done              boolean NOT NULL DEFAULT false,
  created_by                  uuid REFERENCES users(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COMMUNICATIONS
-- General communication log. Links to case and/or PO.
-- ============================================================
CREATE TABLE communications (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id                     uuid REFERENCES cases(id) ON DELETE SET NULL,
  po_id                       uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  contact_id                  uuid,           -- references contacts(id), set via trigger
  comm_type                   text NOT NULL CHECK (comm_type IN (
                                'call', 'email', 'text', 'in_person', 'voicemail', 'note'
                              )),
  direction                   text CHECK (direction IN ('inbound', 'outbound')),
  contact_name                text,
  contact_role                text,
  subject                     text,
  notes                       text,
  outcome                     text,
  follow_up_date              date,
  follow_up_done              boolean NOT NULL DEFAULT false,
  created_by                  uuid REFERENCES users(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTACTS
-- Rep's relationship network. Links to facilities and distributors.
-- ============================================================
CREATE TABLE contacts (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  full_name                   text NOT NULL,
  role                        text,
  facility_id                 uuid REFERENCES facilities(id),
  distributor_id              uuid REFERENCES distributors(id),
  phone                       text,
  email                       text,
  notes                       text,
  last_contacted_at           timestamptz,    -- auto-updated by trigger
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COMMISSIONS
-- Linked to case and distributor. Auto-created on case completion.
-- ============================================================
CREATE TABLE commissions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id                     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  distributor_id              uuid REFERENCES distributors(id),
  commission_type             text NOT NULL CHECK (commission_type IN ('percentage', 'flat')),
  rate                        numeric(5,2),       -- percentage rate e.g. 25.00
  flat_amount                 numeric(10,2),      -- flat dollar amount
  case_value                  numeric(10,2),      -- snapshot of case value at calculation time
  expected_amount             numeric(10,2),
  received_amount             numeric(10,2),
  expected_date               date,
  received_date               date,
  status                      text NOT NULL DEFAULT 'pending' CHECK (status IN (
                                'pending', 'confirmed', 'received', 'disputed', 'written_off'
                              )),
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- REFERRALS
-- Tracks referrer → referred relationship.
-- ============================================================
CREATE TABLE referrals (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_account_id         uuid NOT NULL REFERENCES accounts(id),
  referred_account_id         uuid REFERENCES accounts(id),   -- set to NULL on account deletion
  referral_code_used          text NOT NULL,
  status                      text NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'expired', 'cancelled')),
  commission_rate             numeric(5,4) NOT NULL DEFAULT 0.25,  -- 25%
  commission_months           integer NOT NULL DEFAULT 12,
  months_paid                 integer NOT NULL DEFAULT 0,
  total_earned                numeric(10,2) NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- REFERRAL PAYOUTS
-- Monthly payout records. One row per referral per month.
-- ============================================================
CREATE TABLE referral_payouts (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id                 uuid NOT NULL REFERENCES referrals(id),
  referrer_account_id         uuid NOT NULL REFERENCES accounts(id),
  period_month                integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year                 integer NOT NULL,
  subscription_amount         numeric(10,2) NOT NULL,
  commission_amount           numeric(10,2) NOT NULL,
  status                      text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'paid', 'failed')),
  stripe_transfer_id          text,
  paid_at                     timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referral_id, period_month, period_year)
);

-- ============================================================
-- NOTIFICATIONS
-- Push notification records.
-- ============================================================
CREATE TABLE notifications (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id                     uuid REFERENCES users(id) ON DELETE CASCADE,
  type                        text NOT NULL CHECK (type IN (
                                'case_tomorrow', 'follow_up_due', 'promised_date_passed',
                                'escalation_recommended', 'po_overdue', 'commission_overdue',
                                'referral_signup', 'payout_sent', 'weekly_digest', 'payment_failed'
                              )),
  title                       text NOT NULL,
  body                        text NOT NULL,
  related_id                  uuid,
  related_type                text,
  is_read                     boolean NOT NULL DEFAULT false,
  sent_at                     timestamptz NOT NULL DEFAULT now(),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PO EMAIL LOGS
-- Audit trail for every PO routing email sent.
-- ============================================================
CREATE TABLE po_email_logs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  po_id                       uuid REFERENCES purchase_orders(id),
  case_id                     uuid REFERENCES cases(id),
  sent_by                     text NOT NULL,   -- rep's email address
  sent_to                     text[] NOT NULL,
  sent_cc                     text[],
  subject                     text NOT NULL,
  body_snapshot               text,
  resend_email_id             text,
  status                      text NOT NULL DEFAULT 'sent'
                                CHECK (status IN ('sent', 'failed', 'bounced')),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CASE DOCUMENTS
-- General file attachments. Links to case and optionally PO.
-- ============================================================
CREATE TABLE case_documents (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id                     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  po_id                       uuid REFERENCES purchase_orders(id),
  document_type               text NOT NULL CHECK (document_type IN (
                                'po_photo', 'bill_sheet', 'invoice', 'contract', 'other'
                              )),
  file_name                   text NOT NULL,
  storage_path                text NOT NULL,
  ai_extracted                boolean NOT NULL DEFAULT false,
  extracted_data              jsonb,
  created_by                  uuid REFERENCES users(id),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AI EXTRACTIONS
-- Quality monitoring for all AI operations.
-- ============================================================
CREATE TABLE ai_extractions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  extraction_type             text NOT NULL CHECK (extraction_type IN (
                                'po_document', 'case_entry', 'commission_check'
                              )),
  input_type                  text CHECK (input_type IN ('image', 'text', 'pdf')),
  storage_path                text,
  raw_response                jsonb,
  extracted_fields            jsonb,
  was_corrected               boolean NOT NULL DEFAULT false,
  correction_notes            text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- Web Push subscription objects per user.
-- ============================================================
CREATE TABLE push_subscriptions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription                jsonb NOT NULL,  -- Web Push subscription object
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS
-- Append-only audit trail. No UPDATE or DELETE policies.
-- ============================================================
CREATE TABLE audit_logs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid REFERENCES accounts(id),
  user_id                     uuid REFERENCES users(id),
  action                      text NOT NULL,   -- INSERT, UPDATE, DELETE
  table_name                  text NOT NULL,
  record_id                   uuid NOT NULL,
  old_values                  jsonb,
  new_values                  jsonb,
  ip_address                  text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

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

-- ============================================================
-- DATABASE TRIGGERS
-- ============================================================

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

CREATE TRIGGER trigger_po_paid
AFTER UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION advance_case_on_payment();

-- Trigger 5: Advance case to 'billed' when PO emailed to distributor
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

CREATE TRIGGER trigger_po_emailed
AFTER UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION advance_case_on_po_emailed();

-- Trigger 7: Auto-update contact last_contacted_at
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

CREATE TRIGGER trigger_update_last_contacted
AFTER INSERT ON communications
FOR EACH ROW EXECUTE FUNCTION update_contact_last_contacted();

-- Trigger 8: Audit log function (applied to sensitive tables)
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

CREATE TRIGGER audit_cases
  AFTER INSERT OR UPDATE OR DELETE ON cases
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_commissions
  AFTER INSERT OR UPDATE OR DELETE ON commissions
  FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

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

-- Standard account-scoped policies (applied to most tables)
-- Pattern: SELECT/INSERT/UPDATE all accounts, DELETE owner only

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

-- AUDIT LOGS (read only — no insert/update/delete for regular users)
CREATE POLICY "audit_select" ON audit_logs FOR SELECT USING (account_id = get_account_id() AND get_user_role() = 'owner');

-- ============================================================
-- SCHEDULED JOBS (pg_cron)
-- Run as Supabase Edge Functions
-- ============================================================

-- Nightly reminders — 8pm Mountain = 2am UTC
SELECT cron.schedule('nightly-reminders', '0 2 * * *',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/nightly-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);

-- Morning checks — 6am Mountain = 12pm UTC
SELECT cron.schedule('morning-checks', '0 12 * * *',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/morning-checks',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);

-- Commission checks — 7am Mountain = 1pm UTC
SELECT cron.schedule('commission-checks', '0 13 * * *',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/commission-checks',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);

-- Monthly payouts — 1st of month 2am Mountain = 8am UTC
SELECT cron.schedule('monthly-payouts', '0 8 1 * *',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/monthly-payouts',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);

-- Weekly digest — Sunday 8pm Mountain = 2am UTC Monday
SELECT cron.schedule('weekly-digest', '0 2 * * 1',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/weekly-digest',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);
