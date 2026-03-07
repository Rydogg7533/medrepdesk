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

  // Mark as Received
  const [showReceived, setShowReceived] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [receivedNotes, setReceivedNotes] = useState('');

  // Dispute
  const [showDispute, setShowDispute] = useState(false);
  const [disputeNote, setDisputeNote] = useState('');

  // Resolve dispute
  const [showResolve, setShowResolve] = useState(false);
  const [resolveAmount, setResolveAmount] = useState('');
  const [resolveNote, setResolveNote] = useState('');

  // Write off
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [writeOffNote, setWriteOffNote] = useState('');

  const [submitting, setSubmitting] = useState(false);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['commissions'] });
    queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    queryClient.invalidateQueries({ queryKey: ['cases'] });
  }

  // 1. Mark as Received: pending/confirmed → received
  async function handleMarkReceived() {
    setSubmitting(true);
    try {
      const amount = receivedAmount ? Number(receivedAmount) : commission.expected_amount;
      const date = receivedDate || new Date().toISOString().split('T')[0];

      await updateCommission.mutateAsync({
        id,
        status: 'received',
        received_amount: amount,
        received_date: date,
        ...(receivedNotes && { notes: [commission.notes, receivedNotes].filter(Boolean).join('\n---\n') }),
      });

      invalidateAll();
      setShowReceived(false);
      toast({ message: 'Commission marked as received', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to mark commission received', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // 2. Dispute: received → disputed
  async function handleDispute() {
    if (!disputeNote.trim()) return;
    setSubmitting(true);
    try {
      const notes = [commission.notes, disputeNote].filter(Boolean).join('\n---\n');

      await updateCommission.mutateAsync({
        id,
        status: 'disputed',
        notes,
      });

      invalidateAll();
      setShowDispute(false);
      toast({ message: 'Commission disputed — follow up with your distributor', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to dispute commission', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // 3. Resolve: disputed → received with corrected amount
  async function handleResolve() {
    if (!resolveAmount) return;
    setSubmitting(true);
    try {
      const amount = Number(resolveAmount);
      const auditNote = `Dispute resolved. Actual amount received: ${amount}.${resolveNote ? ` Note: ${resolveNote}` : ''}`;

      await updateCommission.mutateAsync({
        id,
        status: 'received',
        received_amount: amount,
        received_date: commission.received_date || new Date().toISOString().split('T')[0],
        dispute_resolution_note: auditNote,
      });

      invalidateAll();
      setShowResolve(false);
      toast({ message: 'Dispute resolved', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to resolve dispute', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // 4. Write Off: disputed → written_off
  async function handleWriteOff() {
    setSubmitting(true);
    try {
      const notes = [commission.notes, writeOffNote].filter(Boolean).join('\n---\n');

      await updateCommission.mutateAsync({
        id,
        status: 'written_off',
        ...(notes && { notes }),
      });

      invalidateAll();
      setShowWriteOff(false);
      toast({ message: 'Commission written off', type: 'success' });
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

  const isPending = commission.status === 'pending' || commission.status === 'confirmed';
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
        <h3 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Amounts<InfoTooltip text="Expected amount is calculated from case value and commission rate." /></h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500">Expected</span>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(commission.expected_amount)}</span>
          </div>
          {commission.received_amount != null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400 dark:text-gray-500">Received</span>
              <span className={`text-lg font-bold ${hasDiscrepancy ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(commission.received_amount)}
              </span>
            </div>
          )}
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
          {commission.expected_date && (
            <InfoRow label="Expected Date" value={formatDate(commission.expected_date)} />
          )}
          {commission.received_date && (
            <InfoRow label="Received Date" value={formatDate(commission.received_date)} />
          )}
        </div>
      </Card>

      {/* Notes */}
      {commission.notes && (
        <Card className="mb-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{commission.notes}</p>
        </Card>
      )}

      {/* Dispute Resolution Note */}
      {commission.dispute_resolution_note && (
        <Card className="mb-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Resolution</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{commission.dispute_resolution_note}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {isPending && (
          <Button fullWidth className="bg-green-600 hover:bg-green-700" onClick={() => {
            setReceivedAmount(commission.expected_amount ? String(commission.expected_amount) : '');
            setReceivedDate(new Date().toISOString().split('T')[0]);
            setReceivedNotes('');
            setShowReceived(true);
          }}>
            Mark as Received
          </Button>
        )}
        {commission.status === 'received' && (
          <Button fullWidth variant="secondary" className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20" onClick={() => {
            setDisputeNote('');
            setShowDispute(true);
          }}>
            Dispute
          </Button>
        )}
        {commission.status === 'disputed' && (
          <>
            <Button fullWidth className="bg-green-600 hover:bg-green-700" onClick={() => {
              setResolveAmount('');
              setResolveNote('');
              setShowResolve(true);
            }}>
              Resolve
            </Button>
            <Button fullWidth variant="secondary" className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20" onClick={() => {
              setWriteOffNote('');
              setShowWriteOff(true);
            }}>
              Write Off
            </Button>
          </>
        )}
      </div>

      {/* Mark as Received Bottom Sheet */}
      <BottomSheet isOpen={showReceived} onClose={() => setShowReceived(false)} title="Mark as Received">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Received</label>
            <input
              type="number"
              step="0.01"
              placeholder={commission?.expected_amount ? String(commission.expected_amount) : '0.00'}
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Date Received</label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
            <input
              type="text"
              placeholder="e.g. Direct deposit, check #1234"
              value={receivedNotes}
              onChange={(e) => setReceivedNotes(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button fullWidth loading={submitting} className="bg-green-600 hover:bg-green-700" onClick={handleMarkReceived}>
            Confirm Receipt
          </Button>
        </div>
      </BottomSheet>

      {/* Dispute Bottom Sheet */}
      <BottomSheet isOpen={showDispute} onClose={() => setShowDispute(false)} title="Dispute Commission">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Payment amount didn't match expected — follow up with your distributor.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">What's wrong?</label>
            <textarea
              rows={3}
              placeholder="Describe the discrepancy..."
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button fullWidth loading={submitting} className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDispute} disabled={!disputeNote.trim()}>
            Submit Dispute
          </Button>
        </div>
      </BottomSheet>

      {/* Resolve Dispute Bottom Sheet */}
      <BottomSheet isOpen={showResolve} onClose={() => setShowResolve(false)} title="Resolve Dispute">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Actual Amount Received</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={resolveAmount}
              onChange={(e) => setResolveAmount(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Resolution Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="How was this resolved?"
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button fullWidth loading={submitting} className="bg-green-600 hover:bg-green-700" onClick={handleResolve} disabled={!resolveAmount}>
            Mark Resolved
          </Button>
        </div>
      </BottomSheet>

      {/* Write Off Bottom Sheet */}
      <BottomSheet isOpen={showWriteOff} onClose={() => setShowWriteOff(false)} title="Write Off Commission">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will write off the commission. This action accepts the loss.
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
