import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
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
      await signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        referralCode: form.referralCode || undefined,
      });
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
        <p className="mb-6 text-center text-sm text-gray-500">
          Start managing your cases with MedRepDesk
        </p>

        {serverError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <Button
          variant="google"
          fullWidth
          onClick={handleGoogle}
          type="button"
        >
          Sign up with Google
        </Button>

        <div className="my-5 flex items-center gap-3">
          <hr className="flex-1 border-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <hr className="flex-1 border-gray-200" />
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
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-800 focus:ring-brand-800"
            />
            <span className="text-xs text-gray-600">
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

          <Button type="submit" fullWidth loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/signin" className="font-medium text-brand-800 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
