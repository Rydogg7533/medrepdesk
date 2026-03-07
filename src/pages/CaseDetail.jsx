import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, CheckCircle, Plus, Phone, Mail, MessageSquare, HelpCircle, CalendarClock, XCircle, RotateCcw, Bell, X } from 'lucide-react';
import { useCase, useUpdateCase, useDeleteCase } from '@/hooks/useCases';
import { useCasePOs } from '@/hooks/usePOs';
import { usePoEmailLog } from '@/hooks/usePoEmailLog';
import { useCaseCommission, useCreateCommission } from '@/hooks/useCommissions';
import { useCaseCommunications, useCreateCommunication, useUpdateCommunication } from '@/hooks/useCommunications';
import { useChaseLog, useCreateChaseEntry } from '@/hooks/useChaseLog';
import { useAuth } from '@/context/AuthContext';
import { useDistributors } from '@/hooks/useDistributors';
import { useBillSheetItems } from '@/hooks/useBillSheetItems';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BottomSheet from '@/components/ui/BottomSheet';
import Skeleton from '@/components/ui/Skeleton';
import InfoTooltip from '@/components/ui/InfoTooltip';
import PipelineGuide from '@/components/features/PipelineGuide';
import TimeWheelPicker from '@/components/ui/TimeWheelPicker';
import { useToast } from '@/components/ui/Toast';
import POSentConfirmation from '@/components/features/POSentConfirmation';
import ChaseBottomSheet from '@/components/features/ChaseBottomSheet';
import ChaseTimeline from '@/components/features/ChaseTimeline';
import { formatDate, formatTime, formatCurrency } from '@/utils/formatters';
import { CASE_STATUSES } from '@/utils/constants';
import { getProductLabel } from '@/utils/productCatalog';
import { canMarkComplete } from '@/utils/caseLogic';

const STATUS_ORDER = [
  'scheduled', 'completed',
  'bill_sheet_submitted', 'po_requested',
  'po_received', 'billed', 'paid',
];

