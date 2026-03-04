-- Add billing and contact fields to manufacturers
ALTER TABLE manufacturers ADD COLUMN billing_email text;
ALTER TABLE manufacturers ADD COLUMN billing_contact_name text;
ALTER TABLE manufacturers ADD COLUMN billing_contact_phone text;
ALTER TABLE manufacturers ADD COLUMN phone text;
ALTER TABLE manufacturers ADD COLUMN address text;
