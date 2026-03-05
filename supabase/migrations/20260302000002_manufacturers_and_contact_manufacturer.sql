-- Create manufacturers table
CREATE TABLE IF NOT EXISTS manufacturers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                        text NOT NULL,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- RLS for manufacturers
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manufacturers_select" ON manufacturers;
CREATE POLICY "manufacturers_select" ON manufacturers FOR SELECT USING (account_id = get_account_id());
DROP POLICY IF EXISTS "manufacturers_insert" ON manufacturers;
CREATE POLICY "manufacturers_insert" ON manufacturers FOR INSERT WITH CHECK (account_id = get_account_id());
DROP POLICY IF EXISTS "manufacturers_update" ON manufacturers;
CREATE POLICY "manufacturers_update" ON manufacturers FOR UPDATE USING (account_id = get_account_id());
DROP POLICY IF EXISTS "manufacturers_delete" ON manufacturers;
CREATE POLICY "manufacturers_delete" ON manufacturers FOR DELETE USING (account_id = get_account_id() AND get_user_role() = 'owner');

-- Index
CREATE INDEX IF NOT EXISTS idx_manufacturers_account ON manufacturers(account_id);

-- Add manufacturer_id to contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS manufacturer_id uuid REFERENCES manufacturers(id);
CREATE INDEX IF NOT EXISTS idx_contacts_manufacturer ON contacts(manufacturer_id);
