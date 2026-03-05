-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ACCOUNTS
CREATE TABLE IF NOT EXISTS accounts (
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
  escalation_threshold        integer NOT NULL DEFAULT 3,
  digest_enabled              boolean NOT NULL DEFAULT true,
  digest_days                 integer[] NOT NULL DEFAULT '{1}',
  digest_time                 text NOT NULL DEFAULT '07:00',
  ai_extractions_this_month   integer NOT NULL DEFAULT 0,
  ai_digest_this_month        integer NOT NULL DEFAULT 0,
  tos_agreed_at               timestamptz,
  tos_ip_address              text,
  privacy_agreed_at           timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id                          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role                        text NOT NULL DEFAULT 'owner'
                                CHECK (role IN ('owner', 'assistant', 'admin')),
  full_name                   text,
  email                       text NOT NULL,
  timezone                    text NOT NULL DEFAULT 'America/Denver',
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

-- DISTRIBUTORS
CREATE TABLE IF NOT EXISTS distributors (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                        text NOT NULL,
  billing_email               text,
  billing_email_cc            text[],
  billing_contact_name        text,
  billing_contact_phone       text,
  default_commission_type     text NOT NULL DEFAULT 'percentage'
                                CHECK (default_commission_type IN ('percentage', 'flat')),
  default_commission_rate     numeric(5,2),
  default_flat_amount         numeric(10,2),
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- FACILITIES
CREATE TABLE IF NOT EXISTS facilities (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid REFERENCES accounts(id) ON DELETE CASCADE,
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

-- SURGEONS
CREATE TABLE IF NOT EXISTS surgeons (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid REFERENCES accounts(id) ON DELETE CASCADE,
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
