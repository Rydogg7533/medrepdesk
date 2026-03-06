ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reminder_hour integer NOT NULL DEFAULT 20;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS morning_check_hour integer NOT NULL DEFAULT 6;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS case_tomorrow_hours_before integer NOT NULL DEFAULT 24;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS promised_date_grace_days integer NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS po_overdue_grace_days integer NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS commission_overdue_grace_days integer NOT NULL DEFAULT 0;
