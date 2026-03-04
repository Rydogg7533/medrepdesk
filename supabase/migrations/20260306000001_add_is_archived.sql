-- Add is_archived column to entity tables
ALTER TABLE contacts ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE facilities ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE manufacturers ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE surgeons ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
