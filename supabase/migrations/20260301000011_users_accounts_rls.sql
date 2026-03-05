-- Users: can read/update own rows within the same account
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users
  FOR SELECT USING (account_id = get_account_id());

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users
  FOR UPDATE USING (id = auth.uid());

-- Accounts: can read own account, owner can update
DROP POLICY IF EXISTS "accounts_select" ON accounts;
CREATE POLICY "accounts_select" ON accounts
  FOR SELECT USING (id = get_account_id());

DROP POLICY IF EXISTS "accounts_update" ON accounts;
CREATE POLICY "accounts_update" ON accounts
  FOR UPDATE USING (id = get_account_id() AND get_user_role() = 'owner');
