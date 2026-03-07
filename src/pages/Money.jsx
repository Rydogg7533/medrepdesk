import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DollarSign, FileText, Calendar, ChevronRight, ClipboardList, Send } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { usePOs, useCreatePO } from '@/hooks/usePOs';
import { useCommissions, useUpdateCommission } from '@/hooks/useCommissions';
import { usePayPeriods, useEnsurePayPeriods } from '@/hooks/usePayPeriods';
import { useBillSheets } from '@/hooks/useBillSheets';
import ChaseBottomSheet from '@/components/features/ChaseBottomSheet';
import ChaseTimeline from '@/components/features/ChaseTimeline';
import { useChaseLog } from '@/hooks/useChaseLog';
import { useSendPOEmail } from '@/hooks/usePOEmail';
import { useAuth } from '@/context/AuthContext';
import { useDistributor } from '@/hooks/useDistributors';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import BottomSheet from '@/components/ui/BottomSheet';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';

const tabs = [
  { key: 'bill_sheets', label: 'Bill Sheets' },
  { key: 'pos', label: 'POs' },
  { key: 'commissions', label: 'Commissions' },
  { key: 'pay_periods', label: 'Pay' },
];

const PO_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'received', label: 'Received' },
  { key: 'disputed', label: 'Disputed' },
  { key: 'archive', label: 'Archive' },
];

const COMM_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'received', label: 'Received' },
  { key: 'disputed', label: 'Disputed' },
  { key: 'written_off', label: 'Written Off' },
];

