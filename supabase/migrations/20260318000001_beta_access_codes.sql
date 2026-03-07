-- Beta access codes table
CREATE TABLE beta_access_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  email       text,
  plan        text,
  used_by     uuid REFERENCES accounts(id),
  used_at     timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  max_uses    integer NOT NULL DEFAULT 1,
  use_count   integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS — no public access (service role only)
ALTER TABLE beta_access_codes ENABLE ROW LEVEL SECURITY;

-- Add access_code_used column to accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS beta_code_used text;

-- RPC to increment use count
CREATE OR REPLACE FUNCTION increment_beta_code_use(p_code text)
RETURNS void AS $$
  UPDATE beta_access_codes
  SET use_count = use_count + 1
  WHERE code = p_code;
$$ LANGUAGE sql SECURITY DEFINER;

-- Seed initial beta codes
INSERT INTO beta_access_codes (code, max_uses) VALUES
  ('MEDREPBETA1', 50),
  ('MEDREPBETA2', 50),
  ('MEDREPBETA3', 50);
