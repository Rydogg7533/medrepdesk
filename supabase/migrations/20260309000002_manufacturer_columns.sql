-- Add missing columns to manufacturers table
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS billing_contact_name text;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS billing_contact_phone text;
