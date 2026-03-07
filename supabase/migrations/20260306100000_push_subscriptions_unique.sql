-- Add unique constraint on user_id for push_subscriptions upsert
ALTER TABLE push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_key UNIQUE (user_id);
