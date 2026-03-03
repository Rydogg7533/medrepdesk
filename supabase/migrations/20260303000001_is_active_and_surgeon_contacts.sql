-- Add is_active to all entity tables
ALTER TABLE contacts ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE facilities ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE distributors ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE manufacturers ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE surgeons ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add surgeon_id to contacts for "Surgeon's Office" contact type
ALTER TABLE contacts ADD COLUMN surgeon_id uuid REFERENCES surgeons(id);
CREATE INDEX idx_contacts_surgeon ON contacts(surgeon_id);

-- Add contact_type column with CHECK constraint
ALTER TABLE contacts ADD COLUMN contact_type text
  CHECK (contact_type IN ('facility', 'distributor', 'manufacturer', 'surgeon_office'));
