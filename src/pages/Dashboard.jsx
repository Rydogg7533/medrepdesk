import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Briefcase, AlertTriangle, TrendingUp, ChevronRight, Clock,
  CalendarCheck, Building2, MapPin, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCases } from '@/hooks/useCases';
import { usePOs } from '@/hooks/usePOs';
import { useOverdueFollowUps, useOverduePromisedDates } from '@/hooks/useChaseLog';
import { useCommissions } from '@/hooks/useCommissions';
import { usePayPeriods } from '@/hooks/usePayPeriods';
import { useDistributor } from '@/hooks/useDistributors';
import { useOverdueCommunications } from '@/hooks/useCommunications';
import { useCaseIdsWithBillSheet } from '@/hooks/useBillSheetCounts';
import { useDashboardPreferences } from '@/hooks/useDashboardPreferences';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Skeleton from '@/components/ui/Skeleton';
import InfoTooltip from '@/components/ui/InfoTooltip';
import POPipelineStrip from '@/components/dashboard/POPipelineStrip';
import RecentActivity from '@/components/dashboard/RecentActivity';
import ActivationChecklist from '@/components/dashboard/ActivationChecklist';
import { DollarSign } from 'lucide-react';
import { formatDate, formatTime, formatCurrency, getGreeting } from '@/utils/formatters';
import { buildActionItems } from '@/utils/actionItems';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function weekFromNowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export default function Dashboard() {
  const { user, account } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const prefs = useDashboardPreferences();

  const today = todayISO();
  const weekOut = weekFromNowISO();

  // Data hooks
  const { data: allCases, isLoading } = useCases();
  const { data: allPOs = [] } = usePOs();
  const { data: overdueFollowUps = [] } = useOverdueFollowUps();
  const { data: overduePromised = [] } = useOverduePromisedDates();
  const { data: allCommissions = [] } = useCommissions();
  const distributorId = account?.primary_distributor_id;
  const { data: distributor } = useDistributor(distributorId);
  const { data: allPayPeriods = [] } = usePayPeriods(distributorId);
  const { data: overdueComms = [] } = useOverdueCommunications();
  const { data: billSheetCaseIds = new Set() } = useCaseIdsWithBillSheet();


  // Banner state
  const [statesBannerDismissed, setStatesBannerDismissed] = useState(
    () => localStorage.getItem('rep_states_banner_dismissed') === 'true'
  );
  const showStatesBanner = account?.rep_states == null && !statesBannerDismissed;

  function dismissStatesBanner() {
    localStorage.setItem('rep_states_banner_dismissed', 'true');
    setStatesBannerDismissed(true);
  }

  // Derived data
  const todayCases = allCases?.filter((c) => c.scheduled_date === today) || [];
  const upcomingCases = allCases?.filter(
    (c) => c.scheduled_date > today && c.scheduled_date <= weekOut
  ) || [];

  const completedNeedBillSheet = allCases?.filter(
    (c) => c.status === 'completed' && !billSheetCaseIds.has(c.id)
  ) || [];

  const overduePOs = allPOs.filter(
    (p) => p.expected_payment_date && p.expected_payment_date < today && p.status !== 'paid'
  );
  const overdueCommissions = allCommissions.filter(
    (c) => c.expected_date && c.expected_date < today && c.status === 'pending'
  );

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthCases = allCases?.filter(
    (c) => c.scheduled_date?.startsWith(thisMonth)
  ) || [];
  const monthValue = monthCases.reduce((sum, c) => sum + (c.case_value || 0), 0);

  // Pay period metrics
  const awaitingCommission = allCommissions.filter(
    (c) => c.pay_period_id && allPayPeriods.some((p) => p.id === c.pay_period_id && ['open', 'closed'].includes(p.status))
  );
  const awaitingTotal = awaitingCommission.reduce((sum, c) => sum + (c.expected_amount || 0), 0);
  const monthStart = thisMonth + '-01';
  const earnedPOs = allPOs.filter(
    (p) => ['received', 'processing', 'disputed', 'paid'].includes(p.status) && p.received_date >= monthStart
  );
  const earnedThisMonth = earnedPOs.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Action items
  const actionItems = buildActionItems({
    overdueFollowUps,
    overduePromised,
    completedNeedBillSheet,
    overduePOs,
    overdueCommissions,
    overdueComms,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* A. Greeting */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        {getGreeting()}, {firstName}
      </h1>

      {/* A2. Activation Checklist */}
      <ActivationChecklist />

      {/* B. Setup Banners */}
      {showStatesBanner && (
        <Card className="border border-blue-200 dark:border-blue-800/30 bg-blue-50 dark:bg-blue-800/10">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Set your operating states for better search results</p>
              <button
                onClick={() => navigate('/settings')}
                className="text-xs font-medium text-blue-600 underline dark:text-blue-300"
              >
                Go to Settings
              </button>
            </div>
            <button
              onClick={dismissStatesBanner}
              className="rounded-full p-1 text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      {!account?.primary_distributor_id && (
        <Card
          className="cursor-pointer border border-brand-200 dark:border-brand-800/30 bg-brand-50 dark:bg-brand-800/10 active:bg-brand-100 dark:active:bg-brand-800/20"
          onClick={() => navigate('/my-distributor')}
        >
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-brand-800 dark:text-brand-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-800 dark:text-brand-400">Set up your distributor to get started</p>
              <p className="text-xs text-brand-600 dark:text-brand-500">Configure products and commission rates</p>
            </div>
            <ChevronRight className="h-4 w-4 text-brand-800 dark:text-brand-400" />
          </div>
        </Card>
      )}

      {/* C. Today's Cases */}
      {prefs.show_todays_cases && (
        <Card
          className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
          onClick={() => navigate('/cases')}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Today&apos;s Cases</h2>
            <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </div>
          {todayCases.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No cases scheduled today</p>
          ) : (
            <div className="space-y-2">
              {todayCases.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-700/50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {c.surgeon?.full_name || 'No surgeon'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(c.scheduled_time)} · {c.facility?.name || 'No facility'}
                    </p>
                  </div>
                  <StatusBadge status={c.status} type="case" />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* D. Upcoming Cases */}
      {prefs.show_upcoming_cases && (
        <Card
          className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
          onClick={() => navigate('/cases')}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Upcoming (7 days)</h2>
            <span className="text-xs font-medium text-brand-800 dark:text-brand-400">
              {upcomingCases.length} cases
            </span>
          </div>
          {upcomingCases.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No upcoming cases</p>
          ) : (
            <div className="space-y-1.5">
              {upcomingCases.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{c.surgeon?.full_name || c.case_number}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(c.scheduled_date)}</span>
                </div>
              ))}
              {upcomingCases.length > 5 && (
                <p className="text-xs text-brand-800 dark:text-brand-400">+{upcomingCases.length - 5} more</p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* E. PO Pipeline Strip */}
      {prefs.show_po_pipeline && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">PO Pipeline</h2>
            <button
              className="min-h-touch p-2 text-gray-400 dark:text-gray-500"
              onClick={() => navigate('/money')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <POPipelineStrip pos={allPOs} />
        </Card>
      )}

      {/* F. Metrics Row */}
      {prefs.show_metrics && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-brand-800 dark:text-brand-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">This Month<InfoTooltip text="Surgical cases scheduled for the current month." /></span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{monthCases.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">cases</p>
          </Card>
          <Card>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Case Value<InfoTooltip text="Total value of cases scheduled this month." /></span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(monthValue)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">this month</p>
          </Card>
          {distributor?.pay_schedule?.frequency && (
            <>
              <Card
                className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                onClick={() => navigate('/money')}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Awaiting<InfoTooltip text="Commissions in open or closed pay periods not yet paid." /></span>
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(awaitingTotal)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{awaitingCommission.length} commission{awaitingCommission.length !== 1 ? 's' : ''}</p>
              </Card>
              <Card
                className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                onClick={() => navigate('/money')}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Earned This Month<InfoTooltip text="Total value of POs received this month." /></span>
                </div>
                <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(earnedThisMonth)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{earnedPOs.length} PO{earnedPOs.length !== 1 ? 's' : ''} this month</p>
              </Card>
            </>
          )}
        </div>
      )}

      {/* G. Action Items */}
      {prefs.show_action_items && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Action Items
                <InfoTooltip text="Tasks requiring immediate attention — overdue follow-ups, promised dates, and bill sheets." />
              </h2>
              {actionItems.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {actionItems.length}
                </span>
              )}
            </div>
            {actionItems.length > 0 && (
              <Link
                to="/action-items"
                className="text-xs font-medium text-brand-800 dark:text-brand-400"
              >
                View all
              </Link>
            )}
          </div>
          <div className="space-y-2">
            {actionItems.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">All caught up!</p>
            ) : (
              actionItems.slice(0, 5).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => item.link && navigate(item.link)}
                    className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left active:bg-gray-50 dark:active:bg-gray-700"
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${item.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{item.text}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.subtitle}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600" />
                  </button>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* H. Recent Activity */}
      {prefs.show_recent_activity && (
        <Card>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Activity</h2>
          </div>
          <RecentActivity limit={5} />
        </Card>
      )}

    </div>
  );
}
