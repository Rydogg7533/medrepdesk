-- CASES
CREATE TABLE cases (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  assigned_to                 uuid REFERENCES users(id),
  case_number                 text NOT NULL,
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

-- PURCHASE ORDERS
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
  photo_url                   text,
  storage_path                text,
  po_email_sent               boolean NOT NULL DEFAULT false,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- PO CHASE LOG
CREATE TABLE po_chase_log (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id                     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  po_id                       uuid REFERENCES purchase_orders(id),
  chase_type                  text NOT NULL CHECK (chase_type IN (
                                'bill_sheet_submitted', 'po_requested',
                                'follow_up_call', 'follow_up_email', 'follow_up_text',
                                'po_received', 'escalation', 'note'
                              )),
  contact_name                text,
  contact_role                text,
  contact_phone               text,
  contact_email               text,
  facility_id                 uuid REFERENCES facilities(id),
  outcome                     text,
  promised_date               date,
  action_taken                text CHECK (action_taken IN ('call', 'email', 'text', 'in_person', 'note')),
  next_follow_up              date,
  follow_up_done              boolean NOT NULL DEFAULT false,
  created_by                  uuid REFERENCES users(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
