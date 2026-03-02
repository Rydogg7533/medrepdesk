import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { useCase, useUpdateCase, useDeleteCase } from '@/hooks/useCases';
import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Skeleton from '@/components/ui/Skeleton';
import { formatDate, formatTime, formatCurrency } from '@/utils/formatters';
import { CASE_STATUSES, PROCEDURE_TYPES } from '@/utils/constants';

const STATUS_ORDER = [
  'scheduled', 'confirmed', 'completed',
  'bill_sheet_submitted', 'po_requested', 'billed',
  'po_received', 'paid',
];

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: caseData, isLoading } = useCase(id);
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();
  const [showDelete, setShowDelete] = useState(false);

  const procLabel = (type) =>
    PROCEDURE_TYPES.find((p) => p.value === type)?.label || type;

  async function advanceStatus(newStatus) {
    await updateCase.mutateAsync({ id, status: newStatus });
  }

  async function handleDelete() {
    await deleteCase.mutateAsync(id);
    navigate('/cases', { replace: true });
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
      <div className="p-4 text-center text-gray-500">Case not found</div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(caseData.status);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{caseData.case_number}</p>
          <StatusBadge status={caseData.status} type="case" />
        </div>
        <button
          onClick={() => navigate(`/cases/${id}/edit`)}
          className="min-h-touch p-2 text-gray-500"
        >
          <Edit2 className="h-5 w-5" />
        </button>
      </div>

      {/* Status Timeline */}
      <Card className="mb-4">
        <h3 className="mb-3 text-xs font-semibold uppercase text-gray-400">Pipeline</h3>
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
                        ? 'bg-brand-100 text-brand-800'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isActive ? <CheckCircle className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className="mt-1 max-w-[56px] text-center text-[9px] leading-tight text-gray-500">
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
          <InfoRow label="Date" value={formatDate(caseData.scheduled_date)} />
          <InfoRow label="Time" value={formatTime(caseData.scheduled_time)} />
          <InfoRow label="Case Value" value={formatCurrency(caseData.case_value)} />
        </div>
      </Card>

      {/* Notes */}
      {caseData.notes && (
        <Card className="mb-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-400">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{caseData.notes}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {caseData.status === 'scheduled' && (
          <Button fullWidth loading={updateCase.isPending} onClick={() => advanceStatus('confirmed')}>
            Confirm Case
          </Button>
        )}
        {caseData.status === 'confirmed' && (
          <Button fullWidth loading={updateCase.isPending} onClick={() => advanceStatus('completed')}>
            Mark Completed
          </Button>
        )}
        {caseData.status === 'completed' && (
          <Button fullWidth variant="secondary" onClick={() => navigate('/cases')}>
            Log Bill Sheet (Coming Soon)
          </Button>
        )}

        {/* Placeholders */}
        <Card className="mt-4">
          <h3 className="text-xs font-semibold uppercase text-gray-400">Purchase Orders</h3>
          <p className="mt-1 text-sm text-gray-400">PO tracking coming in Step 4</p>
        </Card>

        <Card>
          <h3 className="text-xs font-semibold uppercase text-gray-400">Communications</h3>
          <p className="mt-1 text-sm text-gray-400">Communication log coming soon</p>
        </Card>

        {user?.role === 'owner' && (
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

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Case"
        message={`Permanently delete ${caseData.case_number}? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-700">{value || '—'}</span>
    </div>
  );
}
