-- NOTIFICATIONS
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

-- PO EMAIL LOGS
CREATE TABLE po_email_logs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  po_id                       uuid REFERENCES purchase_orders(id),
  case_id                     uuid REFERENCES cases(id),
  sent_by                     text NOT NULL,
  sent_to                     text[] NOT NULL,
  sent_cc                     text[],
  subject                     text NOT NULL,
  body_snapshot               text,
  resend_email_id             text,
  status                      text NOT NULL DEFAULT 'sent'
                                CHECK (status IN ('sent', 'failed', 'bounced')),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- CASE DOCUMENTS
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

-- AI EXTRACTIONS
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

-- PUSH SUBSCRIPTIONS
CREATE TABLE push_subscriptions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription                jsonb NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid REFERENCES accounts(id),
  user_id                     uuid REFERENCES users(id),
  action                      text NOT NULL,
  table_name                  text NOT NULL,
  record_id                   uuid NOT NULL,
  old_values                  jsonb,
  new_values                  jsonb,
  ip_address                  text,
  created_at                  timestamptz NOT NULL DEFAULT now()
);
