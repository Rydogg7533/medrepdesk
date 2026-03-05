-- Add address and phone columns to distributors
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS phone text;
