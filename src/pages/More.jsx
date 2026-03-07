import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CreditCard,
  Gift,
  Settings,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription, useCreatePortalSession } from '@/hooks/useSubscription';
import { PLAN_LIMITS } from '@/utils/constants';
import RoleGate from '@/components/layout/RoleGate';
import clsx from 'clsx';

const SUB_STATUS_BADGE = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  trialing: { label: 'Trial', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  past_due: { label: 'Past Due', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  canceled: { label: 'Canceled', className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  incomplete: { label: 'Incomplete', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

const ownerItems = [
  { icon: Gift, label: 'Referrals', path: '/referrals' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const themeOptions = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
];

export default function More() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { plan, subStatus, isTrial, isCanceled, trialEndsAt, hasStripeCustomer } = useSubscription();
  const portalSession = useCreatePortalSession();

  const planLabel = PLAN_LIMITS[plan]?.label || plan;
  const badge = SUB_STATUS_BADGE[subStatus] || SUB_STATUS_BADGE.active;
  const trialDaysLeft = isTrial && trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  async function handleManageSubscription() {
    if (!hasStripeCustomer) {
      navigate('/pricing');
      return;
    }
    try {
      const result = await portalSession.mutateAsync();
      if (result?.url) window.location.href = result.url;
    } catch (err) {
      console.error('Portal session error:', err);
    }
  }

  function MenuItem({ icon: Icon, label, path, onClick }) {
    return (
      <button
        onClick={onClick || (() => navigate(path))}
        className="flex min-h-touch w-full items-center gap-3 rounded-lg px-3 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700"
      >
        <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </button>
    );
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">More</h1>

      <div className="themed-card mb-4 rounded-xl bg-white shadow-sm dark:bg-gray-800">
        <MenuItem icon={Building2} label="My Distributor" path="/my-distributor" />
      </div>

      <RoleGate allowedRoles={['owner']}>
        <div className="themed-card rounded-xl bg-white shadow-sm dark:bg-gray-800">
          {ownerItems.map((item) => (
            <MenuItem key={item.path} {...item} />
          ))}
        </div>
      </RoleGate>

      {/* Theme Toggle */}
      <div className="themed-card mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <h2 className="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Appearance</h2>
        <div className="flex gap-2">
          {themeOptions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={clsx(
                'flex flex-1 flex-col items-center gap-1.5 rounded-lg py-3 text-xs font-medium transition-colors',
                theme === key
                  ? 'bg-brand-800 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Subscription */}
      <div className="themed-card mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <h2 className="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Subscription</h2>
        <button
          onClick={handleManageSubscription}
          disabled={portalSession.isPending}
          className="flex min-h-touch w-full items-center gap-3 rounded-lg text-left active:bg-gray-100 dark:active:bg-gray-700"
        >
          <CreditCard className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{planLabel}</span>
              <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', badge.className)}>
                {badge.label}
              </span>
            </div>
            {trialDaysLeft !== null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {trialDaysLeft === 0 ? 'Trial ends today' : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in trial`}
              </p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </button>

        {(isTrial || isCanceled) && (
          <button
            onClick={() => navigate('/pricing')}
            className="mt-3 flex w-full items-center justify-center rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-medium text-white active:bg-brand-900 dark:bg-brand-600 dark:active:bg-brand-700"
          >
            Upgrade Plan
          </button>
        )}
      </div>

      <div className="themed-card mt-4 rounded-xl bg-white shadow-sm dark:bg-gray-800">
        {bottomItems.map((item) => (
          <MenuItem key={item.path} {...item} />
        ))}
        <button
          onClick={signOut}
          className="flex min-h-touch w-full items-center gap-3 rounded-lg px-3 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700"
        >
          <LogOut className="h-5 w-5 text-red-500" />
          <span className="flex-1 text-sm font-medium text-red-500">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