const COMM_TYPE_ICONS = {
  call: Phone,
  email: Mail,
  text: MessageSquare,
  in_person: CheckCircle,
  voicemail: Phone,
  note: MessageSquare,
};

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: caseData, isLoading } = useCase(id);
  const { data: casePOs = [] } = useCasePOs(id);
  const sentPO = casePOs.find((po) => po.po_email_sent);
  const { data: emailLog } = usePoEmailLog(sentPO?.id);
  const { data: caseCommission } = useCaseCommission(id);
  const { data: caseCommunications = [] } = useCaseCommunications(id);
  const { data: chaseEntries = [] } = useChaseLog(id);
  const { data: distributors = [] } = useDistributors();
  const { data: billSheetItems = [] } = useBillSheetItems(id);
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();
  const toast = useToast();
  const createCommission = useCreateCommission();
  const createCommunication = useCreateCommunication();
  const updateCommunication = useUpdateCommunication();
  const createChase = useCreateChaseEntry();
  const [showDelete, setShowDelete] = useState(false);
  const [showAddCommission, setShowAddCommission] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time_hour: '7', time_minute: '00', time_period: 'AM' });
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showChase, setShowChase] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [customHours, setCustomHours] = useState('');

  const procLabel = (type) => getProductLabel(type);

  async function advanceStatus(newStatus) {
    await updateCase.mutateAsync({ id, status: newStatus });
  }

  async function handleDelete() {
    try {
      await deleteCase.mutateAsync(id);
      navigate('/cases', { replace: true });
      toast({ message: 'Case deleted', type: 'success' });
    } catch (err) {
      console.error('Failed to delete case:', err);
      toast({ message: err.message || 'Failed to delete case', type: 'error' });
    }
  }

  async function handleReschedule() {
    if (!rescheduleForm.date) return;

    // Convert 12h picker values to HH:MM:SS
    let scheduled_time = null;
    if (rescheduleForm.time_hour && rescheduleForm.time_minute) {
      let h = parseInt(rescheduleForm.time_hour);
      if (rescheduleForm.time_period === 'PM' && h !== 12) h += 12;
      if (rescheduleForm.time_period === 'AM' && h === 12) h = 0;
      scheduled_time = `${String(h).padStart(2, '0')}:${rescheduleForm.time_minute}:00`;
    }

    const oldDate = formatDate(caseData.scheduled_date);
    const oldTime = formatTime(caseData.scheduled_time);
    const newDate = formatDate(rescheduleForm.date);
    const newTime = scheduled_time ? formatTime(scheduled_time) : null;

    await updateCase.mutateAsync({
      id,
      scheduled_date: rescheduleForm.date,
      scheduled_time,
    });

    const oldLabel = caseData.scheduled_time ? `${oldDate} ${oldTime}` : oldDate;
    const newLabel = newTime ? `${newDate} ${newTime}` : newDate;
    await createCommunication.mutateAsync({
      case_id: id,
      comm_type: 'note',
      notes: `Case rescheduled from ${oldLabel} to ${newLabel}`,
    });
    setShowReschedule(false);
    setRescheduleForm({ date: '', time_hour: '7', time_minute: '00', time_period: 'AM' });
  }

  async function handleCancel() {
    const updatedNotes = [caseData.notes, cancelReason].filter(Boolean).join('\n');
    await updateCase.mutateAsync({ id, status: 'cancelled', notes: updatedNotes });
    setShowCancel(false);
    setCancelReason('');
  }

  async function handleReactivate() {
    await updateCase.mutateAsync({ id, status: 'scheduled' });
  }

  async function handleAutoCommission() {
    // If bill sheet items exist, calculate from those
    if (billSheetItems.length > 0) {
      const totalCommission = billSheetItems.reduce((sum, item) => sum + (item.commission_amount || 0), 0);
      const totalCaseValue = billSheetItems.reduce((sum, item) => sum + (item.total || 0), 0);
      await createCommission.mutateAsync({
        case_id: id,
        distributor_id: caseData.distributor_id,
        commission_type: 'percentage',
        case_value: totalCaseValue,
        expected_amount: totalCommission,
      });
      setShowAddCommission(false);
      return;
    }

    // Otherwise use distributor defaults
    const dist = distributors.find((d) => d.id === caseData.distributor_id);
    if (!dist) return;

    const commType = dist.default_commission_type || 'percentage';
    const rate = dist.default_commission_rate;
    const flatAmount = dist.default_flat_amount;
    const caseValue = caseData.case_value;
    let expectedAmount = null;

    if (commType === 'percentage' && rate && caseValue) {
      expectedAmount = (caseValue * rate) / 100;
    } else if (commType === 'flat' && flatAmount) {
      expectedAmount = flatAmount;
    }

    await createCommission.mutateAsync({
      case_id: id,
      distributor_id: dist.id,
      commission_type: commType,
      rate: commType === 'percentage' ? rate : null,
      flat_amount: commType === 'flat' ? flatAmount : null,
      case_value: caseValue,
      expected_amount: expectedAmount,
    });
    setShowAddCommission(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">Case not found</div>
    );
  }

  const normalizedStatus = caseData.status === 'confirmed' ? 'scheduled' : caseData.status;
  const currentIdx = STATUS_ORDER.indexOf(normalizedStatus);
  const hasDistributorDefaults = !!distributors.find(
    (d) => d.id === caseData.distributor_id && (d.default_commission_rate || d.default_flat_amount)
  );

  // Chase summary
  const lastChase = chaseEntries[0];
  const lastPromised = chaseEntries.find((e) => e.promised_date)?.promised_date;
  const promisedOverdue = lastPromised && lastPromised < new Date().toISOString().split('T')[0];
  const nextFollowUp = chaseEntries.find((e) => e.next_follow_up && !e.follow_up_done)?.next_follow_up;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400 dark:text-gray-500">{caseData.case_number}</p>
          <StatusBadge status={caseData.status} type="case" />
        </div>
        <button
          onClick={() => navigate(`/cases/${id}/edit`)}
          className="min-h-touch p-2 text-gray-500 dark:text-gray-400"
        >
          <Edit2 className="h-5 w-5" />
        </button>
      </div>

      {/* Status Timeline */}
      <Card className="mb-4">
        <div className="mb-3 flex items-center gap-1">
          <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Pipeline</h3>
          <button
            onClick={() => setShowPipeline(true)}
            className="inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
            aria-label="Pipeline guide"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STATUS_ORDER.map((s, i) => {
            const config = CASE_STATUSES[s];
            const isActive = i <= currentIdx;
            const isCurrent = s === caseData.status;
            return (
              <div key={s} className="flex flex-col items-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isCurrent
                      ? 'bg-brand-800 text-white'
                      : isActive
                        ? 'bg-brand-100 text-brand-800 dark:text-brand-400'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {isActive ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className="mt-1 max-w-[56px] text-center text-[9px] leading-tight text-gray-500 dark:text-gray-400">
                  {config?.label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Info */}
      <Card className="mb-4">
        <div className="space-y-3">
          <InfoRow label="Surgeon" value={caseData.surgeon?.full_name} />
          <InfoRow label="Facility" value={caseData.facility?.name} />
          <InfoRow label="Distributor" value={caseData.distributor?.name} />
          <InfoRow label="Procedure" value={caseData.procedure_type ? procLabel(caseData.procedure_type) : null} />
          <InfoRow label="Date of Surgery" value={formatDate(caseData.scheduled_date)} />
          <InfoRow label="Time" value={formatTime(caseData.scheduled_time)} />
          <InfoRow label="Case Value" value={caseData.case_value ? formatCurrency(caseData.case_value) : 'Pending'} />
        </div>
      </Card>

      {/* Reminders */}
      {['scheduled', 'confirmed'].includes(caseData.status) && (
        <Card className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              <Bell className="mr-1 inline h-3.5 w-3.5" />
              Reminders
            </h3>
            <button
              onClick={() => setShowReminderPicker(true)}
              className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-400"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(caseData.reminder_offsets || [24]).sort((a, b) => b - a).map((hours) => (
              <span
                key={hours}
                className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-800 dark:bg-brand-900/30 dark:text-brand-400"
              >
                {hours >= 24 ? `${hours / 24}d` : `${hours}hr${hours !== 1 ? 's' : ''}`} before
                <button
                  type="button"
                  onClick={async () => {
                    const newOffsets = (caseData.reminder_offsets || [24]).filter((h) => h !== hours);
                    if (newOffsets.length === 0) return;
                    await updateCase.mutateAsync({ id, reminder_offsets: newOffsets });
                  }}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-brand-200 dark:hover:bg-brand-800/50"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          {(caseData.reminder_offsets || [24]).length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">No reminders set</p>
          )}
        </Card>
      )}

      {/* Notes */}
      {caseData.notes && (
        <Card className="mb-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{caseData.notes}</p>
        </Card>
      )}

      {/* PO Section */}
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Purchase Orders</h3>
          <button
            onClick={() => navigate(`/po/new?caseId=${id}`)}
            className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add PO
          </button>
        </div>
        {casePOs.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No POs yet</p>
        ) : (
          <div className="space-y-2">
            {casePOs.map((po) => (
              <button
                key={po.id}
                onClick={() => navigate(`/po/${po.id}`)}
                className="flex w-full items-center justify-between rounded-lg bg-slate-50 dark:bg-gray-700/50 px-3 py-2 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">INV: {po.invoice_number}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(po.amount)}</p>
                </div>
                <StatusBadge status={po.status} type="po" />
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Chase Summary */}
      {casePOs.length > 0 && (
        <Card className="mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Chase Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400 dark:text-gray-500">Chase Attempts</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{chaseEntries.length}</span>
            </div>
            {lastPromised && (
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-gray-500">Last Promised</span>
                <span className={`font-medium ${promisedOverdue ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                  {formatDate(lastPromised)} {promisedOverdue && '(overdue)'}
                </span>
              </div>
            )}
            {lastChase && (
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-gray-500">Last Follow-Up</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(lastChase.created_at)}</span>
              </div>
            )}
            {nextFollowUp && (
              <div className="flex justify-between">
                <span className="text-gray-400 dark:text-gray-500">Next Follow-Up</span>
                <span className="font-medium text-brand-800 dark:text-brand-400">{formatDate(nextFollowUp)}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Chase Activity Timeline */}
      {chaseEntries.length > 0 && (
        <Card className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Chase Activity</h3>
            <button
              onClick={() => setShowChase(true)}
              className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-400"
            >
              <Plus className="h-3.5 w-3.5" /> Log Chase
            </button>
          </div>
          <ChaseTimeline entries={chaseEntries} />
        </Card>
      )}

      {/* PO Sent to Manufacturer */}
      {sentPO && emailLog && (
        <POSentConfirmation
          emailLog={emailLog}
          contactName={caseData.distributor?.billing_contact_name}
          poNumber={sentPO.po_number}
          amount={sentPO.amount}
        />
      )}

      {/* Commission Section */}
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Commission</h3>
          {!caseCommission && ['completed', 'bill_sheet_submitted', 'po_requested', 'billed', 'po_received', 'paid'].includes(caseData.status) && (
            <button
              onClick={() => {
                if (hasDistributorDefaults) {
                  setShowAddCommission(true);
                } else {
                  navigate(`/commissions/new?caseId=${id}`);
                }
              }}
              className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-400"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          )}
        </div>
        {caseCommission ? (
          <button
            onClick={() => navigate(`/commissions/${caseCommission.id}`)}
            className="flex w-full items-center justify-between rounded-lg bg-slate-50 dark:bg-gray-700/50 px-3 py-2 text-left"
          >
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {formatCurrency(caseCommission.expected_amount)} expected
              </p>
              {caseCommission.received_amount != null && (
                <p className="text-xs text-green-600">{formatCurrency(caseCommission.received_amount)} received</p>
              )}
            </div>
            <StatusBadge status={caseCommission.status} type="commission" />
          </button>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">No commission yet</p>
        )}
      </Card>

      {/* Communications Section */}
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Communications</h3>
          <button
            onClick={() => navigate(`/communications/new?caseId=${id}`)}
            className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-400"
          >
            <Plus className="h-3.5 w-3.5" /> Log
          </button>
        </div>
        {caseCommunications.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No communications yet</p>
        ) : (
          <div className="space-y-2">
            {caseCommunications.slice(0, 5).map((comm) => {
              const Icon = COMM_TYPE_ICONS[comm.comm_type] || MessageSquare;
              const today = new Date().toISOString().split('T')[0];
              const hasFollowUp = !comm.follow_up_done && comm.follow_up_date;
              const isOverdue = hasFollowUp && comm.follow_up_date <= today;
              return (
                <div key={comm.id} className="flex items-start gap-2 rounded-lg bg-slate-50 dark:bg-gray-700/50 px-3 py-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {comm.contact_name || comm.comm_type}
                      </p>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(comm.created_at)}</span>
                    </div>
                    {hasFollowUp && (
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isOverdue
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                        }`}>
                          {isOverdue ? `Follow-up due ${formatDate(comm.follow_up_date)}` : `Follow-up ${formatDate(comm.follow_up_date)}`}
                        </span>
                        {isOverdue && (
                          <button
                            onClick={() => updateCommunication.mutate({ id: comm.id, follow_up_done: true })}
                            className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 active:bg-gray-200 dark:bg-gray-600 dark:text-gray-300"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    )}
                    {comm.outcome && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{comm.outcome}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {caseCommunications.length > 5 && (
              <p className="text-center text-xs text-brand-800 dark:text-brand-400">+{caseCommunications.length - 5} more</p>
            )}
          </div>
        )}
      </Card>

      {/* Reschedule History */}
      {(() => {
        const rescheduleNotes = caseCommunications.filter(
          (c) => c.comm_type === 'note' && c.notes?.includes('Case rescheduled')
        );
        if (rescheduleNotes.length === 0) return null;
        return (
          <Card className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
              Reschedule History
            </h3>
            <div className="space-y-1">
              {rescheduleNotes.map((note) => (
                <div key={note.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{note.notes}</span>
                  <span className="shrink-0 text-gray-400 dark:text-gray-500">{formatDate(note.created_at)}</span>
                </div>
              ))}
            </div>
          </Card>
        );
      })()}

      {/* Actions */}
      <div className="space-y-2">
        {['scheduled', 'confirmed'].includes(caseData.status) && (
          <>
            <Button
              fullWidth
              loading={updateCase.isPending}
              onClick={() => advanceStatus('completed')}
              disabled={!canMarkComplete(caseData.scheduled_date)}
            >
              Mark Completed
            </Button>
            {!canMarkComplete(caseData.scheduled_date) && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                This case is scheduled for {formatDate(caseData.scheduled_date)} — it can be marked complete on or after the day of surgery.
              </p>
            )}
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                let time_hour = '7', time_minute = '00', time_period = 'AM';
                if (caseData.scheduled_time) {
                  const [h, m] = caseData.scheduled_time.split(':');
                  const h24 = parseInt(h);
                  time_period = h24 >= 12 ? 'PM' : 'AM';
                  time_hour = String(h24 % 12 || 12);
                  time_minute = m?.slice(0, 2) || '00';
                }
                setRescheduleForm({ date: '', time_hour, time_minute, time_period });
                setShowReschedule(true);
              }}
            >
              <CalendarClock className="h-4 w-4" />
              Reschedule
            </Button>
            <Button
              variant="outline"
              fullWidth
              className="text-red-500"
              onClick={() => setShowCancel(true)}
            >
              <XCircle className="h-4 w-4" />
              Cancel Case
            </Button>
          </>
        )}
        {caseData.status === 'cancelled' && (
          <Button fullWidth loading={updateCase.isPending} onClick={handleReactivate}>
            <RotateCcw className="h-4 w-4" />
            Reactivate Case
          </Button>
        )}
        {caseData.status === 'completed' && (
          <Button fullWidth onClick={() => navigate(`/bill-sheet?caseId=${id}`)}>
            Log Bill Sheet
          </Button>
        )}
        {['bill_sheet_submitted', 'po_requested'].includes(caseData.status) && (
          <Button fullWidth onClick={() => setShowChase(true)}>
            Chase PO
          </Button>
        )}

        {user?.role === 'owner' && !['scheduled', 'confirmed'].includes(caseData.status) && (
          <Button
            variant="outline"
            fullWidth
            className="mt-4 text-red-500"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Case
          </Button>
        )}
      </div>

      {/* Auto-Commission Sheet */}
      <BottomSheet isOpen={showAddCommission} onClose={() => setShowAddCommission(false)} title="Add Commission">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Auto-calculate from distributor defaults or enter manually?
          </p>
          <Button fullWidth loading={createCommission.isPending} onClick={handleAutoCommission}>
            Auto-Calculate
          </Button>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              setShowAddCommission(false);
              navigate(`/commissions/new?caseId=${id}`);
            }}
          >
            Enter Manually
          </Button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Case"
        message={`Delete ${caseData.case_number}? This will also delete all related bill sheets, POs, chase logs, communications, and commissions. This cannot be undone.`}
        confirmLabel="Delete"
      />

      <PipelineGuide isOpen={showPipeline} onClose={() => setShowPipeline(false)} currentStatus={caseData.status} />

      {/* Chase PO Bottom Sheet */}
      <ChaseBottomSheet
        isOpen={showChase}
        onClose={() => setShowChase(false)}
        caseId={id}
        caseNumber={caseData.case_number}
        facilityName={caseData.facility?.name}
        facilityPhone={caseData.facility?.billing_phone || caseData.facility?.phone}
        facilityEmail={caseData.distributor?.billing_email}
        facilityId={caseData.facility_id}
        poId={casePOs[0]?.id}
      />

      {/* Reminder Picker */}
      <BottomSheet isOpen={showReminderPicker} onClose={() => { setShowReminderPicker(false); setCustomHours(''); }} title="Add Reminder">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">How long before surgery?</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 4, 8, 12, 24, 48, 72].map((hrs) => {
              const existing = caseData?.reminder_offsets || [24];
              const alreadySet = existing.includes(hrs);
              return (
                <button
                  key={hrs}
                  disabled={alreadySet}
                  onClick={async () => {
                    const newOffsets = [...(caseData.reminder_offsets || [24]), hrs];
                    await updateCase.mutateAsync({ id, reminder_offsets: newOffsets });
                    setShowReminderPicker(false);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    alreadySet
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 active:bg-brand-100'
                  }`}
                >
                  {hrs >= 24 ? `${hrs / 24} day${hrs > 24 ? 's' : ''}` : `${hrs} hr${hrs !== 1 ? 's' : ''}`}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <input
              type="number"
              min="1"
              max="168"
              placeholder="Custom hours"
              value={customHours}
              onChange={(e) => setCustomHours(e.target.value)}
              className="flex-1 min-h-touch rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <Button
              size="sm"
              disabled={!customHours || parseInt(customHours) < 1}
              onClick={async () => {
                const hrs = parseInt(customHours);
                if (!hrs || hrs < 1) return;
                const existing = caseData.reminder_offsets || [24];
                if (existing.includes(hrs)) return;
                await updateCase.mutateAsync({ id, reminder_offsets: [...existing, hrs] });
                setShowReminderPicker(false);
                setCustomHours('');
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Reschedule Sheet */}
      <BottomSheet isOpen={showReschedule} onClose={() => setShowReschedule(false)} title="Reschedule Case">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Currently scheduled: {formatDate(caseData.scheduled_date)}
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
          <Button fullWidth loading={updateCase.isPending} disabled={!rescheduleForm.date} onClick={handleReschedule}>
            Reschedule
          </Button>
        </div>
      </BottomSheet>

      {/* Cancel Sheet */}
      <BottomSheet isOpen={showCancel} onClose={() => setShowCancel(false)} title="Cancel this case?">
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
            <Button variant="secondary" fullWidth onClick={() => setShowCancel(false)}>
              Keep Case
            </Button>
            <Button variant="danger" fullWidth loading={updateCase.isPending} onClick={handleCancel}>
              Cancel Case
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-700 dark:text-gray-300">{value || '—'}</span>
    </div>
  );
}
