import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { useCommission, useUpdateCommission } from '@/hooks/useCommissions';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import BottomSheet from '@/components/ui/BottomSheet';
import Skeleton from '@/components/ui/Skeleton';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/utils/formatters';

export default function CommissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: commission, isLoading } = useCommission(id);
  const updateCommission = useUpdateCommission();

  // Confirm bottom sheet
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState('');

  // Dispute bottom sheet
  const [showDispute, setShowDispute] = useState(false);
  const [disputeAmount, setDisputeAmount] = useState('');
  const [disputeNote, setDisputeNote] = useState('');

  // Resolve dispute — two-step flow
  const [showResolve, setShowResolve] = useState(false);
  const [resolveStep, setResolveStep] = useState('choose'); // 'choose' | 'po_wrong' | 'commission_short'
  const [resolveCorrectPOAmount, setResolveCorrectPOAmount] = useState('');
  const [resolveReceivedAmount, setResolveReceivedAmount] = useState('');
  const [resolveNote, setResolveNote] = useState('');

  // Write off bottom sheet
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [writeOffNote, setWriteOffNote] = useState('');

  const [submitting, setSubmitting] = useState(false);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['commissions'] });
    queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    queryClient.invalidateQueries({ queryKey: ['cases'] });
  }

  // 1. Confirm Commission: pending → confirmed, PO → paid, case → paid
  async function handleConfirm() {
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const amount = confirmAmount ? Number(confirmAmount) : commission.expected_amount;

      await updateCommission.mutateAsync({
        id,
        status: 'confirmed',
        received_amount: amount,
        received_date: today,
      });

      const { data: pos } = await supabase
        .from(TABLES.PURCHASE_ORDERS)
        .select('id')
        .eq('case_id', commission.case_id);
      if (pos?.length) {
        await supabase
          .from(TABLES.PURCHASE_ORDERS)
          .update({ status: 'paid', paid_date: today, updated_at: new Date().toISOString() })
          .in('id', pos.map((p) => p.id));
      }

      await supabase
        .from(TABLES.CASES)
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', commission.case_id);

      invalidateAll();
      setShowConfirm(false);
      toast({ message: 'Commission confirmed — PO and case marked paid', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to confirm commission', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // 2. Dispute Commission: pending → disputed, PO → disputed
  async function handleDispute() {
    setSubmitting(true);
    try {
      const amount = disputeAmount ? Number(disputeAmount) : null;
      const notes = [commission.notes, disputeNote].filter(Boolean).join('\n---\n');

      await updateCommission.mutateAsync({
        id,
        status: 'disputed',
        ...(amount != null && { received_amount: amount }),
        ...(notes && { notes }),
      });

      const { data: pos } = await supabase
        .from(TABLES.PURCHASE_ORDERS)
        .select('id, status')
        .eq('case_id', commission.case_id);
      const receivedPOs = pos?.filter((p) => p.status === 'received') || [];
      if (receivedPOs.length) {
        await supabase
          .from(TABLES.PURCHASE_ORDERS)
          .update({ status: 'disputed', updated_at: new Date().toISOString() })
          .in('id', receivedPOs.map((p) => p.id));
      }

      invalidateAll();
      setShowDispute(false);
      toast({ message: 'Commission disputed — PO moved to Disputed', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to dispute commission', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // 3. Dispute Resolved (two-step): disputed → received, PO → paid, case → paid
  async function handleResolve() {
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const receivedAmount = resolveReceivedAmount ? Number(resolveReceivedAmount) : commission.received_amount || commission.expected_amount;

      // Build audit trail
      let auditNote = '';
      if (resolveStep === 'po_wrong') {
        const correctedPO = Number(resolveCorrectPOAmount);
        auditNote = `Dispute resolved: PO amount was entered incorrectly. PO corrected from original to ${correctedPO}.`;
        if (commission.commission_type === 'percentage' && commission.rate) {
          const recalculated = correctedPO * (commission.rate / 100);
          auditNote += ` Expected commission recalculated to ${recalculated.toFixed(2)} (${commission.rate}% of ${correctedPO}).`;
        }
        auditNote += ` Received: ${receivedAmount}.`;
      } else {
        auditNote = `Dispute resolved: Commission received was less than expected. Expected: ${commission.expected_amount}, Received: ${receivedAmount}.`;
      }
      if (resolveNote) auditNote += ` Note: ${resolveNote}`;

      // If PO amount was wrong, update PO amount and recalculate expected commission
      const { data: pos } = await supabase
        .from(TABLES.PURCHASE_ORDERS)
        .select('id')
        .eq('case_id', commission.case_id);

      let newExpectedAmount = commission.expected_amount;
      if (resolveStep === 'po_wrong' && resolveCorrectPOAmount) {
        const correctedPO = Number(resolveCorrectPOAmount);
        if (pos?.length) {
          await supabase
            .from(TABLES.PURCHASE_ORDERS)
            .update({ amount: correctedPO, status: 'paid', paid_date: today, updated_at: now })
            .in('id', pos.map((p) => p.id));
        }
        // Recalculate expected_amount based on corrected PO and commission rate
        if (commission.commission_type === 'percentage' && commission.rate) {
          newExpectedAmount = correctedPO * (commission.rate / 100);
        }
      } else {
        // Commission short path — just mark POs paid, don't change amount
        if (pos?.length) {
          await supabase
            .from(TABLES.PURCHASE_ORDERS)
            .update({ status: 'paid', paid_date: today, updated_at: now })
            .in('id', pos.map((p) => p.id));
        }
      }

      // Update commission
      await updateCommission.mutateAsync({
        id,
        status: 'received',
        received_amount: receivedAmount,
        received_date: today,
        expected_amount: newExpectedAmount,
        dispute_resolution_note: auditNote,
      });

      // Mark case paid
      await supabase
        .from(TABLES.CASES)
        .update({ status: 'paid', updated_at: now })
        .eq('id', commission.case_id);

      invalidateAll();
      setShowResolve(false);
      setResolveStep('choose');
      toast({ message: 'Dispute resolved — PO and case marked paid', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to resolve dispute', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // 4. Write Off: disputed → written_off, PO → paid, case → paid
  async function handleWriteOff() {
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const notes = [commission.notes, writeOffNote].filter(Boolean).join('\n---\n');

      await updateCommission.mutateAsync({
        id,
        status: 'written_off',
        ...(notes && { notes }),
      });

      const { data: pos } = await supabase
        .from(TABLES.PURCHASE_ORDERS)
        .select('id')
        .eq('case_id', commission.case_id);
      if (pos?.length) {
        await supabase
          .from(TABLES.PURCHASE_ORDERS)
          .update({ status: 'paid', paid_date: today, updated_at: new Date().toISOString() })
          .in('id', pos.map((p) => p.id));
      }

      await supabase
        .from(TABLES.CASES)
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', commission.case_id);

      invalidateAll();
      setShowWriteOff(false);
      toast({ message: 'Commission written off — PO and case marked paid', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to write off commission', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (!commission) {
    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Commission not found</div>;
  }

  const hasDiscrepancy = commission.received_amount != null &&
    commission.expected_amount != null &&
    commission.received_amount !== commission.expected_amount;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400 dark:text-gray-500">Commission</p>
          <StatusBadge status={commission.status} type="commission" />
        </div>
        <button
          onClick={() => navigate(`/commissions/${id}/edit`)}
          className="min-h-touch p-2 text-gray-500 dark:text-gray-400"
        >
          <Edit2 className="h-5 w-5" />
        </button>
      </div>

      {/* Info */}
      <Card className="mb-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500">Case</span>
            <button
              className="font-medium text-brand-800 dark:text-brand-400"
              onClick={() => navigate(`/cases/${commission.case_id}`)}
            >
              {commission.case?.case_number || '—'}
            </button>
          </div>
          <InfoRow label="Distributor" value={commission.distributor?.name} />
          <InfoRow label="Type" value={commission.commission_type === 'percentage' ? 'Percentage' : 'Flat'} />
          {commission.commission_type === 'percentage' && (
            <InfoRow label="Rate" value={commission.rate != null ? `${commission.rate}%` : '—'} />
          )}
          {commission.commission_type === 'flat' && (
            <InfoRow label="Flat Amount" value={formatCurrency(commission.flat_amount)} />
          )}
          <InfoRow label="Case Value" value={formatCurrency(commission.case_value)} />
        </div>
      </Card>

      {/* Amounts */}
      <Card className="mb-4">
        <h3 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Amounts<InfoTooltip text="Commissions are auto-calculated when a case is completed and has a case value. The rate comes from your distributor's default settings." /></h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500">Expected<InfoTooltip text="Expected amount is calculated from case value and commission rate. Log actual received amount to track discrepancies." /></span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(commission.expected_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500">Received<InfoTooltip text="Log the actual received amount to track discrepancies." /></span>
            <span className={`text-lg font-bold ${hasDiscrepancy ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'}`}>
              {formatCurrency(commission.received_amount)}
            </span>
          </div>
          {hasDiscrepancy && (
            <p className="text-xs text-red-500">
              Discrepancy: {formatCurrency(commission.expected_amount - commission.received_amount)}
            </p>
          )}
        </div>
      </Card>

      {/* Dates */}
      <Card className="mb-4">
        <div className="space-y-3">
          <InfoRow label="Expected Date" value={formatDate(commission.expected_date)} />
          <InfoRow label="Received Date" value={formatDate(commission.received_date)} />
        </div>
      </Card>

      {/* Notes */}
      {commission.notes && (
        <Card className="mb-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{commission.notes}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {commission.status === 'pending' && (
          <>
            <Button fullWidth className="bg-green-600 hover:bg-green-700" onClick={() => { setConfirmAmount(''); setShowConfirm(true); }}>
              Confirm Commission
            </Button>
            <Button fullWidth variant="secondary" className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20" onClick={() => { setDisputeAmount(''); setDisputeNote(''); setShowDispute(true); }}>
              Dispute Commission
            </Button>
          </>
        )}
        {commission.status === 'disputed' && (
          <>
            <Button fullWidth className="bg-green-600 hover:bg-green-700" onClick={() => { setResolveStep('choose'); setResolveCorrectPOAmount(''); setResolveReceivedAmount(''); setResolveNote(''); setShowResolve(true); }}>
              Dispute Resolved
            </Button>
            <Button fullWidth variant="secondary" className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20" onClick={() => { setWriteOffNote(''); setShowWriteOff(true); }}>
              Write Off
            </Button>
          </>
        )}
      </div>

      {/* Confirm Commission Bottom Sheet */}
      <BottomSheet isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Commission">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Received</label>
            <input
              type="number"
              step="0.01"
              placeholder={commission.expected_amount ? String(commission.expected_amount) : '0.00'}
              value={confirmAmount}
              onChange={(e) => setConfirmAmount(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Leave blank to use expected amount ({formatCurrency(commission.expected_amount)})
          </p>
          <Button fullWidth loading={submitting} className="bg-green-600 hover:bg-green-700" onClick={handleConfirm}>
            Confirm Commission
          </Button>
        </div>
      </BottomSheet>

      {/* Dispute Commission Bottom Sheet */}
      <BottomSheet isOpen={showDispute} onClose={() => setShowDispute(false)} title="Dispute Commission">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Actually Received</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={disputeAmount}
              onChange={(e) => setDisputeAmount(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Dispute Note (optional)</label>
            <textarea
              rows={3}
              placeholder="Describe the discrepancy..."
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button fullWidth loading={submitting} className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDispute}>
            Submit Dispute
          </Button>
        </div>
      </BottomSheet>

      {/* Dispute Resolved Bottom Sheet — Two-Step Flow */}
      <BottomSheet isOpen={showResolve} onClose={() => { setShowResolve(false); setResolveStep('choose'); }} title="Resolve Dispute">
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
                {resolveCorrectPOAmount && commission.commission_type === 'percentage' && commission.rate && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Recalculated commission: {formatCurrency(Number(resolveCorrectPOAmount) * (commission.rate / 100))} ({commission.rate}%)
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
                <Button fullWidth loading={submitting} className="bg-green-600 hover:bg-green-700" onClick={handleResolve} disabled={!resolveCorrectPOAmount || !resolveReceivedAmount}>
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
                <Button fullWidth loading={submitting} className="bg-green-600 hover:bg-green-700" onClick={handleResolve} disabled={!resolveReceivedAmount}>
                  Resolve
                </Button>
              </div>
            </>
          )}
        </div>
      </BottomSheet>

      {/* Write Off Bottom Sheet */}
      <BottomSheet isOpen={showWriteOff} onClose={() => setShowWriteOff(false)} title="Write Off Commission">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will write off the commission and mark the case as paid. This action accepts the loss.
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
          <Button fullWidth loading={submitting} className="bg-red-600 hover:bg-red-700 text-white" onClick={handleWriteOff}>
            Confirm Write Off
          </Button>
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
