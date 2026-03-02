import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/ui/Spinner';

export default function ProtectedRoute({ children }) {
  const { session, user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/signin" replace />;
  }

  if (session && !user && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-lg bg-red-50 p-6 text-center text-sm text-red-600">
          <p className="font-medium">Account Error</p>
          <p className="mt-1">
            {error || 'Unable to load your user profile. Please contact support.'}
          </p>
        </div>
      </div>
    );
  }

  return children;
}
