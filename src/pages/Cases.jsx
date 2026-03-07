import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Search, HelpCircle, MoreHorizontal } from 'lucide-react';
import { useCases, useUpdateCase } from '@/hooks/useCases';
import { useCreateCommunication } from '@/hooks/useCommunications';
import StatusBadge from '@/components/ui/StatusBadge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import BottomSheet from '@/components/ui/BottomSheet';
import SwipeableRow from '@/components/ui/SwipeableRow';
import { formatDate, formatTime, formatCurrency } from '@/utils/formatters';
import TimeWheelPicker from '@/components/ui/TimeWheelPicker';
import { getProductLabel } from '@/utils/productCatalog';
import InfoTooltip from '@/components/ui/InfoTooltip';
import PipelineGuide from '@/components/features/PipelineGuide';
import { useToast } from '@/components/ui/Toast';
import clsx from 'clsx';

const FILTER_TABS = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled', 'confirmed'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
  { key: 'in_progress', label: 'In Progress', statuses: ['bill_sheet_submitted', 'po_requested', 'po_received', 'billed'] },
  { key: 'paid', label: 'Paid', statuses: ['paid'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled'] },
];

export default function Cases() {
  const navigate = useNavigate();
  const { data: cases, isLoading } = useCases();
  const updateCase = useUpdateCase();
  const createCommunication = useCreateCommunication();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showPipeline, setShowPipeline] = useState(false);
  const [overflowCase, setOverflowCase] = useState(null);
  const [cancelCase, setCancelCase] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleCase, setRescheduleCase] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time_hour: '7', time_minute: '00', time_period: 'AM' });

  const filtered = useMemo(() => {
    if (!cases) return [];
    const tab = FILTER_TABS.find((t) => t.key === activeTab);
    let result = cases;
    if (tab?.statuses) {
      result = result.filter((c) => tab.statuses.includes(c.status));
    } else {
      // "All" tab excludes cancelled
      result = result.filter((c) => c.status !== 'cancelled');
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.case_number?.toLowerCase().includes(q) ||
          c.surgeon?.full_name?.toLowerCase().includes(q) ||
          c.facility?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cases, activeTab, search]);

  const procLabel = (type) => getProductLabel(type);

  async function handleComplete(c, e) {
    e.stopPropagation();
    await updateCase.mutateAsync({ id: c.id, status: 'completed' });
    toast.success('Case marked completed');
  }

  async function handleCancelConfirm() {
    if (!cancelCase) return;
    const updatedNotes = [cancelCase.notes, cancelReason].filter(Boolean).join('\n');
    await updateCase.mutateAsync({ id: cancelCase.id, status: 'cancelled', notes: updatedNotes });
    setCancelCase(null);
    setCancelReason('');
    toast.success('Case cancelled');
  }

  async function handleRescheduleConfirm() {
    if (!rescheduleCase || !rescheduleForm.date) return;

    let scheduled_time = null;
    if (rescheduleForm.time_hour && rescheduleForm.time_minute) {
      let h = parseInt(rescheduleForm.time_hour);
      if (rescheduleForm.time_period === 'PM' && h !== 12) h += 12;
      if (rescheduleForm.time_period === 'AM' && h === 12) h = 0;
      scheduled_time = `${String(h).padStart(2, '0')}:${rescheduleForm.time_minute}:00`;
    }

    const oldDate = formatDate(rescheduleCase.scheduled_date);
    const oldTime = formatTime(rescheduleCase.scheduled_time);
    const newDate = formatDate(rescheduleForm.date);
    const newTime = scheduled_time ? formatTime(scheduled_time) : null;

    await updateCase.mutateAsync({
      id: rescheduleCase.id,
      scheduled_date: rescheduleForm.date,
      scheduled_time,
    });

    const oldLabel = rescheduleCase.scheduled_time ? `${oldDate} ${oldTime}` : oldDate;
    const newLabel = newTime ? `${newDate} ${newTime}` : newDate;
    await createCommunication.mutateAsync({
      case_id: rescheduleCase.id,
      comm_type: 'note',
      notes: `Case rescheduled from ${oldLabel} to ${newLabel}`,
    });
    setRescheduleCase(null);
    setRescheduleForm({ date: '', time_hour: '7', time_minute: '00', time_period: 'AM' });
    toast.success('Case rescheduled');
  }

  const isScheduled = (status) => ['scheduled', 'confirmed'].includes(status);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-1">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cases</h1>
        <InfoTooltip text="Cases track every surgical procedure from scheduling through payment. Each case gets a unique MRD number and moves through the status pipeline automatically." />
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-touch w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gray-500 focus:ring-0 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500"
        />
      </div>

      {/* Filter Tabs */}
      <div className="mb-1 flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
        <button
          onClick={() => setShowPipeline(true)}
          className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          aria-label="Pipeline guide"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mb-4 flex overflow-x-auto border-b border-gray-700">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'shrink-0 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-brand-600 text-white font-semibold'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Case List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No cases found"
          description={search ? 'Try a different search' : 'Create your first case to get started'}
          actionLabel="New Case"
          onAction={() => navigate('/cases/new')}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const card = (
              <div
                key={c.id}
                onClick={() => navigate(`/cases/${c.id}`)}
                className="themed-card cursor-pointer rounded-xl bg-white p-4 shadow-sm active:bg-gray-50 dark:bg-gray-800 dark:active:bg-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{c.case_number}<InfoTooltip text="Your unique case number (MRD-XXXX-YYYY-0001) is auto-generated from your account prefix, year, and sequence." /></p>
                    <p className="mt-0.5 font-medium text-gray-800 dark:text-gray-200">
                      {c.surgeon?.full_name || 'No surgeon'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {c.facility?.name || 'No facility'}
                    </p>
                  </div>
                  <StatusBadge status={c.status} type="case" />
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                  <span>{formatDate(c.scheduled_date)}</span>
                  {c.procedure_type && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {procLabel(c.procedure_type)}
                    </span>
                  )}
                  <span className="ml-auto font-medium text-gray-600 dark:text-gray-300">
                    {c.case_value ? formatCurrency(c.case_value) : '—'}
                  </span>
                </div>
                {/* Scheduled card actions */}
                {isScheduled(c.status) && (
                  <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" loading={updateCase.isPending} onClick={(e) => handleComplete(c, e)}>
                      Complete
                    </Button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOverflowCase(c); }}
                      className="ml-auto rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-gray-600 dark:border-gray-600 dark:hover:text-gray-300"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );

            if (isScheduled(c.status)) {
              return (
                <SwipeableRow
                  key={c.id}
                  mode="deactivate"
                  onSwipe={() => { setCancelCase(c); return false; }}
                >
                  {card}
                </SwipeableRow>
              );
            }

            return <div key={c.id}>{card}</div>;
          })}
        </div>
      )}

      <PipelineGuide isOpen={showPipeline} onClose={() => setShowPipeline(false)} />

      {/* Overflow menu for scheduled cards */}
      <BottomSheet isOpen={!!overflowCase} onClose={() => setOverflowCase(null)} title={overflowCase?.case_number}>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            fullWidth
            onClick={() => {
              const c = overflowCase;
              setOverflowCase(null);
              {
                let th = '7', tm = '00', tp = 'AM';
                if (c?.scheduled_time) {
                  const [hh, mm] = c.scheduled_time.split(':');
                  const h24 = parseInt(hh);
                  tp = h24 >= 12 ? 'PM' : 'AM';
                  th = String(h24 % 12 || 12);
                  tm = mm?.slice(0, 2) || '00';
                }
                setRescheduleForm({ date: '', time_hour: th, time_minute: tm, time_period: tp });
                setRescheduleCase(c);
              }
            }}
          >
            Reschedule
          </Button>
          <Button
            variant="outline"
            fullWidth
            className="text-red-500"
            onClick={() => {
              const c = overflowCase;
              setOverflowCase(null);
              setCancelCase(c);
            }}
          >
            Cancel Case
          </Button>
        </div>
      </BottomSheet>

      {/* Cancel BottomSheet */}
      <BottomSheet isOpen={!!cancelCase} onClose={() => { setCancelCase(null); setCancelReason(''); }} title="Cancel this case?">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Reason (optional)</label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Why is this case being cancelled?"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => { setCancelCase(null); setCancelReason(''); }}>
              Keep Case
            </Button>
            <Button variant="danger" fullWidth loading={updateCase.isPending} onClick={handleCancelConfirm}>
              Cancel Case
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Reschedule BottomSheet */}
      <BottomSheet isOpen={!!rescheduleCase} onClose={() => { setRescheduleCase(null); setRescheduleForm({ date: '', time_hour: '7', time_minute: '00', time_period: 'AM' }); }} title="Reschedule Case">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Currently scheduled: {rescheduleCase ? formatDate(rescheduleCase.scheduled_date) : ''}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">New Date *</label>
            <input
              type="date"
              required
              value={rescheduleForm.date}
              onChange={(e) => setRescheduleForm((f) => ({ ...f, date: e.target.value }))}
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Time</label>
            <TimeWheelPicker
              hour={rescheduleForm.time_hour}
              minute={rescheduleForm.time_minute}
              period={rescheduleForm.time_period}
              onChangeHour={(v) => setRescheduleForm((f) => ({ ...f, time_hour: v }))}
              onChangeMinute={(v) => setRescheduleForm((f) => ({ ...f, time_minute: v }))}
              onChangePeriod={(v) => setRescheduleForm((f) => ({ ...f, time_period: v }))}
            />
          </div>
          <Button fullWidth loading={updateCase.isPending} disabled={!rescheduleForm.date} onClick={handleRescheduleConfirm}>
            Reschedule
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
