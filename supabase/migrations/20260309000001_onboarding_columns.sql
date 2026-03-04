-- ============================================================
-- Onboarding columns on users table
-- ============================================================

ALTER TABLE users ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN onboarding_step integer NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN address text;
ALTER TABLE users ADD COLUMN city text;
ALTER TABLE users ADD COLUMN state text;
ALTER TABLE users ADD COLUMN zip text;

-- Set existing users as onboarded so they don't get forced into the flow
UPDATE users SET onboarding_completed = true, onboarding_step = 9;
