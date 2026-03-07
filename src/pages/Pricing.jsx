import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Zap, Users, Building2 } from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useSubscription, useCreateCheckout, useCreatePortalSession } from '@/hooks/useSubscription';
import { PLAN_LIMITS } from '@/utils/constants';

const plans = [
  {
    key: 'solo',
    icon: Zap,
    name: PLAN_LIMITS.solo.label,
    price: PLAN_LIMITS.solo.price,
    features: [
      '1 user',
      `${PLAN_LIMITS.solo.aiExtractions} AI extractions/mo`,
      `${PLAN_LIMITS.solo.aiDigests} AI digests/mo`,
      'Unlimited cases & POs',
      'Push notifications',
      'Commission tracking',
    ],
  },
  {
    key: 'assistant',
    icon: Users,
    name: PLAN_LIMITS.assistant.label,
    price: PLAN_LIMITS.assistant.price,
    popular: true,
    features: [
      'Up to 2 users',
      `${PLAN_LIMITS.assistant.aiExtractions} AI extractions/mo`,
      `${PLAN_LIMITS.assistant.aiDigests} AI digests/mo`,
      'Unlimited cases & POs',
      'Push notifications',
      'Commission tracking',
      'Assistant role access',
    ],
  },
  {
    key: 'distributorship',
    icon: Building2,
    name: PLAN_LIMITS.distributorship.label,
    price: PLAN_LIMITS.distributorship.price,
    features: [
      'Up to 5 users',
      `${PLAN_LIMITS.distributorship.aiExtractions} AI extractions/mo`,
      'Unlimited AI digests',
      'Unlimited cases & POs',
      'Push notifications',
      'Commission tracking',
      'Team management',
      'Priority support',
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { plan: currentPlan, isActive, isTrialing, hasStripeCustomer } = useSubscription();
  const checkout = useCreateCheckout();
  const portalSession = useCreatePortalSession();
  const toast = useToast();

  const cancelMsg = searchParams.get('checkout') === 'cancel';

  async function handleSelect(planKey) {
    console.log('SWITCH PLAN CLICKED', planKey, { currentPlan, isActive, isTrialing });
    if (planKey === currentPlan && isActive) {
      console.log('Same plan, skipping');
      return;
    }
    console.log('Calling checkout.mutateAsync...');

    // Open window synchronously to preserve Safari user gesture context
    const stripeWindow = window.open('', '_self');

    try {
      const result = await checkout.mutateAsync({ plan: planKey });
      console.log('Checkout result:', result);
      if (result?.url) {
        if (stripeWindow) stripeWindow.location.href = result.url;
        else window.location.href = result.url;
      } else {
        toast({ message: 'No checkout URL returned. Please try again.', type: 'error' });
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast({ message: `Checkout failed: ${err.message}`, type: 'error' });
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="text-center text-lg font-bold text-gray-900 dark:text-gray-100">
        Choose Your Plan
      </h1>
      <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
        {isTrialing
          ? 'Your 14-day free trial is active. Pick a plan to continue after trial.'
          : 'All plans include a 14-day free trial.'}
      </p>

      {cancelMsg && (
        <div className="mt-3 rounded-lg bg-amber-50 px-4 py-2 text-center text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          Checkout was canceled. You can try again anytime.
        </div>
      )}

      {hasStripeCustomer && (
        <div className="mt-4 text-center">
          <button
            onClick={async () => {
              try {
                const result = await portalSession.mutateAsync();
                if (result?.url) window.location.href = result.url;
              } catch (err) {
                console.error('Portal error:', err);
              }
            }}
            className="text-sm font-medium text-brand-800 underline dark:text-brand-400"
          >
            Manage Subscription
          </button>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {plans.map((plan) => {
          const isCurrent = plan.key === currentPlan && isActive;

          return (
            <div
              key={plan.key}
              className={clsx(
                'relative rounded-xl border p-5 transition-shadow',
                plan.popular
                  ? 'border-brand-800 shadow-md dark:border-brand-400'
                  : 'border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-gray-800'
              )}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-brand-800 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-brand-400 dark:text-gray-900">
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-3">
                <div className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  plan.popular
                    ? 'bg-brand-800/10 text-brand-800 dark:bg-brand-400/10 dark:text-brand-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                )}>
                  <plan.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {plan.name}
                  </h2>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      ${plan.price}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
                  </div>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                {isCurrent ? (
                  <Button variant="secondary" fullWidth disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    fullWidth
                    loading={checkout.isPending && checkout.variables?.plan === plan.key}
                    onClick={() => handleSelect(plan.key)}
                  >
                    {isActive ? 'Switch Plan' : 'Start Free Trial'}
                  </Button>
                )}
                {!isActive && (
                  <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-500">
                    14-day free trial, no credit card required
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
