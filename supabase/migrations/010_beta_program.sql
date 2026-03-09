-- ============================================================
-- MEDREPDESK — BETA PROGRAM SCHEMA ADDITIONS
-- Migration: 010_beta_program.sql
-- ============================================================

CREATE TABLE beta_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by text NOT NULL DEFAULT 'admin',
  assigned_to_name text,
  assigned_to_email text,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  used_by_signup_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE beta_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  specialty text CHECK (specialty IN ('orthopedic','spine','trauma','sports_med','general_surgery','cardiovascular','neuro','other')),
  years_experience integer,
  territory text,
  distributor_names text,
  cases_per_month text CHECK (cases_per_month IN ('under_10','10_to_25','25_to_50','over_50')),
  current_tools text,
  biggest_pain_point text,
  invite_code text NOT NULL,
  invite_code_id uuid REFERENCES beta_invite_codes(id),
  referred_by_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','active','completed','churned')),
  approved_at timestamptz,
  approved_by text,
  rejection_reason text,
  tier text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold')),
  tier_achieved text CHECK (tier_achieved IN ('bronze','silver','gold')),
  tier_achieved_at timestamptz,
  onboarding_done boolean NOT NULL DEFAULT false,
  onboarding_done_at timestamptz,
  cases_logged integer NOT NULL DEFAULT 0,
  five_cases_done boolean NOT NULL DEFAULT false,
  five_cases_done_at timestamptz,
  feedback_count integer NOT NULL DEFAULT 0,
  three_feedbacks_done boolean NOT NULL DEFAULT false,
  three_feedbacks_done_at timestamptz,
  testimonial_done boolean NOT NULL DEFAULT false,
  testimonial_type text CHECK (testimonial_type IN ('video','review','written')),
  testimonial_url text,
  testimonial_done_at timestamptz,
  free_months_earned integer NOT NULL DEFAULT 0,
  reward_applied boolean NOT NULL DEFAULT false,
  reward_applied_at timestamptz,
  app_account_id uuid REFERENCES accounts(id),
  discord_username text,
  discord_joined boolean NOT NULL DEFAULT false,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beta_signup_id uuid REFERENCES beta_signups(id),
  reporter_name text NOT NULL,
  reporter_email text NOT NULL,
  title text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('critical','high','medium','low')),
  category text NOT NULL CHECK (category IN ('auth','cases','purchase_orders','commissions','communications','contacts','notifications','ai_features','pwa_install','performance','ui_ux','other')),
  description text NOT NULL,
  steps_to_reproduce text NOT NULL,
  expected_behavior text NOT NULL,
  actual_behavior text NOT NULL,
  device_type text CHECK (device_type IN ('iphone','android','ipad','desktop','other')),
  os_version text,
  browser text,
  app_version text,
  screenshot_urls text[],
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','triaged','in_progress','fixed','wont_fix','needs_info','duplicate','closed')),
  priority text CHECK (priority IN ('p0','p1','p2','p3')),
  assigned_to text,
  fix_version text,
  resolution_notes text,
  counts_toward_tier boolean NOT NULL DEFAULT true,
  triaged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beta_signup_id uuid REFERENCES beta_signups(id),
  submitter_name text NOT NULL,
  submitter_email text NOT NULL,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('cases','purchase_orders','commissions','communications','contacts','dashboard','ai_features','notifications','mobile_ux','reporting','integrations','other')),
  description text NOT NULL,
  problem_being_solved text NOT NULL,
  use_case text,
  priority_for_user text CHECK (priority_for_user IN ('nice_to_have','would_use_often','blocking_my_workflow')),
  upvote_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','planned','in_progress','shipped','declined','deferred')),
  admin_response text,
  planned_version text,
  counts_toward_tier boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feature_request_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id uuid NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  beta_signup_id uuid NOT NULL REFERENCES beta_signups(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feature_request_id, beta_signup_id)
);

CREATE TABLE beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beta_signup_id uuid REFERENCES beta_signups(id),
  submitter_name text NOT NULL,
  submitter_email text NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('general','weekly_checkin','ux_feedback','workflow_feedback','praise','concern')),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  subject text,
  content text NOT NULL,
  workflow_area text,
  would_pay_for text,
  nps_score integer CHECK (nps_score BETWEEN 0 AND 10),
  counts_toward_tier boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_beta_signups_status ON beta_signups(status);
CREATE INDEX idx_beta_signups_email ON beta_signups(email);
CREATE INDEX idx_beta_signups_invite_code ON beta_signups(invite_code);
CREATE INDEX idx_bug_reports_status ON bug_reports(status, severity);
CREATE INDEX idx_bug_reports_beta_signup ON bug_reports(beta_signup_id);
CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_feature_requests_votes ON feature_requests(upvote_count DESC);
CREATE INDEX idx_beta_feedback_signup ON beta_feedback(beta_signup_id);

CREATE OR REPLACE FUNCTION update_beta_signup_feedback_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE beta_signups
  SET feedback_count = (
    SELECT COUNT(*) FROM (
      SELECT id FROM bug_reports WHERE beta_signup_id = NEW.beta_signup_id AND counts_toward_tier = true
      UNION ALL
      SELECT id FROM feature_requests WHERE beta_signup_id = NEW.beta_signup_id AND counts_toward_tier = true
      UNION ALL
      SELECT id FROM beta_feedback WHERE beta_signup_id = NEW.beta_signup_id AND counts_toward_tier = true
    ) combined
  ),
  updated_at = now()
  WHERE id = NEW.beta_signup_id;

  UPDATE beta_signups
  SET three_feedbacks_done = true,
      three_feedbacks_done_at = now(),
      updated_at = now()
  WHERE id = NEW.beta_signup_id
    AND three_feedbacks_done = false
    AND feedback_count >= 3;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bug_report_feedback_count
AFTER INSERT ON bug_reports
FOR EACH ROW WHEN (NEW.beta_signup_id IS NOT NULL)
EXECUTE FUNCTION update_beta_signup_feedback_count();

CREATE TRIGGER trigger_feature_request_feedback_count
AFTER INSERT ON feature_requests
FOR EACH ROW WHEN (NEW.beta_signup_id IS NOT NULL)
EXECUTE FUNCTION update_beta_signup_feedback_count();

CREATE TRIGGER trigger_general_feedback_count
AFTER INSERT ON beta_feedback
FOR EACH ROW WHEN (NEW.beta_signup_id IS NOT NULL)
EXECUTE FUNCTION update_beta_signup_feedback_count();

ALTER TABLE beta_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "beta_signups_insert" ON beta_signups FOR INSERT WITH CHECK (true);
CREATE POLICY "beta_signups_select_own" ON beta_signups FOR SELECT USING (email = current_setting('request.jwt.claims', true)::jsonb->>'email');
CREATE POLICY "bug_reports_insert" ON bug_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "feature_requests_insert" ON feature_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "feature_requests_select" ON feature_requests FOR SELECT USING (true);
CREATE POLICY "feature_request_votes_insert" ON feature_request_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "feature_request_votes_select" ON feature_request_votes FOR SELECT USING (true);
CREATE POLICY "feature_request_votes_delete" ON feature_request_votes FOR DELETE USING (true);
CREATE POLICY "beta_feedback_insert" ON beta_feedback FOR INSERT WITH CHECK (true);
