-- Add billing and contact fields to manufacturers
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS billing_email text;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS billing_contact_name text;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS billing_contact_phone text;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS address text;
