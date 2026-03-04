-- Add address and phone columns to distributors
ALTER TABLE distributors ADD COLUMN address text;
ALTER TABLE distributors ADD COLUMN phone text;
