-- Trigger: Send referral_signup notification when a new referral record is created.
-- Fires after INSERT on referrals table.

CREATE OR REPLACE FUNCTION notify_referral_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_owner_id uuid;
  referred_name text;
BEGIN
  -- Get the referrer's owner user
  SELECT id INTO referrer_owner_id
  FROM users
  WHERE account_id = NEW.referrer_account_id AND role = 'owner'
  LIMIT 1;

  IF referrer_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the referred account name
  SELECT name INTO referred_name
  FROM accounts
  WHERE id = NEW.referred_account_id;

  -- Insert notification
  INSERT INTO notifications (account_id, user_id, type, title, body)
  VALUES (
    NEW.referrer_account_id,
    referrer_owner_id,
    'referral_signup',
    'New referral signup!',
    COALESCE(referred_name, 'Someone') || ' signed up using your referral code.'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_referral_signup_notification
  AFTER INSERT ON referrals
  FOR EACH ROW EXECUTE FUNCTION notify_referral_signup();
