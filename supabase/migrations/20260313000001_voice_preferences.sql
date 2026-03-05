-- Add voice_preferences JSONB column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_preferences jsonb
  DEFAULT '{"assistant_name": "Max", "voice_index": 0, "speaking_rate": 1.0, "confirmation_style": "brief", "enabled": true}'::jsonb;
