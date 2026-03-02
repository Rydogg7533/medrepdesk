import { useEffect } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { Gift } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function JoinReferral() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref');

  // If no ref code, redirect to normal signup
  if (!refCode) {
    return <Navigate to="/signup" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-800/10 dark:bg-brand-400/10">
          <Gift className="h-8 w-8 text-brand-800 dark:text-brand-400" />
        </div>

        <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          You've been referred!
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Someone shared MedRepDesk with you. Create your account to get started
          with a 14-day free trial.
        </p>

        <div className="mt-4 rounded-lg bg-gray-50 px-4 py-2 dark:bg-gray-700/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Referral code</p>
          <p className="font-mono text-lg font-bold tracking-wider text-brand-800 dark:text-brand-400">
            {refCode}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            fullWidth
            onClick={() => navigate(`/signup?ref=${encodeURIComponent(refCode)}`)}
          >
            Create Account
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate(`/signin`)}
          >
            Already have an account? Sign in
          </Button>
        </div>
      </Card>
    </div>
  );
}
