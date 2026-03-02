-- Function: handle_new_user_signup
-- Called after Supabase Auth creates the auth.users row
-- Creates the account + public.users row together
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  new_account_id uuid;
  account_name text;
  ref_code text;
  referred_by_account uuid;
BEGIN
  -- Extract metadata passed during signUp
  account_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

  -- Generate referral code: first 4 letters of name + 4 random alphanum
  ref_code := UPPER(LEFT(REGEXP_REPLACE(account_name, '[^a-zA-Z]', '', 'g'), 4));
  IF LENGTH(ref_code) < 4 THEN
    ref_code := RPAD(ref_code, 4, 'X');
  END IF;
  ref_code := ref_code || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4));

  -- Ensure referral code is unique (retry up to 5 times)
  WHILE EXISTS (SELECT 1 FROM accounts WHERE referral_code = ref_code) LOOP
    ref_code := UPPER(LEFT(REGEXP_REPLACE(account_name, '[^a-zA-Z]', '', 'g'), 4));
    IF LENGTH(ref_code) < 4 THEN
      ref_code := RPAD(ref_code, 4, 'X');
    END IF;
    ref_code := ref_code || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4));
  END LOOP;

  -- Check if referred by someone
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
    SELECT id INTO referred_by_account FROM accounts
    WHERE referral_code = NEW.raw_user_meta_data->>'referred_by';
  END IF;

  -- Create account
  INSERT INTO accounts (name, email, referral_code, referred_by)
  VALUES (account_name, NEW.email, ref_code, referred_by_account)
  RETURNING id INTO new_account_id;

  -- Create user linked to account
  INSERT INTO users (id, account_id, role, full_name, email)
  VALUES (NEW.id, new_account_id, 'owner', account_name, NEW.email);

  -- If referred, create referral record
  IF referred_by_account IS NOT NULL THEN
    INSERT INTO referrals (referrer_account_id, referred_account_id, referral_code_used)
    VALUES (referred_by_account, new_account_id, NEW.raw_user_meta_data->>'referred_by');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_signup();