export default function Money() {
  const [searchParams] = useSearchParams();
  const initialTab = tabs.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'bill_sheets';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [poFilter, setPOFilter] = useState('all');
  const [commFilter, setCommFilter] = useState('all');
  const [billSheetView, setBillSheetView] = useState('active');
  const [chaseTarget, setChaseTarget] = useState(null); // bill sheet object for chase bottom sheet
  const [recordTarget, setRecordTarget] = useState(null); // bill sheet object for record PO bottom sheet
  const [billSheetDetail, setBillSheetDetail] = useState(null); // bill sheet object for detail bottom sheet
  const [showSendPrompt, setShowSendPrompt] = useState(false);
  const [pendingPOData, setPendingPOData] = useState(null); // deferred PO data
  const [pendingRecordTarget, setPendingRecordTarget] = useState(null); // bill sheet for deferred PO
  const [createdPO, setCreatedPO] = useState(null);
  const [sendManufacturer, setSendManufacturer] = useState(null);
  const [poForm, setPOForm] = useState({
    po_number: '',
    amount: '',
    received_date: new Date().toISOString().split('T')[0],
  });
  // Commission confirm/dispute state
  const [commActionTarget, setCommActionTarget] = useState(null); // commission object
  const [showCommConfirm, setShowCommConfirm] = useState(false);
  const [commConfirmAmount, setCommConfirmAmount] = useState('');
  const [commConfirmDate, setCommConfirmDate] = useState('');
  const [showCommDispute, setShowCommDispute] = useState(false);
  const [commDisputeNote, setCommDisputeNote] = useState('');

  // Unified dispute resolve/write-off state — works from PO or Commission entry
  const [resolveTarget, setResolveTarget] = useState(null); // { type: 'po'|'commission', po?, commission?, case_id }
  const [showResolve, setShowResolve] = useState(false);
  const [resolveStep, setResolveStep] = useState('choose'); // 'choose' | 'po_wrong' | 'commission_short'
  const [resolveCorrectPOAmount, setResolveCorrectPOAmount] = useState('');
  const [resolveReceivedAmount, setResolveReceivedAmount] = useState('');
  const [resolveNote, setResolveNote] = useState('');
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [writeOffTarget, setWriteOffTarget] = useState(null); // same shape as resolveTarget
  const [writeOffNote, setWriteOffNote] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const updateCommission = useUpdateCommission();

  const { account } = useAuth();
  const distributorId = account?.primary_distributor_id;
  const { data: distributor } = useDistributor(distributorId);
  const paySchedule = distributor?.pay_schedule;

  const { data: allBillSheets = [], isLoading: billSheetsLoading } = useBillSheets();
  const { data: allPOs = [], isLoading: posLoading } = usePOs();
  const { data: allCommissions = [], isLoading: commsLoading } = useCommissions();
  const { data: allPayPeriods = [], isLoading: periodsLoading } = usePayPeriods(distributorId);
  const ensurePayPeriods = useEnsurePayPeriods(distributorId, paySchedule);
  const createPO = useCreatePO();
  const sendPOEmail = useSendPOEmail();
  const { data: detailChaseEntries = [] } = useChaseLog(billSheetDetail?.caseId);

  // Auto-generate missing pay periods on mount when schedule is configured
  useEffect(() => {
    if (paySchedule?.frequency && paySchedule?.first_pay_date && distributorId) {
      ensurePayPeriods.mutate();
    }
  }, [paySchedule?.frequency, paySchedule?.first_pay_date, distributorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPOs = poFilter === 'all'
    ? allPOs
    : poFilter === 'archive'
      ? allPOs.filter((p) => p.status === 'paid')
      : allPOs.filter((p) => p.status === poFilter);
  const filteredComms = commFilter === 'all'
    ? allCommissions
    : commFilter === 'pending'
      ? allCommissions.filter((c) => c.status === 'pending' || c.status === 'confirmed')
      : allCommissions.filter((c) => c.status === commFilter);

  // PO summary
  const outstandingPOs = allPOs.filter((p) => !['paid', 'disputed'].includes(p.status));
  const totalOutstanding = outstandingPOs.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Commission summary
  const pendingComms = allCommissions.filter((c) => c.status === 'pending' || c.status === 'confirmed');
  const totalPending = pendingComms.reduce((sum, c) => sum + (c.expected_amount || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisYear = new Date().getFullYear().toString();
  const receivedThisMonth = allCommissions
    .filter((c) => c.status === 'received' && c.received_date?.startsWith(thisMonth))
    .reduce((sum, c) => sum + (c.received_amount || 0), 0);
  const receivedYTD = allCommissions
    .filter((c) => c.status === 'received' && c.received_date?.startsWith(thisYear))
    .reduce((sum, c) => sum + (c.received_amount || 0), 0);

  // Record PO received inline — defers actual creation until Send/Skip
  function handleRecordPO(e) {
    e.preventDefault();
    if (!recordTarget || !poForm.po_number.trim() || !poForm.amount) return;

    const data = {
      po_number: poForm.po_number.trim(),
      amount: Number(poForm.amount),
      received_date: poForm.received_date || new Date().toISOString().split('T')[0],
    };

    const mfr = recordTarget.manufacturer;
    const target = recordTarget;
    setRecordTarget(null);

    if (mfr?.billing_email) {
      // Defer PO creation — show Send prompt first
      setPendingPOData(data);
      setPendingRecordTarget(target);
      setSendManufacturer(mfr);
      setShowSendPrompt(true);
    } else {
      // No manufacturer email — create PO immediately
      saveMoneyPO(data, target, false, null);
    }
  }

  async function saveMoneyPO(data, target, sendEmail, mfr) {
    try {
      const po = await createPO.mutateAsync({
        case_id: target.caseId,
        po_number: data.po_number,
        amount: data.amount,
        received_date: data.received_date,
        status: 'received',
        facility_id: target.facilityId || null,
        distributor_id: target.distributorId || null,
      });

      if (sendEmail && mfr) {
        await sendPOEmail.mutateAsync({
          po: { ...po, manufacturer: mfr },
          caseData: { case_number: target.caseNumber },
        });
        toast({ message: 'PO recorded and sent to manufacturer', type: 'success' });
      } else {
        toast({ message: 'PO recorded successfully', type: 'success' });
      }
    } catch (err) {
      toast({ message: err.message || 'Failed to record PO', type: 'error' });
    }
    setPendingPOData(null);
    setPendingRecordTarget(null);
    setPOForm({ po_number: '', amount: '', received_date: new Date().toISOString().split('T')[0] });
  }

  async function handleSendToManufacturer() {
    if (pendingPOData && pendingRecordTarget) {
      setShowSendPrompt(false);
      await saveMoneyPO(pendingPOData, pendingRecordTarget, true, sendManufacturer);
    } else if (createdPO && sendManufacturer) {
      // Legacy path for existing PO sends from bill sheet cards
      try {
        await sendPOEmail.mutateAsync({
          po: { ...createdPO, manufacturer: sendManufacturer },
          caseData: { case_number: createdPO.case_number },
        });
        setShowSendPrompt(false);
        toast({ message: 'PO sent to manufacturer', type: 'success' });
      } catch (err) {
        toast({ message: err.message || 'Failed to send email', type: 'error' });
      }
    }
  }

  function handleSkipSend() {
    if (pendingPOData && pendingRecordTarget) {
      setShowSendPrompt(false);
      saveMoneyPO(pendingPOData, pendingRecordTarget, false, null);
    } else {
      setShowSendPrompt(false);
      toast({ message: 'PO recorded successfully', type: 'success' });
    }
  }

  function handleDismissSendPrompt() {
    // Dismissing cancels everything — no PO created
    setPendingPOData(null);
    setPendingRecordTarget(null);
    setShowSendPrompt(false);
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['commissions'] });
    queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    queryClient.invalidateQueries({ queryKey: ['cases'] });
  }

  // Mark as Received: pending/confirmed → received
  async function handleMarkReceived() {
    if (!commActionTarget) return;
    setActionSubmitting(true);
    try {
      const amount = commConfirmAmount ? Number(commConfirmAmount) : commActionTarget.expected_amount;
      const receivedDate = commConfirmDate || new Date().toISOString().split('T')[0];

      await updateCommission.mutateAsync({
        id: commActionTarget.id,
        status: 'received',
        received_amount: amount,
        received_date: receivedDate,
      });

      invalidateAll();
      setShowCommConfirm(false);
      setCommActionTarget(null);
      toast({ message: 'Commission marked as received', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to mark commission received', type: 'error' });
    } finally {
      setActionSubmitting(false);
    }
  }

  // Commission Dispute: received → disputed
  async function handleCommDispute() {
    if (!commActionTarget) return;
    if (!commDisputeNote.trim()) return;
    setActionSubmitting(true);
    try {
      const notes = [commActionTarget.notes, commDisputeNote].filter(Boolean).join('\n---\n');

      await updateCommission.mutateAsync({
        id: commActionTarget.id,
        status: 'disputed',
        ...(notes && { notes }),
      });

      invalidateAll();
      setShowCommDispute(false);
      setCommActionTarget(null);
      toast({ message: 'Commission disputed — follow up with your distributor', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to dispute commission', type: 'error' });
    } finally {
      setActionSubmitting(false);
    }
  }

  // Open resolve flow — from PO card or commission card
  function openResolveFlow(target) {
    setResolveTarget(target);
    setResolveStep('choose');
    setResolveCorrectPOAmount('');
    setResolveReceivedAmount('');
    setResolveNote('');
    setShowResolve(true);
  }

  // Open write-off flow — from PO card or commission card
  function openWriteOffFlow(target) {
    setWriteOffTarget(target);
    setWriteOffNote('');
    setShowWriteOff(true);
  }

  // Unified Dispute Resolved: two-step flow, updates both commission + PO + case
  async function handleDisputeResolve() {
    if (!resolveTarget) return;
    setActionSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const caseId = resolveTarget.case_id;

      // Find linked commission
      let comm = resolveTarget.commission;
      if (!comm) {
        const { data: comms } = await supabase
          .from(TABLES.COMMISSIONS)
          .select('id, notes, received_amount, expected_amount, commission_type, rate')
          .eq('case_id', caseId)
          .eq('status', 'disputed');
        comm = comms?.[0];
      }

      // Find linked POs
      let poIds = resolveTarget.po ? [resolveTarget.po.id] : [];
      if (!poIds.length) {
        const { data: pos } = await supabase
          .from(TABLES.PURCHASE_ORDERS)
          .select('id')
          .eq('case_id', caseId);
        poIds = pos?.map((p) => p.id) || [];
      }

      const receivedAmount = resolveReceivedAmount ? Number(resolveReceivedAmount) : comm?.received_amount || comm?.expected_amount;

      // Build audit trail
      let auditNote = '';
      const commType = comm?.commission_type;
      const commRate = comm?.rate;

      if (resolveStep === 'po_wrong') {
        const correctedPO = Number(resolveCorrectPOAmount);
        auditNote = `Dispute resolved: PO amount was entered incorrectly. PO corrected to ${correctedPO}.`;
        if (commType === 'percentage' && commRate) {
          const recalculated = correctedPO * (commRate / 100);
          auditNote += ` Expected commission recalculated to ${recalculated.toFixed(2)} (${commRate}% of ${correctedPO}).`;
        }
        auditNote += ` Received: ${receivedAmount}.`;
      } else {
        auditNote = `Dispute resolved: Commission received was less than expected. Expected: ${comm?.expected_amount}, Received: ${receivedAmount}.`;
      }
      if (resolveNote) auditNote += ` Note: ${resolveNote}`;

      // Step 2A: PO amount was wrong — update PO amount + recalculate expected
      let newExpectedAmount = comm?.expected_amount;
      if (resolveStep === 'po_wrong' && resolveCorrectPOAmount) {
        const correctedPO = Number(resolveCorrectPOAmount);
        if (poIds.length) {
          await supabase
            .from(TABLES.PURCHASE_ORDERS)
            .update({ amount: correctedPO, status: 'paid', paid_date: today, updated_at: now })
            .in('id', poIds);
        }
        if (commType === 'percentage' && commRate) {
          newExpectedAmount = correctedPO * (commRate / 100);
        }
      } else {
        // Step 2B: Commission short — just mark POs paid
        if (poIds.length) {
          await supabase
            .from(TABLES.PURCHASE_ORDERS)
            .update({ status: 'paid', paid_date: today, updated_at: now })
            .in('id', poIds);
        }
      }

      // Update commission
      if (comm) {
        await updateCommission.mutateAsync({
          id: comm.id,
          status: 'received',
          received_amount: receivedAmount,
          received_date: today,
          expected_amount: newExpectedAmount,
          dispute_resolution_note: auditNote,
        });
      }

      // Mark case paid
      await supabase
        .from(TABLES.CASES)
        .update({ status: 'paid', updated_at: now })
        .eq('id', caseId);

      invalidateAll();
      setShowResolve(false);
      setResolveTarget(null);
      toast({ message: 'Dispute resolved — PO and case marked paid', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to resolve dispute', type: 'error' });
    } finally {
      setActionSubmitting(false);
    }
  }

  // Unified Write Off: commission → written_off, PO → paid, case → paid
  async function handleWriteOff() {
    if (!writeOffTarget) return;
    setActionSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const caseId = writeOffTarget.case_id;

      // Find linked commission
      let comm = writeOffTarget.commission;
      if (!comm) {
        const { data: comms } = await supabase
          .from(TABLES.COMMISSIONS)
          .select('id, notes')
          .eq('case_id', caseId)
          .eq('status', 'disputed');
        comm = comms?.[0];
      }

      // Find linked POs
      let poIds = writeOffTarget.po ? [writeOffTarget.po.id] : [];
      if (!poIds.length) {
        const { data: pos } = await supabase
          .from(TABLES.PURCHASE_ORDERS)
          .select('id')
          .eq('case_id', caseId);
        poIds = pos?.map((p) => p.id) || [];
      }

      if (comm) {
        const auditNote = `Written off.${writeOffNote ? ` Note: ${writeOffNote}` : ''}`;
        await updateCommission.mutateAsync({
          id: comm.id,
          status: 'written_off',
          dispute_resolution_note: auditNote,
        });
      }

      if (poIds.length) {
        await supabase
          .from(TABLES.PURCHASE_ORDERS)
          .update({ status: 'paid', paid_date: today, updated_at: now })
          .in('id', poIds);
      }

      await supabase
        .from(TABLES.CASES)
        .update({ status: 'paid', updated_at: now })
        .eq('id', caseId);

      invalidateAll();
      setShowWriteOff(false);
      setWriteOffTarget(null);
      toast({ message: 'Commission written off — PO and case marked paid', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to write off', type: 'error' });
    } finally {
      setActionSubmitting(false);
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Money<InfoTooltip text="Purchase orders track the billing lifecycle after a case is completed. Chase POs until received, then track payment." /></h1>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setChaseTarget(null);
              setRecordTarget(null);
              setShowSendPrompt(false);
            }}
            className={clsx(
              'shrink-0 flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-brand-800 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pos' && (
        <>
          {/* Summary */}
          <Card className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalOutstanding)}</p>
              </div>
              <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                {outstandingPOs.length} PO{outstandingPOs.length !== 1 ? 's' : ''}
              </div>
            </div>
          </Card>

          {/* Filters */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {PO_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setPOFilter(f.key)}
                className={clsx(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                  poFilter === f.key ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {posLoading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : filteredPOs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Purchase Orders"
              description="POs will appear here as you create them"
              actionLabel="Add PO"
              onAction={() => navigate('/po/new')}
            />
          ) : (
            <div className="space-y-2">
              {filteredPOs.map((po) => (
                  <Card
                    key={po.id}
                    className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                    onClick={() => navigate(`/po/${po.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {po.case?.case_number || 'No case'}
                          {po.po_number && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">· PO: {po.po_number}</span>}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(po.amount)}
                          </span>
                          {po.facility?.name && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">{po.facility.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                      </div>
                    </div>
                    {po.status === 'disputed' && (
                      <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openResolveFlow({ type: 'po', po, case_id: po.case_id })}
                          className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-medium text-white"
                        >
                          Dispute Resolved
                        </button>
                        <button
                          onClick={() => openWriteOffFlow({ type: 'po', po, case_id: po.case_id })}
                          className="flex-1 rounded-lg border border-red-300 py-2 text-xs font-medium text-red-600 dark:border-red-700 dark:text-red-400"
                        >
                          Write Off
                        </button>
                      </div>
                    )}
                  </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'commissions' && (
        <>
          {/* Summary */}
          <Card className="mb-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending<InfoTooltip text="Cases completed but not yet paid by your distributor." /></p>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalPending)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">This Month<InfoTooltip text="Payment received from your distributor this calendar month." /></p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(receivedThisMonth)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">YTD<InfoTooltip text="Total payment received from your distributor year-to-date." /></p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(receivedYTD)}</p>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {COMM_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setCommFilter(f.key)}
                className={clsx(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                  commFilter === f.key ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {commsLoading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : filteredComms.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No Commissions"
              description="Commissions will appear as you add them to cases"
              actionLabel="Add Commission"
              onAction={() => navigate('/commissions/new')}
            />
          ) : (
            <div className="space-y-2">
              {filteredComms.map((comm) => (
                <Card
                  key={comm.id}
                  className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                  onClick={() => navigate(`/commissions/${comm.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {comm.case?.case_number || 'No case'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {comm.distributor?.name || 'No distributor'}
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Expected: {formatCurrency(comm.expected_amount)}
                        </span>
                        {comm.received_amount != null && (
                          <span className="text-sm font-semibold text-green-600">
                            Received: {formatCurrency(comm.received_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={comm.status} type="commission" />
                      <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                    </div>
                  </div>
                  {(comm.status === 'pending' || comm.status === 'confirmed') && (
                    <div className="mt-3 flex border-t border-gray-100 pt-3 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setCommActionTarget(comm); setCommConfirmAmount(comm.expected_amount ? String(comm.expected_amount) : ''); setCommConfirmDate(new Date().toISOString().split('T')[0]); setShowCommConfirm(true); }}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-medium text-white"
                      >
                        Mark as Received
                      </button>
                    </div>
                  )}
                  {comm.status === 'received' && (
                    <div className="mt-3 flex border-t border-gray-100 pt-3 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setCommActionTarget(comm); setCommDisputeNote(''); setShowCommDispute(true); }}
                        className="flex-1 rounded-lg border border-red-300 py-2 text-xs font-medium text-red-600 dark:border-red-700 dark:text-red-400"
                      >
                        Dispute
                      </button>
                    </div>
                  )}
                  {comm.status === 'disputed' && (
                    <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openResolveFlow({ type: 'commission', commission: comm, case_id: comm.case_id })}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-medium text-white"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => openWriteOffFlow({ type: 'commission', commission: comm, case_id: comm.case_id })}
                        className="flex-1 rounded-lg border border-red-300 py-2 text-xs font-medium text-red-600 dark:border-red-700 dark:text-red-400"
                      >
                        Write Off
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'bill_sheets' && (
        <>
          {/* Bill Sheet Detail Bottom Sheet */}
          <BottomSheet
            isOpen={!!billSheetDetail}
            onClose={() => setBillSheetDetail(null)}
            title={billSheetDetail?.caseNumber || 'Bill Sheet'}
            fullHeight
          >
            {billSheetDetail && (
              <div className="flex flex-col gap-4">
                {/* Header info */}
                <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-gray-700/50">
                  {billSheetDetail.surgeon && (
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{billSheetDetail.surgeon}</p>
                  )}
                  {billSheetDetail.facility && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{billSheetDetail.facility}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(billSheetDetail.totalValue)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(billSheetDetail.scheduledDate)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {!billSheetDetail.hasPO && !billSheetDetail.isArchived && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setBillSheetDetail(null); setTimeout(() => setChaseTarget(billSheetDetail), 150); }}
                      className="flex-1 rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    >
                      Chase PO
                    </button>
                    <button
                      onClick={() => { setBillSheetDetail(null); setTimeout(() => { setRecordTarget(billSheetDetail); setPOForm({ po_number: '', amount: '', received_date: new Date().toISOString().split('T')[0] }); }, 150); }}
                      className="flex-1 rounded-lg bg-brand-800 py-2.5 text-sm font-medium text-white"
                    >
                      Record PO
                    </button>
                  </div>
                )}

                {/* Chase Activity Timeline */}
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Chase Activity</h3>
                  <ChaseTimeline entries={detailChaseEntries} />
                </div>

                {/* View Full Bill Sheet link */}
                <button
                  onClick={() => { setBillSheetDetail(null); navigate(`/bill-sheets/${billSheetDetail.caseId}`); }}
                  className="text-sm font-medium text-brand-800 dark:text-brand-400"
                >
                  View Full Bill Sheet
                </button>
              </div>
            )}
          </BottomSheet>

          {/* Chase PO Bottom Sheet */}
          <ChaseBottomSheet
            isOpen={!!chaseTarget}
            onClose={() => setChaseTarget(null)}
            caseId={chaseTarget?.caseId}
            caseNumber={chaseTarget?.caseNumber}
            facilityName={chaseTarget?.facility}
            facilityPhone={chaseTarget?.facilityPhone}
            facilityEmail={chaseTarget?.facilityEmail}
            facilityId={chaseTarget?.facilityId}
          />

          {/* Record PO Bottom Sheet */}
          <BottomSheet
            isOpen={!!recordTarget}
            onClose={() => setRecordTarget(null)}
            title={recordTarget ? `Record PO — ${recordTarget.caseNumber}` : 'Record PO Received'}
          >
            <form onSubmit={handleRecordPO} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">PO Number</label>
                <input
                  type="text"
                  required
                  value={poForm.po_number}
                  onChange={(e) => setPOForm((p) => ({ ...p, po_number: e.target.value }))}
                  placeholder="Enter PO number"
                  className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={poForm.amount}
                  onChange={(e) => setPOForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="0.00"
                  className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Received Date</label>
                <input
                  type="date"
                  value={poForm.received_date}
                  onChange={(e) => setPOForm((p) => ({ ...p, received_date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <Button type="submit" fullWidth loading={createPO.isPending}>
                Save PO
              </Button>
            </form>
          </BottomSheet>

          {/* Send to Manufacturer Prompt */}
          <BottomSheet isOpen={showSendPrompt} onClose={handleDismissSendPrompt} title="Send PO to Manufacturer?">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Send PO details to <span className="font-medium text-gray-900 dark:text-gray-100">{sendManufacturer?.name}</span>?
              </p>
              <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400">To</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sendManufacturer?.billing_email}</p>
                {sendManufacturer?.billing_email_cc?.filter(Boolean).length > 0 && (
                  <>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">CC</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{sendManufacturer.billing_email_cc.filter(Boolean).join(', ')}</p>
                  </>
                )}
              </div>
              {sendPOEmail.isError && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-600 dark:text-red-400">
                  {sendPOEmail.error?.message || 'Failed to send email'}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth onClick={handleSkipSend}>
                  Skip
                </Button>
                <Button fullWidth loading={sendPOEmail.isPending} onClick={handleSendToManufacturer}>
                  <Send className="h-4 w-4" /> Send
                </Button>
              </div>
            </div>
          </BottomSheet>

          {/* Active / Archived toggle */}
          <div className="mb-3 flex gap-2">
            {['active', 'archived'].map((view) => (
              <button
                key={view}
                onClick={() => setBillSheetView(view)}
                className={clsx(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium capitalize',
                  billSheetView === view ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                )}
              >
                {view}
              </button>
            ))}
          </div>

          {(() => {
            const filtered = allBillSheets.filter((bs) =>
              billSheetView === 'active' ? !bs.isArchived : bs.isArchived
            );
            const totalValue = filtered.reduce((sum, bs) => sum + bs.totalValue, 0);

            return (
              <>
                {/* Summary */}
                <Card className="mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {billSheetView === 'active' ? 'Active' : 'Archived'} Bill Sheets
                      </p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalValue)}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                      {filtered.length} sheet{filtered.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </Card>

                {billSheetsLoading ? (
                  <div className="space-y-3">
                    <Skeleton variant="card" />
                    <Skeleton variant="card" />
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title={`No ${billSheetView === 'active' ? 'Active' : 'Archived'} Bill Sheets`}
                    description="Bill sheets will appear here after you create them for cases"
                  />
                ) : (
                  <div className="space-y-2">
                    {filtered.map((bs) => (
                      <Card
                        key={bs.caseId}
                        className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                        onClick={() => setBillSheetDetail(bs)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {bs.caseNumber || 'No case number'}
                              {bs.surgeon && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">· {bs.surgeon}</span>}
                            </p>
                            {bs.facility && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{bs.facility}</p>
                            )}
                            <div className="mt-1 flex items-center gap-3">
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {formatCurrency(bs.totalValue)}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {formatDate(bs.scheduledDate)}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                              <span>{bs.items.length} item{bs.items.length !== 1 ? 's' : ''}</span>
                              <span>· submitted {formatRelativeTime(bs.submittedAt)}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                        </div>
                        {/* State 1: No PO → Chase + Record */}
                        {!bs.hasPO && !bs.isArchived && (
                          <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setChaseTarget(bs)}
                              className="flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            >
                              Chase PO
                            </button>
                            <button
                              onClick={() => { setRecordTarget(bs); setPOForm({ po_number: '', amount: '', received_date: new Date().toISOString().split('T')[0] }); }}
                              className="flex-1 rounded-lg bg-brand-800 py-2 text-xs font-medium text-white"
                            >
                              Record PO Received
                            </button>
                          </div>
                        )}
                        {/* State 2: PO received but not sent to mfr → Send to Manufacturer */}
                        {bs.hasPO && !bs.poSentToMfr && bs.manufacturer?.billing_email && (
                          <div className="mt-3 flex border-t border-gray-100 pt-3 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => { setSendManufacturer(bs.manufacturer); setCreatedPO(bs.po); setShowSendPrompt(true); }}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-800 py-2 text-xs font-medium text-white"
                            >
                              <Send className="h-3.5 w-3.5" /> Send to Manufacturer
                            </button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {activeTab === 'pay_periods' && (
        <>
          {!paySchedule?.frequency ? (
            <EmptyState
              icon={Calendar}
              title="No Pay Schedule"
              description="Set up your pay schedule in My Distributor to track pay periods"
              actionLabel="Go to My Distributor"
              onAction={() => navigate('/my-distributor')}
            />
          ) : periodsLoading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : (
            <>
              {/* Current open period card */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const current = allPayPeriods.find((p) => p.period_start <= today && p.period_end >= today && p.status === 'open');
                if (!current) return null;
                const daysLeft = Math.ceil((new Date(current.period_end) - new Date()) / 86400000);
                // Calculate running total from linked commissions
                const linkedCommsTotal = allCommissions
                  .filter((c) => c.pay_period_id === current.id)
                  .reduce((sum, c) => sum + (c.expected_amount || 0), 0);
                return (
                  <Card
                    className="mb-4 border-l-4 border-l-brand-800 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                    onClick={() => navigate(`/pay-periods/${current.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-brand-800 dark:text-brand-400">Current Period</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatDate(current.period_start)} – {formatDate(current.period_end)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {daysLeft > 0 ? `Closes in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Closing today'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(linkedCommsTotal)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Running Total</p>
                      </div>
                    </div>
                  </Card>
                );
              })()}

              {/* Closed periods needing verification */}
              {(() => {
                const closedPeriods = allPayPeriods.filter((p) => p.status === 'closed');
                if (closedPeriods.length === 0) return null;
                return (
                  <div className="mb-4">
                    <h2 className="mb-2 text-xs font-semibold uppercase text-amber-600 dark:text-amber-400">Needs Verification</h2>
                    <div className="space-y-2">
                      {closedPeriods.map((period) => (
                        <Card
                          key={period.id}
                          className="cursor-pointer border-l-4 border-l-amber-400 active:bg-gray-50 dark:active:bg-gray-700"
                          onClick={() => navigate(`/pay-periods/${period.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {formatDate(period.period_start)} – {formatDate(period.period_end)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Expected: {formatCurrency(period.expected_amount)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={period.status} type="pay_period" />
                              <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* All periods list */}
              {allPayPeriods.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No Pay Periods"
                  description="Pay periods will be generated based on your schedule"
                />
              ) : (
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">All Periods</h2>
                  <div className="space-y-2">
                    {allPayPeriods.map((period) => (
                      <Card
                        key={period.id}
                        className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                        onClick={() => navigate(`/pay-periods/${period.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {formatDate(period.period_start)} – {formatDate(period.period_end)}
                            </p>
                            {period.expected_amount != null && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Expected: {formatCurrency(period.expected_amount)}
                              </p>
                            )}
                            {period.actual_amount != null && (
                              <p className="text-xs font-medium text-green-600">
                                Received: {formatCurrency(period.actual_amount)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={period.status} type="pay_period" />
                            <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Mark as Received Bottom Sheet */}
      <BottomSheet isOpen={showCommConfirm} onClose={() => { setShowCommConfirm(false); setCommActionTarget(null); }} title="Mark as Received">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Received</label>
            <input
              type="number"
              step="0.01"
              placeholder={commActionTarget?.expected_amount ? String(commActionTarget.expected_amount) : '0.00'}
              value={commConfirmAmount}
              onChange={(e) => setCommConfirmAmount(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date Received</label>
            <input
              type="date"
              value={commConfirmDate}
              onChange={(e) => setCommConfirmDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button fullWidth loading={actionSubmitting} className="bg-green-600 hover:bg-green-700" onClick={handleMarkReceived}>
            Confirm Receipt
          </Button>
        </div>
      </BottomSheet>

      {/* Commission Dispute Bottom Sheet */}
      <BottomSheet isOpen={showCommDispute} onClose={() => { setShowCommDispute(false); setCommActionTarget(null); }} title="Dispute Commission">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Payment amount didn't match expected — follow up with your distributor.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">What's wrong?</label>
            <textarea
              rows={3}
              placeholder="Describe the discrepancy..."
              value={commDisputeNote}
              onChange={(e) => setCommDisputeNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button fullWidth loading={actionSubmitting} className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCommDispute} disabled={!commDisputeNote.trim()}>
            Submit Dispute
          </Button>
        </div>
      </BottomSheet>

      {/* Dispute Resolved Bottom Sheet — Two-Step Flow */}
      <BottomSheet isOpen={showResolve} onClose={() => { setShowResolve(false); setResolveTarget(null); setResolveStep('choose'); }} title="Resolve Dispute">
        <div className="flex flex-col gap-3">
          {resolveStep === 'choose' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">What caused the discrepancy?</p>
              <button
                onClick={() => setResolveStep('po_wrong')}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-800 active:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:active:bg-gray-700"
              >
                PO amount was entered incorrectly
              </button>
              <button
                onClick={() => setResolveStep('commission_short')}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-800 active:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:active:bg-gray-700"
              >
                Commission received was less than expected
              </button>
            </>
          )}

          {resolveStep === 'po_wrong' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Correct PO Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={resolveCorrectPOAmount}
                  onChange={(e) => setResolveCorrectPOAmount(e.target.value)}
                  className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {resolveCorrectPOAmount && resolveTarget?.commission?.commission_type === 'percentage' && resolveTarget.commission.rate && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Recalculated commission: {formatCurrency(Number(resolveCorrectPOAmount) * (resolveTarget.commission.rate / 100))} ({resolveTarget.commission.rate}%)
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Received in Bank</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={resolveReceivedAmount}
                  onChange={(e) => setResolveReceivedAmount(e.target.value)}
                  className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Note (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional details..."
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth onClick={() => setResolveStep('choose')}>Back</Button>
                <Button fullWidth loading={actionSubmitting} className="bg-green-600 hover:bg-green-700" onClick={handleDisputeResolve} disabled={!resolveCorrectPOAmount || !resolveReceivedAmount}>
                  Resolve
                </Button>
              </div>
            </>
          )}

          {resolveStep === 'commission_short' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Actually Received in Bank</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={resolveReceivedAmount}
                  onChange={(e) => setResolveReceivedAmount(e.target.value)}
                  className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Note (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional details..."
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" fullWidth onClick={() => setResolveStep('choose')}>Back</Button>
                <Button fullWidth loading={actionSubmitting} className="bg-green-600 hover:bg-green-700" onClick={handleDisputeResolve} disabled={!resolveReceivedAmount}>
                  Resolve
                </Button>
              </div>
            </>
          )}
        </div>
      </BottomSheet>

      {/* Write Off Bottom Sheet */}
      <BottomSheet isOpen={showWriteOff} onClose={() => { setShowWriteOff(false); setWriteOffTarget(null); }} title="Write Off">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will write off the commission and mark the PO and case as paid. This action accepts the loss.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Note (optional)</label>
            <textarea
              rows={3}
              placeholder="Reason for write-off..."
              value={writeOffNote}
              onChange={(e) => setWriteOffNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button fullWidth loading={actionSubmitting} className="bg-red-600 hover:bg-red-700 text-white" onClick={handleWriteOff}>
            Confirm Write Off
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
