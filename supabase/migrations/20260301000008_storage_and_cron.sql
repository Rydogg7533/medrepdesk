-- Storage bucket for case documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-documents',
  'case-documents',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "case_docs_select" ON storage.objects;
CREATE POLICY "case_docs_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1]::uuid = get_account_id()
  );

DROP POLICY IF EXISTS "case_docs_insert" ON storage.objects;
CREATE POLICY "case_docs_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1]::uuid = get_account_id()
  );

DROP POLICY IF EXISTS "case_docs_delete" ON storage.objects;
CREATE POLICY "case_docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'case-documents'
    AND (storage.foldername(name))[1]::uuid = get_account_id()
  );

-- Scheduled jobs (pg_cron)

-- Nightly reminders — 8pm Mountain = 2am UTC
SELECT cron.schedule('nightly-reminders', '0 2 * * *',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/nightly-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);

-- Morning checks — 6am Mountain = 12pm UTC
SELECT cron.schedule('morning-checks', '0 12 * * *',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/morning-checks',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);

-- Commission checks — 7am Mountain = 1pm UTC
SELECT cron.schedule('commission-checks', '0 13 * * *',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/commission-checks',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);

-- Monthly payouts — 1st of month 2am Mountain = 8am UTC
SELECT cron.schedule('monthly-payouts', '0 8 1 * *',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/monthly-payouts',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);

-- Weekly digest — Sunday 8pm Mountain = 2am UTC Monday
SELECT cron.schedule('weekly-digest', '0 2 * * 1',
  $$SELECT net.http_post(url := current_setting('app.edge_function_url') || '/weekly-digest',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')))$$
);
