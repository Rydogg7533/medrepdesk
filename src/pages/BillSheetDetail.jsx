import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useBillSheetItems } from '@/hooks/useBillSheetItems';
import { useChaseLog } from '@/hooks/useChaseLog';
import { useCasePOs } from '@/hooks/usePOs';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency, formatDate, formatRelativeTime } from '@/utils/formatters';

export default function BillSheetDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { data: items = [], isLoading: itemsLoading } = useBillSheetItems(caseId);
  const { data: chaseEntries = [] } = useChaseLog(caseId);
  const { data: casePOs = [] } = useCasePOs(caseId);

  const submissionEntry = chaseEntries.find((e) => e.chase_type === 'bill_sheet_submitted');
  const receivedPO = casePOs.find((po) => ['received', 'processing', 'paid'].includes(po.status));
  const hasPO = !!receivedPO;

  const caseInfo = items[0]?.case;

  const totalValue = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
  const totalCommission = items.reduce((sum, item) => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    return sum + lineTotal * ((item.commission_rate || 0) / 100);
  }, 0);

  if (itemsLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Bill sheet not found</div>;
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Bill Sheet</p>
      </div>

      {/* Case Info */}
      <Card className="mb-4">
        <div className="space-y-3">
          <InfoRow label="Case" value={caseInfo?.case_number} />
          <InfoRow label="Surgeon" value={caseInfo?.surgeon?.full_name} />
          <InfoRow label="Facility" value={caseInfo?.facility?.name} />
          <InfoRow label="Surgery Date" value={formatDate(caseInfo?.scheduled_date)} />
          <InfoRow label="Submitted" value={submissionEntry ? formatDate(submissionEntry.created_at) : '—'} />
        </div>
      </Card>

      {/* Status */}
      <Card className="mb-4">
        {hasPO ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                PO Received
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(receivedPO.received_date)}
              </span>
            </div>
            <button
              onClick={() => navigate(`/po/${receivedPO.id}`)}
              className="flex items-center gap-1 text-sm font-medium text-brand-800 dark:text-brand-400"
            >
              {receivedPO.po_number ? `PO #${receivedPO.po_number}` : 'View PO'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              Awaiting PO
            </span>
          </div>
        )}
      </Card>

      {/* Line Items */}
      <h2 className="mb-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
        Line Items ({items.length})
      </h2>
      <div className="mb-4 space-y-2">
        {items.map((item) => {
          const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
          const commAmount = lineTotal * ((item.commission_rate || 0) / 100);
          return (
            <Card key={item.id}>
              <div className="space-y-1">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {item.product_type || 'Product'}
                    </p>
                    {item.manufacturer?.name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.manufacturer.name}</p>
                    )}
                    {item.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{item.description}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(lineTotal)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </span>
                  <span>
                    {item.commission_rate}% comm → {formatCurrency(commAmount)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Totals */}
      <Card className="mb-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500">Total Case Value</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalValue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500">Total Commission</span>
            <span className="font-bold text-green-600">{formatCurrency(totalCommission)}</span>
          </div>
        </div>
      </Card>

      {/* Actions */}
      {!hasPO && (
        <Button fullWidth onClick={() => navigate(`/cases/${caseId}`)}>
          Chase PO
        </Button>
      )}
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
