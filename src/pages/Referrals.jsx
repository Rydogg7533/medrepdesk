import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Gift,
  Copy,
  Check,
  ExternalLink,
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Banknote,
} from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useReferrals, useReferralPayouts, useReferralStats } from '@/hooks/useReferrals';
import { useCreateConnectAccount } from '@/hooks/useSubscription';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { formatCurrency, formatDate } from '@/utils/formatters';

const REFERRAL_STATUS = {
  active: { label: 'Active', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  expired: { label: 'Expired', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

const PAYOUT_STATUS = {
  pending: { label: 'Pending', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  paid: { label: 'Paid', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  failed: { label: 'Failed', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

export default function Referrals() {
  const [searchParams] = useSearchParams();
  const { account } = useAuth();
  const { data: referrals = [], isLoading } = useReferrals();
  const { data: payouts = [] } = useReferralPayouts();
  const stats = useReferralStats();
  const connectAccount = useCreateConnectAccount();

  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('referrals'); // referrals | payouts

  const connectComplete = searchParams.get('connect') === 'complete';
  const connectRefresh = searchParams.get('connect') === 'refresh';

  const referralCode = account?.referral_code || '';
  const shareLink = `${window.location.origin}/join?ref=${referralCode}`;
  const hasConnectId = !!account?.stripe_connect_id;
  const hasReferrals = referrals.length > 0;

  function handleCopy() {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleConnectOnboarding() {
    try {
      const result = await connectAccount.mutateAsync();
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Connect onboarding error:', err);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <h1 className="page-bg-text mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Referrals<InfoTooltip text="Earn 25% of every referred rep's subscription for 12 months. Share your link and get paid when they subscribe." /></h1>

      {connectComplete && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Payout account connected successfully!
        </div>
      )}

      {connectRefresh && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Please complete your payout account setup.
        </div>
      )}

      {/* Referral Code Card */}
      <section className="themed-card rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="h-5 w-5 text-brand-800 dark:text-brand-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Your Referral Code<InfoTooltip text="Your unique referral code. When a rep signs up using your link, they're linked to your account for commission tracking." /></h2>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-700/50">
          <span className="flex-1 font-mono text-lg font-bold tracking-wider text-brand-800 dark:text-brand-400">
            {referralCode}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-400">
            {shareLink}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-shrink-0"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Earn 25% of each referred account's subscription for 12 months.
        </p>
      </section>

      {/* Connect Onboarding Banner */}
      {!hasConnectId && hasReferrals && (
        <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <Banknote className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Set up payouts<InfoTooltip text="Connect your bank account via Stripe to receive referral payouts. Processed on the 1st of each month." /></p>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                Connect your bank account via Stripe to receive referral commissions.
              </p>
              <Button
                size="sm"
                className="mt-2"
                loading={connectAccount.isPending}
                onClick={handleConnectOnboarding}
              >
                Connect Payout Account
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="themed-card rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Referred<InfoTooltip text="Number of reps you've successfully referred to MedRepDesk." /></span>
          </div>
          <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{stats.totalReferred}</p>
          <p className="text-[11px] text-gray-400">{stats.activeReferrals} active</p>
        </div>
        <div className="themed-card rounded-xl bg-white p-3 shadow-sm dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Total Earned<InfoTooltip text="Total commission earned from all referrals. Earn 25% of every referred rep's subscription for 12 months." /></span>
          </div>
          <p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(stats.totalEarned)}</p>
          {stats.pendingPayouts > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">{formatCurrency(stats.pendingPayouts)} pending</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-2">
        {['referrals', 'payouts'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize',
              tab === t
                ? 'bg-brand-800 text-white dark:bg-brand-400 dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'referrals' && (
        <div className="mt-3">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : referrals.length === 0 ? (
            <div className="py-12 text-center">
              <Gift className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                No referrals yet. Share your code to start earning!
              </p>
            </div>
          ) : (
            <div className="themed-card divide-y divide-gray-100 rounded-xl bg-white shadow-sm dark:divide-gray-700 dark:bg-gray-800">
              {referrals.map((ref) => {
                const status = REFERRAL_STATUS[ref.status] || REFERRAL_STATUS.active;
                const referred = ref.referred;

                return (
                  <div key={ref.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {referred?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {referred?.plan || 'solo'} plan — joined {formatDate(referred?.created_at)}
                        </p>
                      </div>
                      <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', status.bg, status.text)}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        <DollarSign className="mr-0.5 inline h-3 w-3" />
                        {formatCurrency(ref.total_earned)} earned
                      </span>
                      <span>{ref.months_paid}/{ref.commission_months} months</span>
                      <span>{Math.round(Number(ref.commission_rate) * 100)}% rate</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'payouts' && (
        <div className="mt-3">
          {payouts.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                No payouts yet.
              </p>
            </div>
          ) : (
            <div className="themed-card divide-y divide-gray-100 rounded-xl bg-white shadow-sm dark:divide-gray-700 dark:bg-gray-800">
              {payouts.map((payout) => {
                const status = PAYOUT_STATUS[payout.status] || PAYOUT_STATUS.pending;

                return (
                  <div key={payout.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(payout.commission_amount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {payout.period_month}/{payout.period_year}
                        {' — '}sub: {formatCurrency(payout.subscription_amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', status.bg, status.text)}>
                        {status.label}
                      </span>
                      {payout.paid_at && (
                        <p className="mt-0.5 text-[11px] text-gray-400">{formatDate(payout.paid_at)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
