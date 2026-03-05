-- COMMUNICATIONS
CREATE TABLE IF NOT EXISTS communications (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id                     uuid REFERENCES cases(id) ON DELETE SET NULL,
  po_id                       uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  contact_id                  uuid,
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

-- CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  full_name                   text NOT NULL,
  role                        text,
  facility_id                 uuid REFERENCES facilities(id),
  distributor_id              uuid REFERENCES distributors(id),
  phone                       text,
  email                       text,
  notes                       text,
  last_contacted_at           timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- COMMISSIONS
CREATE TABLE IF NOT EXISTS commissions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  case_id                     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  distributor_id              uuid REFERENCES distributors(id),
  commission_type             text NOT NULL CHECK (commission_type IN ('percentage', 'flat')),
  rate                        numeric(5,2),
  flat_amount                 numeric(10,2),
  case_value                  numeric(10,2),
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

-- REFERRALS
CREATE TABLE IF NOT EXISTS referrals (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_account_id         uuid NOT NULL REFERENCES accounts(id),
  referred_account_id         uuid REFERENCES accounts(id),
  referral_code_used          text NOT NULL,
  status                      text NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'expired', 'cancelled')),
  commission_rate             numeric(5,4) NOT NULL DEFAULT 0.25,
  commission_months           integer NOT NULL DEFAULT 12,
  months_paid                 integer NOT NULL DEFAULT 0,
  total_earned                numeric(10,2) NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- REFERRAL PAYOUTS
CREATE TABLE IF NOT EXISTS referral_payouts (
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
