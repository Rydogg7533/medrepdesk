import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  ExternalLink,
  Shield,
  Bell,
  User,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useSubscription, useCreatePortalSession } from '@/hooks/useSubscription';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { PLAN_LIMITS } from '@/utils/constants';

const SUB_STATUS_DISPLAY = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  trialing: { label: 'Free Trial', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  past_due: { label: 'Past Due', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  canceled: { label: 'Canceled', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  incomplete: { label: 'Incomplete', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, account } = useAuth();
  const { plan, status, isActive, isPastDue, isCanceled, isTrialing, hasStripeCustomer } = useSubscription();
  const portalSession = useCreatePortalSession();
  const { supported: pushSupported, isSubscribed, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications();

  const checkoutSuccess = searchParams.get('checkout') === 'success';
  const planInfo = PLAN_LIMITS[plan];
  const statusDisplay = SUB_STATUS_DISPLAY[status] || SUB_STATUS_DISPLAY.active;

  async function handleManageBilling() {
    try {
      const result = await portalSession.mutateAsync();
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Portal session error:', err);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Settings</h1>

      {checkoutSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Subscription activated successfully!
        </div>
      )}

      {isPastDue && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Your payment is past due. Please update your payment method.
        </div>
      )}

      {/* Account Info */}
      <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-800/10 dark:bg-brand-400/10">
              <User className="h-5 w-5 text-brand-800 dark:text-brand-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription */}
      <section className="mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Subscription</h2>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {planInfo?.label || plan}
              </span>
              <span className={clsx(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                statusDisplay.className
              )}>
                {statusDisplay.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              ${planInfo?.price || 0}/month
              {isTrialing && ' — trial active'}
            </p>
          </div>
          <Shield className="h-5 w-5 text-gray-400" />
        </div>

        {/* Usage stats */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">AI Extractions<InfoTooltip text="Number of AI PO extractions used this month — take a photo and AI reads the document." /></p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {account?.ai_extractions_this_month || 0}
              <span className="text-xs font-normal text-gray-400"> / {planInfo?.aiExtractions || 0}</span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">AI Digests<InfoTooltip text="Weekly AI digest summarizes upcoming cases, overdue POs, pending follow-ups, and commission status in plain English." /></p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {account?.ai_digest_this_month || 0}
              <span className="text-xs font-normal text-gray-400">
                {planInfo?.aiDigests === -1 ? ' / unlimited' : ` / ${planInfo?.aiDigests || 0}`}
              </span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2">
          {hasStripeCustomer ? (
            <Button
              variant="outline"
              fullWidth
              loading={portalSession.isPending}
              onClick={handleManageBilling}
            >
              <CreditCard className="h-4 w-4" />
              Manage Billing
              <ExternalLink className="h-3.5 w-3.5 ml-auto" />
            </Button>
          ) : null}

          {(isCanceled || isTrialing || !hasStripeCustomer) && (
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/pricing')}
            >
              {isCanceled ? 'Resubscribe' : isTrialing ? 'Choose a Plan' : 'Subscribe'}
            </Button>
          )}

          {isActive && !isTrialing && (
            <button
              onClick={() => navigate('/pricing')}
              className="text-xs text-center text-brand-800 dark:text-brand-400"
            >
              Change plan
            </button>
          )}
        </div>
      </section>

      {/* Push Notifications */}
      {pushSupported && (
        <section className="mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Notifications</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Push Notifications<InfoTooltip text="Choose which notifications you receive and how (push, email, or both)." /></p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isSubscribed ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <Button
              variant={isSubscribed ? 'secondary' : 'primary'}
              size="sm"
              loading={pushLoading}
              onClick={isSubscribed ? unsubscribe : subscribe}
            >
              {isSubscribed ? 'Disable' : 'Enable'}
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Escalation Threshold<InfoTooltip text="Number of chase attempts before MedRepDesk recommends escalating. Default is 3." /></p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {account?.escalation_threshold || 3} attempts
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
