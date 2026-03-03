-- Create manufacturers table
CREATE TABLE manufacturers (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name                        text NOT NULL,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- RLS for manufacturers
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manufacturers_select" ON manufacturers FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "manufacturers_insert" ON manufacturers FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "manufacturers_update" ON manufacturers FOR UPDATE USING (account_id = get_account_id());
CREATE POLICY "manufacturers_delete" ON manufacturers FOR DELETE USING (account_id = get_account_id() AND get_user_role() = 'owner');

-- Index
CREATE INDEX idx_manufacturers_account ON manufacturers(account_id);

-- Add manufacturer_id to contacts
ALTER TABLE contacts ADD COLUMN manufacturer_id uuid REFERENCES manufacturers(id);
CREATE INDEX idx_contacts_manufacturer ON contacts(manufacturer_id);
