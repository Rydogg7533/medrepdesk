-- Add is_archived column to entity tables
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE surgeons ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
