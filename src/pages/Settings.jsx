import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  ExternalLink,
  Shield,
  User,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  MapPin,
  X,
  Search,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useSubscription, useCreatePortalSession } from '@/hooks/useSubscription';
import { useUpdateAccount } from '@/hooks/useAccount';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { PLAN_LIMITS } from '@/utils/constants';
import { US_STATES } from '@/utils/usStates';
import VoiceSettings from '@/components/features/VoiceSettings';
import VoiceMemorySettings from '@/components/features/VoiceMemorySettings';
import NotificationSettings from '@/components/features/NotificationSettings';
import AppearanceSettings from '@/components/features/AppearanceSettings';
import { useDashboardPreferences, useUpdateDashboardPreferences } from '@/hooks/useDashboardPreferences';

const DASHBOARD_SECTIONS = [
  { key: 'show_todays_cases', label: "Today's Cases" },
  { key: 'show_upcoming_cases', label: 'Upcoming Cases' },
  { key: 'show_po_pipeline', label: 'PO Pipeline' },
  { key: 'show_metrics', label: 'Metrics' },
  { key: 'show_chase_summary', label: 'Chase Summary' },
  { key: 'show_action_items', label: 'Action Items' },
  { key: 'show_recent_activity', label: 'Recent Activity' },
];

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
  const updateAccount = useUpdateAccount();
  const dashPrefs = useDashboardPreferences();
  const updateDashPrefs = useUpdateDashboardPreferences();

  const [selectedStates, setSelectedStates] = useState(() => account?.rep_states || []);
  const [statesOpen, setStatesOpen] = useState(false);
  const [stateFilter, setStateFilter] = useState('');
  const statesRef = useRef(null);

  const filteredStates = useMemo(
    () => US_STATES.filter((s) =>
      s.name.toLowerCase().includes(stateFilter.toLowerCase()) ||
      s.code.toLowerCase().includes(stateFilter.toLowerCase())
    ),
    [stateFilter]
  );

  const savedStates = account?.rep_states || [];
  const hasChanges = JSON.stringify([...selectedStates].sort()) !== JSON.stringify([...savedStates].sort());

  useEffect(() => {
    function handleClickOutside(e) {
      if (statesRef.current && !statesRef.current.contains(e.target)) {
        setStatesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleState(code) {
    setSelectedStates((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]
    );
  }

  function handleSaveStates() {
    updateAccount.mutate({ rep_states: selectedStates });
  }

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

      {/* Appearance */}
      <AppearanceSettings />

      {/* Dashboard */}
      <section className="themed-card mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Dashboard</h2>
        <div className="space-y-1">
          {DASHBOARD_SECTIONS.map(({ key, label }) => (
            <label
              key={key}
              className="flex min-h-touch items-center justify-between rounded-lg px-2 py-3"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={dashPrefs[key]}
                onClick={() => updateDashPrefs.mutate({ [key]: !dashPrefs[key] })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  dashPrefs[key] ? 'bg-brand-800' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    dashPrefs[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </section>

      {/* Account Info */}
      <section className="themed-card mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
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

      {/* My States */}
      <section className="themed-card mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">My States</h2>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Select the states you operate in for better search filtering.
        </p>

        {/* Selected state chips */}
        {selectedStates.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selectedStates
              .slice()
              .sort((a, b) => a.localeCompare(b))
              .map((code) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-900/30 dark:text-brand-400"
                >
                  {code}
                  <button
                    type="button"
                    onClick={() => toggleState(code)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-brand-200 dark:hover:bg-brand-800/50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
          </div>
        )}

        {/* Multi-select dropdown */}
        <div ref={statesRef} className="relative">
          <button
            type="button"
            onClick={() => setStatesOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm dark:border-gray-600 dark:bg-gray-700"
          >
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="flex-1 text-gray-500 dark:text-gray-400">
              {selectedStates.length === 0
                ? 'Select states...'
                : `${selectedStates.length} state${selectedStates.length !== 1 ? 's' : ''} selected`}
            </span>
          </button>

          {statesOpen && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
              <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  placeholder="Filter states..."
                  className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-gray-100 dark:placeholder-gray-500"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                {filteredStates.map((s) => {
                  const checked = selectedStates.includes(s.code);
                  return (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => toggleState(s.code)}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className={clsx(
                        'flex h-4 w-4 items-center justify-center rounded border',
                        checked
                          ? 'border-brand-800 bg-brand-800 dark:border-brand-400 dark:bg-brand-400'
                          : 'border-gray-300 dark:border-gray-600'
                      )}>
                        {checked && <Check className="h-3 w-3 text-white dark:text-gray-900" />}
                      </div>
                      <span className="text-gray-900 dark:text-gray-100">{s.name}</span>
                      <span className="ml-auto text-xs text-gray-400">{s.code}</span>
                    </button>
                  );
                })}
                {filteredStates.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-400">No states match</p>
                )}
              </div>
            </div>
          )}
        </div>

        {hasChanges && (
          <Button
            variant="primary"
            size="sm"
            className="mt-3"
            loading={updateAccount.isPending}
            onClick={handleSaveStates}
          >
            Save States
          </Button>
        )}
      </section>

      {/* Subscription */}
      <section className="themed-card mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
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

      {/* Voice Assistant */}
      <VoiceSettings />

      {/* Voice Memory */}
      <section className="themed-card mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <VoiceMemorySettings />
      </section>

      {/* Notifications */}
      <NotificationSettings />
    </div>
  );
}
