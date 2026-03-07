CREATE TABLE agent_memory (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  memory_type       text NOT NULL CHECK (memory_type IN (
                      'preference', 'correction', 'shortcut', 'workflow', 'pattern'
                    )),
  key               text NOT NULL,
  value             text NOT NULL,
  source            text NOT NULL DEFAULT 'explicit'
                      CHECK (source IN ('explicit', 'implicit')),
  confidence        numeric(3,2) NOT NULL DEFAULT 1.0
                      CHECK (confidence BETWEEN 0 AND 1),
  use_count         integer NOT NULL DEFAULT 0,
  last_used_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

CREATE INDEX idx_agent_memory_user ON agent_memory(user_id);
CREATE INDEX idx_agent_memory_used ON agent_memory(user_id, last_used_at DESC);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memory_select" ON agent_memory FOR SELECT USING (account_id = get_account_id());
CREATE POLICY "memory_insert" ON agent_memory FOR INSERT WITH CHECK (account_id = get_account_id());
CREATE POLICY "memory_update" ON agent_memory FOR UPDATE USING (account_id = get_account_id());
CREATE POLICY "memory_delete" ON agent_memory FOR DELETE USING (user_id = auth.uid());

-- Memory sweep cron — 11pm Mountain = 5am UTC
SELECT cron.schedule('memory-sweep', '0 5 * * *',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/memory-sweep',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);
