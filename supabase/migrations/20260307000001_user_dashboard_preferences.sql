ALTER TABLE users ADD COLUMN dashboard_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
