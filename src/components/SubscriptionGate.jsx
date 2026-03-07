import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionGate({ children }) {
  const navigate = useNavigate();
  const { isCanceled } = useSubscription();

  if (isCanceled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <XCircle className="h-12 w-12 text-gray-400 dark:text-gray-500" />
        <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-gray-100">
          Your subscription has ended
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Resubscribe to regain access to your cases, POs, commissions, and more.
        </p>
        <Button variant="primary" className="mt-6" onClick={() => navigate('/pricing')}>
          View Plans
        </Button>
      </div>
    );
  }

  return children;
}
