-- Add missing columns to manufacturers table
ALTER TABLE manufacturers ADD COLUMN phone text;
ALTER TABLE manufacturers ADD COLUMN address text;
ALTER TABLE manufacturers ADD COLUMN billing_contact_name text;
ALTER TABLE manufacturers ADD COLUMN billing_contact_phone text;
