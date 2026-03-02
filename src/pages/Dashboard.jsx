import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function Dashboard() {
  const { user, account, signOut } = useAuth();

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-md">
        <Card>
          <h1 className="mb-4 text-xl font-bold text-brand-800">
            Welcome, {user?.full_name || 'User'}!
          </h1>

          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium text-gray-800">Account:</span>{' '}
              {account?.name}
            </p>
            <p>
              <span className="font-medium text-gray-800">Plan:</span>{' '}
              {account?.plan}
            </p>
            <p>
              <span className="font-medium text-gray-800">Referral Code:</span>{' '}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                {account?.referral_code}
              </code>
            </p>
            <p>
              <span className="font-medium text-gray-800">Role:</span>{' '}
              {user?.role}
            </p>
          </div>

          <Button
            variant="outline"
            fullWidth
            className="mt-6"
            onClick={signOut}
          >
            Sign Out
          </Button>
        </Card>
      </div>
    </div>
  );
}
