ALTER TABLE cases ADD COLUMN IF NOT EXISTS reminder_offsets integer[] NOT NULL DEFAULT '{24}';
