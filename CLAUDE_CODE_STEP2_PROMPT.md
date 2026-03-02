# CLAUDE CODE — MedRepDesk Step 2: Auth Layer

## CONTEXT
MedRepDesk is a React + Vite PWA. Step 1 is complete — project scaffolded, Supabase connected, all 19 tables live, Zod schemas done. Now build the full auth layer.

Read MEDREPDESK_SCHEMA.sql and src/lib/schemas.js before writing any code — match exact column names and types.

## WHAT TO BUILD

### 1. Auth Context Provider — `src/context/AuthContext.jsx`
Replace the placeholder with a full implementation:

```
- createContext + useAuth hook
- State: session, user (from public.users table), account (from accounts table), loading, error
- On mount: supabase.auth.getSession() then fetch user + account from public tables
- Listen: supabase.auth.onAuthStateChange — on SIGNED_IN fetch user+account, on SIGNED_OUT clear state
- Expose: signUp, signIn, signInWithGoogle, signOut, session, user, account, loading
- The user record fetch should join account: supabase.from('users').select('*, account:accounts(*)').eq('id', session.user.id).single()
```

### 2. Sign Up Function (inside AuthContext)
The signup flow must create BOTH an account and user record atomically. Since we can't use transactions from the client, create a Supabase Database Function to handle this.

**Create a new migration file** `supabase/migrations/20260301000009_signup_function.sql`:

```sql
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
```

After creating the migration file, apply it: `supabase db push`

### 3. Sign Up Page — `src/pages/SignUp.jsx`
- Mobile-first design, centered card layout
- Fields: Full Name, Email, Password (min 8 chars), Confirm Password
- Optional: referral code field (pre-filled from URL param `?ref=XXXX`)
- "Sign up with Google" button
- Link to Sign In page
- On submit: call supabase.auth.signUp with email, password, and options.data containing full_name and referred_by
- Show validation errors inline (use Zod for client-side validation)
- After successful signup, redirect to dashboard
- ToS/Privacy acceptance checkbox (required) — timestamps stored in account record

### 4. Sign In Page — `src/pages/SignIn.jsx`
- Mobile-first design matching SignUp
- Fields: Email, Password
- "Sign in with Google" button
- "Forgot password?" link (uses supabase.auth.resetPasswordForEmail)
- Link to Sign Up page
- On submit: call supabase.auth.signInWithPassword
- After successful signin, redirect to dashboard
- Show error messages for invalid credentials

### 5. Forgot Password Page — `src/pages/ForgotPassword.jsx`
- Email field
- Submit sends reset email via supabase.auth.resetPasswordForEmail
- Success message: "Check your email for a reset link"
- Link back to Sign In

### 6. Google OAuth Handler
In AuthContext, the signInWithGoogle function:
```javascript
const signInWithGoogle = async (referralCode) => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      // Pass referral code in metadata if present
      ...(referralCode && {
        data: { referred_by: referralCode }
      }),
    },
  });
  if (error) throw error;
};
```

### 7. Auth Callback Page — `src/pages/AuthCallback.jsx`
- Route: `/auth/callback`
- On mount: supabase.auth.getSession() to complete the OAuth flow
- Show a loading spinner
- Redirect to dashboard once session is confirmed
- Handle errors gracefully

### 8. Protected Route Component — `src/components/layout/ProtectedRoute.jsx`
```
- Wraps children
- If loading, show full-screen skeleton/spinner
- If no session, redirect to /signin
- If session but no user record (edge case), show error
- Pass through if authenticated
```

### 9. Role Gate Component — `src/components/layout/RoleGate.jsx`
```
- Props: allowedRoles (array), fallback (optional component)
- Uses useAuth() to get user.role
- If user.role is in allowedRoles, render children
- Otherwise render fallback or null
- Usage: <RoleGate allowedRoles={['owner']}><BillingSettings /></RoleGate>
```

### 10. App Router — Update `src/App.jsx`
```javascript
Routes:
  /signin → SignIn (public)
  /signup → SignUp (public)
  /forgot-password → ForgotPassword (public)
  /auth/callback → AuthCallback (public)
  / → Dashboard (protected)
  
All protected routes wrapped in ProtectedRoute.
Public routes redirect to / if already authenticated.
AuthProvider wraps the entire app.
QueryClientProvider wraps AuthProvider.
```

### 11. Dashboard Placeholder — `src/pages/Dashboard.jsx`
Create a simple placeholder that proves auth is working:
```
- Show "Welcome, {user.full_name}!"
- Show account name, plan, referral code
- Show user role
- Sign Out button
- This is temporary — we'll replace it in Step 3
```

### 12. Base UI Components Needed
Create these minimal UI components used by the auth pages:

**`src/components/ui/Button.jsx`**
- Props: variant (primary/secondary/outline/danger/google), size (sm/md/lg), loading, disabled, fullWidth, children, onClick, type
- Primary uses brand-500 (#0F4C81)
- Google variant has the Google icon and "Sign in with Google" styling
- Loading state shows spinner and disables
- Minimum touch target 44px

**`src/components/ui/Input.jsx`**
- Props: label, error, type, placeholder, ...rest
- Label above input
- Error message below in red
- Focus ring uses brand-500
- Minimum touch target 44px

**`src/components/ui/Card.jsx`**
- Simple white card with rounded corners, shadow, padding

**`src/components/ui/Spinner.jsx`**
- Animated spinning circle using brand-500
- Sizes: sm, md, lg

### 13. Styling
- All pages must be mobile-first (max-w-md mx-auto for auth pages)
- Use Tailwind classes exclusively — no inline styles
- Brand color #0F4C81 for primary actions
- Use the Inter font
- Inputs and buttons minimum 44px height for touch
- Error states in red-500

## IMPORTANT RULES
- All Supabase queries use the ANON key client from src/lib/supabase.js
- The signup trigger function runs as SECURITY DEFINER — it can insert into accounts/users even though the anon user doesn't have INSERT policies on accounts
- Do NOT add RLS policies for the accounts table INSERT — the trigger handles it
- The users table already has RLS — the trigger uses SECURITY DEFINER to bypass it
- Google OAuth redirect URL must be: window.location.origin + '/auth/callback'
- Password minimum length: 8 characters (enforced by Supabase Auth default + Zod)
- After creating the migration file, run `supabase db push` to apply it
- Do NOT install any additional packages — everything needed is already installed
- Use DOMPurify to sanitize the full_name field before sending to Supabase

## VERIFICATION
When done:
1. `npm run build` succeeds with no errors
2. Migration 009 applied successfully
3. Navigate to /signup — form renders, validation works
4. Navigate to /signin — form renders
5. Sign up creates auth user → trigger creates account + user → redirects to dashboard
6. Dashboard shows user name, account info, sign out button
7. Protected routes redirect to /signin when not authenticated
8. No TypeScript/ESLint errors
