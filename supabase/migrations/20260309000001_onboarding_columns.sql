-- ============================================================
-- Onboarding columns on users table
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS zip text;

-- Set existing users as onboarded so they don't get forced into the flow
UPDATE users SET onboarding_completed = true, onboarding_step = 9
WHERE onboarding_completed = false;
