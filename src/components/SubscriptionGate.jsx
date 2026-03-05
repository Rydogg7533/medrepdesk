import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, X, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useSubscription, useCreatePortalSession } from '@/hooks/useSubscription';

export default function SubscriptionGate({ children }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { subStatus, isCanceled, isPastDue, isTrialing, trialEndsAt } = useSubscription();
  const portalSession = useCreatePortalSession();
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setCheckoutSuccess(true);
      const next = new URLSearchParams(searchParams);
      next.delete('checkout');
      setSearchParams(next, { replace: true });
    }
  }, []);

  async function handleManageBilling() {
    try {
      const result = await portalSession.mutateAsync();
      if (result?.url) window.location.href = result.url;
    } catch (err) {
      console.error('Portal session error:', err);
    }
  }

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

  const trialDaysLeft = isTrialing && trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <>
      {checkoutSuccess && (
        <div className="flex items-center justify-between gap-2 bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            Subscription activated successfully!
          </div>
          <button onClick={() => setCheckoutSuccess(false)} className="p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isPastDue && (
        <div className="flex items-center justify-between gap-2 bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Payment failed — update your payment method to avoid interruption.
          </div>
          <button
            onClick={handleManageBilling}
            className="whitespace-nowrap font-medium underline"
          >
            Update payment
          </button>
        </div>
      )}

      {isTrialing && trialDaysLeft !== null && (
        <div className="flex items-center justify-center gap-2 bg-blue-50 px-4 py-1.5 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          {trialDaysLeft === 0
            ? 'Your trial ends today.'
            : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your free trial.`}
          <button
            onClick={() => navigate('/pricing')}
            className="ml-1 font-medium underline"
          >
            Choose a plan
          </button>
        </div>
      )}

      {children}
    </>
  );
}
