import { useNavigate } from 'react-router-dom';
import { Briefcase, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCases } from '@/hooks/useCases';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Skeleton from '@/components/ui/Skeleton';
import { formatDate, formatTime, formatCurrency, getGreeting } from '@/utils/formatters';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function weekFromNowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  const today = todayISO();
  const weekOut = weekFromNowISO();

  const { data: allCases, isLoading } = useCases();

  const todayCases = allCases?.filter((c) => c.scheduled_date === today) || [];
  const upcomingCases = allCases?.filter(
    (c) => c.scheduled_date > today && c.scheduled_date <= weekOut
  ) || [];
  const chasingCount = allCases?.filter((c) =>
    ['po_requested', 'bill_sheet_submitted'].includes(c.status)
  ).length || 0;
  const completedNeedBillSheet = allCases?.filter(
    (c) => c.status === 'completed'
  ).length || 0;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthCases = allCases?.filter(
    (c) => c.scheduled_date?.startsWith(thisMonth)
  ) || [];
  const monthValue = monthCases.reduce((sum, c) => sum + (c.case_value || 0), 0);

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
      <h1 className="text-xl font-bold text-gray-900">
        {getGreeting()}, {firstName}
      </h1>

      {/* Today's Cases */}
      <Card
        className="cursor-pointer active:bg-gray-50"
        onClick={() => navigate('/cases')}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Today&apos;s Cases</h2>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
        {todayCases.length === 0 ? (
          <p className="text-sm text-gray-400">No cases scheduled today</p>
        ) : (
          <div className="space-y-2">
            {todayCases.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {c.surgeon?.full_name || 'No surgeon'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTime(c.scheduled_time)} · {c.facility?.name || 'No facility'}
                  </p>
                </div>
                <StatusBadge status={c.status} type="case" />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Upcoming Cases */}
      <Card
        className="cursor-pointer active:bg-gray-50"
        onClick={() => navigate('/cases')}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Upcoming (7 days)</h2>
          <span className="text-xs font-medium text-brand-800">
            {upcomingCases.length} cases
          </span>
        </div>
        {upcomingCases.length === 0 ? (
          <p className="text-sm text-gray-400">No upcoming cases</p>
        ) : (
          <div className="space-y-1.5">
            {upcomingCases.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{c.surgeon?.full_name || c.case_number}</span>
                <span className="text-xs text-gray-400">{formatDate(c.scheduled_date)}</span>
              </div>
            ))}
            {upcomingCases.length > 5 && (
              <p className="text-xs text-brand-800">+{upcomingCases.length - 5} more</p>
            )}
          </div>
        )}
      </Card>

      {/* Action Items */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Action Items</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-gray-600">
              {completedNeedBillSheet} cases need bill sheets
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Briefcase className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-gray-600">
              {chasingCount} POs being chased
            </span>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-brand-800" />
            <span className="text-xs text-gray-500">This Month</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{monthCases.length}</p>
          <p className="text-xs text-gray-400">cases</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-xs text-gray-500">Case Value</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(monthValue)}</p>
          <p className="text-xs text-gray-400">this month</p>
        </Card>
      </div>
    </div>
  );
}
