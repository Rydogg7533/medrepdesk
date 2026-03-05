import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, CheckCircle, Plus, Phone, Mail, MessageSquare, HelpCircle, CalendarClock, XCircle, RotateCcw } from 'lucide-react';
import { useCase, useUpdateCase, useDeleteCase } from '@/hooks/useCases';
import { useCasePOs } from '@/hooks/usePOs';
import { usePoEmailLog } from '@/hooks/usePoEmailLog';
import { useCaseCommission, useCreateCommission } from '@/hooks/useCommissions';
import { useCaseCommunications, useCreateCommunication } from '@/hooks/useCommunications';
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
import { useToast } from '@/components/ui/Toast';
import POSentConfirmation from '@/components/features/POSentConfirmation';
import { formatDate, formatTime, formatCurrency } from '@/utils/formatters';
import { CASE_STATUSES } from '@/utils/constants';
import { getProductLabel } from '@/utils/productCatalog';

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
  const createChase = useCreateChaseEntry();
  const [showDelete, setShowDelete] = useState(false);
  const [showAddCommission, setShowAddCommission] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '' });
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

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
    const oldDate = formatDate(caseData.scheduled_date);
    const newDate = formatDate(rescheduleForm.date);
    await updateCase.mutateAsync({
      id,
      scheduled_date: rescheduleForm.date,
      ...(rescheduleForm.time && { scheduled_time: rescheduleForm.time }),
    });
    await createCommunication.mutateAsync({
      case_id: id,
      comm_type: 'note',
      notes: `Case rescheduled from ${oldDate} to ${newDate}`,
    });
    setShowReschedule(false);
    setRescheduleForm({ date: '', time: '' });
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

  const currentIdx = STATUS_ORDER.indexOf(caseData.status);
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
          <h3 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Pipeline</h3>
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
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
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

      {/* Notes */}
      {caseData.notes && (
        <Card className="mb-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{caseData.notes}</p>
        </Card>
      )}

      {/* PO Section */}
      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Purchase Orders</h3>
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
          <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Chase Summary</h3>
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
          <h3 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Commission</h3>
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
          <h3 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Communications</h3>
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
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
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
            <Button fullWidth loading={updateCase.isPending} onClick={() => advanceStatus('completed')}>
              Mark Completed
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setRescheduleForm({ date: '', time: caseData.scheduled_time || '' });
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
        {['bill_sheet_submitted', 'po_requested'].includes(caseData.status) && casePOs.length > 0 && (
          <Button fullWidth onClick={() => navigate(`/po/${casePOs[0].id}`)}>
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
            <input
              type="time"
              value={rescheduleForm.time}
              onChange={(e) => setRescheduleForm((f) => ({ ...f, time: e.target.value }))}
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
      <span className="text-gray-400 dark:text-gray-500">{label}</span>
      <span className="font-medium text-gray-700 dark:text-gray-300">{value || '—'}</span>
    </div>
  );
}
