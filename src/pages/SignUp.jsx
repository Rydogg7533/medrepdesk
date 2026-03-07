import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const signUpSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    referralCode: z.string().optional(),
    tosAccepted: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the Terms of Service' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function SignUp() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: searchParams.get('ref') || '',
    tosAccepted: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // Beta access code state
  const [accessCode, setAccessCode] = useState('');
  const [codeValid, setCodeValid] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);

  async function validateCode() {
    if (!accessCode.trim()) return;
    setCheckingCode(true);
    setCodeError('');
    try {
      const { data } = await supabase.functions.invoke('validate-beta-code', {
        body: { code: accessCode.trim().toUpperCase(), email: form.email || '' },
      });
      if (data?.valid) {
        setCodeValid(true);
      } else {
        setCodeError(data?.error || 'Invalid access code');
        setCodeValid(false);
      }
    } catch {
      setCodeError('Could not validate code. Please try again.');
    } finally {
      setCheckingCode(false);
    }
  }

  function onChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const result = signUpSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        referralCode: form.referralCode || undefined,
      });
      // Record beta code usage
      if (accessCode && codeValid) {
        supabase.rpc('increment_beta_code_use', { p_code: accessCode.trim().toUpperCase() }).catch(() => {});
      }
      navigate('/');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      await signInWithGoogle(form.referralCode || undefined);
    } catch (err) {
      setServerError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-brand-800">
          Create Account
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Start managing your cases with MedRepDesk
        </p>

        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        {/* Beta Access Code */}
        <div className="mb-4 space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Beta Access Code
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value.toUpperCase());
                setCodeValid(false);
                setCodeError('');
              }}
              onBlur={validateCode}
              placeholder="Enter your access code"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono text-sm uppercase outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              maxLength={20}
            />
            {codeValid && (
              <div className="flex items-center px-3 text-green-500">
                <CheckCircle className="w-5 h-5" />
              </div>
            )}
          </div>
          {checkingCode && (
            <p className="text-xs text-gray-400">Checking code...</p>
          )}
          {codeError && (
            <p className="text-xs text-red-500">{codeError}</p>
          )}
          {codeValid && (
            <p className="text-xs text-green-500">Access code accepted</p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            MedRepDesk is currently in private beta. Contact us to get access.
          </p>
        </div>

        <Button
          variant="google"
          fullWidth
          onClick={handleGoogle}
          type="button"
          disabled={!codeValid}
        >
          Sign up with Google
        </Button>

        <div className="my-5 flex items-center gap-3">
          <hr className="flex-1 border-gray-200 dark:border-gray-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
          <hr className="flex-1 border-gray-200 dark:border-gray-700" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            name="fullName"
            placeholder="John Smith"
            value={form.fullName}
            onChange={onChange}
            error={errors.fullName}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={onChange}
            error={errors.email}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Min 8 characters"
            value={form.password}
            onChange={onChange}
            error={errors.password}
          />
          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={onChange}
            error={errors.confirmPassword}
          />
          <Input
            label="Referral Code (optional)"
            name="referralCode"
            placeholder="e.g. ABCD1234"
            value={form.referralCode}
            onChange={onChange}
          />

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="tosAccepted"
              checked={form.tosAccepted}
              onChange={onChange}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-800 focus:ring-brand-800"
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              I agree to the{' '}
              <a href="/terms" className="text-brand-800 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-brand-800 underline">
                Privacy Policy
              </a>
            </span>
          </label>
          {errors.tosAccepted && (
            <p className="-mt-2 text-xs text-red-500">{errors.tosAccepted}</p>
          )}

          <Button type="submit" fullWidth loading={loading} disabled={!codeValid}>
            Create Account
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/signin" className="font-medium text-brand-800 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
