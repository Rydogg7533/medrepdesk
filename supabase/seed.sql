-- ============================================================
-- SEED DATA — Development Only
-- Run with: supabase db seed
-- ============================================================

-- NOTE: This seed file assumes you've already created a test user
-- via Supabase Auth (Dashboard > Authentication > Add User).
-- Replace the UUIDs below with your actual auth user ID and
-- generated account ID.

-- Step 1: Create test account
-- (In production, account + user creation happens in the signup Edge Function)
INSERT INTO accounts (id, name, email, plan, sub_status, referral_code, escalation_threshold)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Rep Account',
  'demo@medrepdesk.io',
  'solo',
  'trialing',
  'DEMO4X2K',
  3
);

-- Step 2: After creating an auth user in Dashboard, run:
-- INSERT INTO users (id, account_id, role, full_name, email)
-- VALUES ('<YOUR_AUTH_USER_UUID>', '00000000-0000-0000-0000-000000000001', 'owner', 'Demo Rep', 'demo@medrepdesk.io');

-- Step 3: Sample distributors
INSERT INTO distributors (account_id, name, billing_email, default_commission_type, default_commission_rate) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Stryker Orthopaedics', 'billing@stryker-example.com', 'percentage', 25.00),
  ('00000000-0000-0000-0000-000000000001', 'DePuy Synthes', 'ap@depuy-example.com', 'percentage', 22.00),
  ('00000000-0000-0000-0000-000000000001', 'Smith & Nephew', 'invoices@sn-example.com', 'flat', NULL);

UPDATE distributors SET default_flat_amount = 1500.00
WHERE name = 'Smith & Nephew' AND account_id = '00000000-0000-0000-0000-000000000001';

-- Step 4: Sample facilities
INSERT INTO facilities (account_id, is_global, name, facility_type, city, state, phone) VALUES
  (NULL, true, 'Intermountain Medical Center', 'hospital', 'Murray', 'UT', '801-507-7000'),
  (NULL, true, 'University of Utah Hospital', 'hospital', 'Salt Lake City', 'UT', '801-581-2121'),
  ('00000000-0000-0000-0000-000000000001', false, 'Wasatch Surgical Center', 'asc', 'Provo', 'UT', '801-555-0100'),
  ('00000000-0000-0000-0000-000000000001', false, 'Alpine Orthopedic ASC', 'asc', 'Ogden', 'UT', '801-555-0200');

-- Step 5: Sample surgeons
INSERT INTO surgeons (account_id, is_global, full_name, specialty, phone) VALUES
  (NULL, true, 'Dr. Sarah Chen', 'orthopedic', '801-555-1001'),
  (NULL, true, 'Dr. Michael Torres', 'orthopedic', '801-555-1002'),
  ('00000000-0000-0000-0000-000000000001', false, 'Dr. James Wilson', 'spine', '801-555-1003'),
  ('00000000-0000-0000-0000-000000000001', false, 'Dr. Emily Park', 'trauma', '801-555-1004');

-- Step 6: Sample contacts
INSERT INTO contacts (account_id, full_name, role, phone, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Lisa Martinez', 'OR Scheduler', '801-555-2001', 'lisa.m@imc-example.com'),
  ('00000000-0000-0000-0000-000000000001', 'Tom Bradley', 'Billing Manager', '801-555-2002', 'tom.b@imc-example.com'),
  ('00000000-0000-0000-0000-000000000001', 'Jennifer Kim', 'AP Coordinator', '801-555-2003', 'jennifer.k@wasatch-example.com'),
  ('00000000-0000-0000-0000-000000000001', 'Robert Chen', 'Materials Manager', '801-555-2004', 'robert.c@alpine-example.com');

-- Step 7: Sample cases (requires distributor/facility/surgeon IDs from above inserts)
-- These will use auto-generated UUIDs, so we'll reference by name in a real scenario.
-- For seed purposes, we insert with explicit IDs:

DO $$
DECLARE
  v_account_id uuid := '00000000-0000-0000-0000-000000000001';
  v_stryker_id uuid;
  v_depuy_id uuid;
  v_imc_id uuid;
  v_wasatch_id uuid;
  v_chen_id uuid;
  v_torres_id uuid;
BEGIN
  SELECT id INTO v_stryker_id FROM distributors WHERE name = 'Stryker Orthopaedics' AND account_id = v_account_id;
  SELECT id INTO v_depuy_id FROM distributors WHERE name = 'DePuy Synthes' AND account_id = v_account_id;
  SELECT id INTO v_imc_id FROM facilities WHERE name = 'Intermountain Medical Center';
  SELECT id INTO v_wasatch_id FROM facilities WHERE name = 'Wasatch Surgical Center';
  SELECT id INTO v_chen_id FROM surgeons WHERE full_name = 'Dr. Sarah Chen';
  SELECT id INTO v_torres_id FROM surgeons WHERE full_name = 'Dr. Michael Torres';

  -- Case 1: Scheduled for tomorrow
  INSERT INTO cases (account_id, case_number, surgeon_id, facility_id, distributor_id, procedure_type, scheduled_date, scheduled_time, status, case_value)
  VALUES (v_account_id, 'MRD-DEMO-2026-0001', v_chen_id, v_imc_id, v_stryker_id, 'hip', CURRENT_DATE + 1, '07:30', 'scheduled', 18500.00);

  -- Case 2: Completed, waiting for bill sheet
  INSERT INTO cases (account_id, case_number, surgeon_id, facility_id, distributor_id, procedure_type, scheduled_date, scheduled_time, status, case_value)
  VALUES (v_account_id, 'MRD-DEMO-2026-0002', v_torres_id, v_wasatch_id, v_depuy_id, 'knee', CURRENT_DATE - 3, '10:00', 'completed', 22000.00);

  -- Case 3: PO requested, being chased
  INSERT INTO cases (account_id, case_number, surgeon_id, facility_id, distributor_id, procedure_type, scheduled_date, scheduled_time, status, case_value)
  VALUES (v_account_id, 'MRD-DEMO-2026-0003', v_chen_id, v_imc_id, v_stryker_id, 'shoulder', CURRENT_DATE - 10, '14:00', 'po_requested', 15000.00);

  -- Case 4: PO received, awaiting payment
  INSERT INTO cases (account_id, case_number, surgeon_id, facility_id, distributor_id, procedure_type, scheduled_date, scheduled_time, status, case_value)
  VALUES (v_account_id, 'MRD-DEMO-2026-0004', v_torres_id, v_imc_id, v_depuy_id, 'spine', CURRENT_DATE - 30, '08:00', 'po_received', 35000.00);

  -- Case 5: Fully paid
  INSERT INTO cases (account_id, case_number, surgeon_id, facility_id, distributor_id, procedure_type, scheduled_date, scheduled_time, status, case_value)
  VALUES (v_account_id, 'MRD-DEMO-2026-0005', v_chen_id, v_wasatch_id, v_stryker_id, 'knee', CURRENT_DATE - 60, '11:00', 'paid', 20000.00);
END $$;
