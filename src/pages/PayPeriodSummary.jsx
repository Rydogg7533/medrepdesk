import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, AlertTriangle, ChevronRight } from 'lucide-react';
import { usePayPeriod, useUpdatePayPeriod, usePayPeriodCommissions } from '@/hooks/usePayPeriods';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function PayPeriodSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: period, isLoading } = usePayPeriod(id);
  const { data: commissions = [] } = usePayPeriodCommissions(id);
  const updatePayPeriod = useUpdatePayPeriod();

  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (!period) {
    return (
      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Pay period not found.
      </div>
    );
  }

  const difference = period.actual_amount != null && period.expected_amount != null
    ? period.actual_amount - period.expected_amount
    : null;

  async function handleMarkPaid() {
    setSaving(true);
    try {
      const actual = parseFloat(actualAmount);
      if (isNaN(actual)) return;

      const expected = period.expected_amount || 0;
      const hasDiscrepancy = Math.abs(actual - expected) > 1;

      await updatePayPeriod.mutateAsync({
        id: period.id,
        actual_amount: actual,
        status: hasDiscrepancy ? 'discrepancy' : 'paid',
        paid_at: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      await updatePayPeriod.mutateAsync({
        id: period.id,
        notes,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-gray-900 dark:text-gray-100">Pay Period</h1>
        <StatusBadge status={period.status} type="pay_period" />
      </div>

      {/* Date Range */}
      <Card className="mb-4">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatDate(period.period_start)} – {formatDate(period.period_end)}
        </p>
        {period.distributor?.name && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{period.distributor.name}</p>
        )}
      </Card>

      {/* Amounts */}
      <Card className="mb-4">
        <h2 className="mb-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Amounts</h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Expected</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {period.expected_amount != null ? formatCurrency(period.expected_amount) : '—'}
            </span>
          </div>
          {period.actual_amount != null && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Actual</span>
              <span className="text-sm font-semibold text-green-600">{formatCurrency(period.actual_amount)}</span>
            </div>
          )}
          {difference != null && (
            <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Difference</span>
              <span className={`text-sm font-semibold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Commissions List */}
      {commissions.length > 0 && (
        <div className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Commissions</h2>
          <div className="space-y-2">
            {commissions.map((comm) => (
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
                      {formatCurrency(comm.expected_amount || comm.received_amount)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Actions by status */}
      {period.status === 'open' && (
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This period is still open. Commissions are being accumulated.
          </p>
        </Card>
      )}

      {period.status === 'closed' && (
        <Card>
          <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Mark as Paid</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Received</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              />
            </div>
            <Button
              fullWidth
              loading={saving}
              disabled={!actualAmount}
              onClick={handleMarkPaid}
            >
              Mark as Paid
            </Button>
          </div>
        </Card>
      )}

      {period.status === 'paid' && (
        <Card className="bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-700 dark:text-green-300">Paid</p>
          </div>
          {period.paid_at && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              Paid on {formatDate(period.paid_at)}
            </p>
          )}
        </Card>
      )}

      {period.status === 'discrepancy' && (
        <Card className="border-l-4 border-l-amber-400 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Discrepancy Detected</p>
          </div>
          {difference != null && (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
              Difference of {formatCurrency(Math.abs(difference))} from expected amount.
            </p>
          )}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea
                value={notes || period.notes || ''}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add notes about this discrepancy..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              />
            </div>
            <Button
              fullWidth
              variant="secondary"
              loading={saving}
              onClick={handleSaveNotes}
            >
              Save Notes
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
