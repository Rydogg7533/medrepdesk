import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/auth/callback` }
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-brand-800">
          Reset Password
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Enter your email and we&apos;ll send you a reset link
        </p>

        {sent ? (
          <div className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
            Check your email for a reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              error=""
            />
            <Button type="submit" fullWidth loading={loading}>
              Send Reset Link
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-gray-500">
          <Link to="/signin" className="font-medium text-brand-800 hover:underline">
            Back to Sign In
          </Link>
        </p>
      </Card>
    </div>
  );
}
