ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
