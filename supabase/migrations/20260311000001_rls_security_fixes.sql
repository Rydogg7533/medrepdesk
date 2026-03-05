-- Fix 1: Add missing RLS policies for po_email_logs
DROP POLICY IF EXISTS "po_email_logs_select" ON po_email_logs;
CREATE POLICY "po_email_logs_select" ON po_email_logs
  FOR SELECT USING (account_id = get_account_id());
DROP POLICY IF EXISTS "po_email_logs_insert" ON po_email_logs;
CREATE POLICY "po_email_logs_insert" ON po_email_logs
  FOR INSERT WITH CHECK (account_id = get_account_id());
DROP POLICY IF EXISTS "po_email_logs_update" ON po_email_logs;
CREATE POLICY "po_email_logs_update" ON po_email_logs
  FOR UPDATE USING (account_id = get_account_id());

-- Fix 2: Replace users_update policy to prevent role/account_id self-promotion
-- Users can only update safe profile fields, not role or account_id
DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM users WHERE id = auth.uid())
    AND account_id = (SELECT account_id FROM users WHERE id = auth.uid())
  );

-- Fix 3: Add WITH CHECK to commissions_update to prevent account_id mutation
DROP POLICY IF EXISTS "commissions_update" ON commissions;
CREATE POLICY "commissions_update" ON commissions
  FOR UPDATE
  USING (account_id = get_account_id() AND get_user_role() = 'owner')
  WITH CHECK (account_id = get_account_id() AND get_user_role() = 'owner');
