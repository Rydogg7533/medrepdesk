import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { useCommission, useUpdateCommission } from '@/hooks/useCommissions';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import BottomSheet from '@/components/ui/BottomSheet';
import Skeleton from '@/components/ui/Skeleton';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { formatDate, formatCurrency } from '@/utils/formatters';

export default function CommissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: commission, isLoading } = useCommission(id);
  const updateCommission = useUpdateCommission();
  const [showUpdate, setShowUpdate] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDate, setReceivedDate] = useState('');

  async function advanceStatus(newStatus) {
    const updates = { id, status: newStatus };
    if (newStatus === 'received') {
      updates.received_amount = receivedAmount ? Number(receivedAmount) : commission.expected_amount;
      updates.received_date = receivedDate || new Date().toISOString().split('T')[0];
    }
    await updateCommission.mutateAsync(updates);
    setShowUpdate(false);
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
          <Button fullWidth loading={updateCommission.isPending} onClick={() => advanceStatus('confirmed')}>
            Confirm Commission
          </Button>
        )}
        {commission.status === 'confirmed' && (
          <Button fullWidth onClick={() => setShowUpdate(true)}>
            Mark Received
          </Button>
        )}
      </div>

      <BottomSheet isOpen={showUpdate} onClose={() => setShowUpdate(false)} title="Mark Commission Received">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Received</label>
            <input
              type="number"
              step="0.01"
              placeholder={commission.expected_amount ? String(commission.expected_amount) : '0.00'}
              value={receivedAmount}
              onChange={(e) => setReceivedAmount(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Received Date</label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button fullWidth loading={updateCommission.isPending} onClick={() => advanceStatus('received')}>
            Confirm Received
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
