-- Add voice minutes tracking to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS voice_minutes_this_month numeric(8,2) NOT NULL DEFAULT 0;

-- RPC to atomically increment voice minutes
CREATE OR REPLACE FUNCTION increment_voice_minutes(p_account_id uuid, p_minutes numeric)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE accounts
  SET voice_minutes_this_month = voice_minutes_this_month + p_minutes
  WHERE id = p_account_id;
$$;

-- Reset voice minutes on 1st of each month (8am UTC)
SELECT cron.schedule(
  'reset-voice-minutes',
  '0 8 1 * *',
  $$UPDATE accounts SET voice_minutes_this_month = 0$$
);
