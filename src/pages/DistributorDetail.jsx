import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { useDistributor, useDeleteDistributor } from '@/hooks/useDistributors';
import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency } from '@/utils/formatters';

export default function DistributorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: dist, isLoading } = useDistributor(id);
  const deleteDist = useDeleteDistributor();
  const [showDelete, setShowDelete] = useState(false);

  async function handleDelete() {
    await deleteDist.mutateAsync(id);
    navigate('/distributors', { replace: true });
  }

  if (isLoading) {
    return <div className="space-y-4 p-4"><Skeleton className="h-8 w-48" /><Skeleton variant="card" /></div>;
  }

  if (!dist) return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Distributor not found</div>;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1"><ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" /></button>
        <h1 className="flex-1 text-lg font-bold text-gray-900 dark:text-gray-100">{dist.name}</h1>
        <button onClick={() => navigate(`/distributors/${id}/edit`)} className="min-h-touch p-2 text-gray-500 dark:text-gray-400"><Edit2 className="h-5 w-5" /></button>
      </div>

      <Card className="mb-4">
        <div className="space-y-3">
          <InfoRow label="Billing Email" value={dist.billing_email} />
          <InfoRow label="Billing CC" value={dist.billing_email_cc?.join(', ')} />
          <InfoRow label="Contact Name" value={dist.billing_contact_name} />
          <InfoRow label="Contact Phone" value={dist.billing_contact_phone} />
          <InfoRow label="Commission Type" value={dist.default_commission_type === 'percentage' ? 'Percentage' : 'Flat Rate'} />
          {dist.default_commission_type === 'percentage' ? (
            <InfoRow label="Rate" value={dist.default_commission_rate ? `${dist.default_commission_rate}%` : null} />
          ) : (
            <InfoRow label="Flat Amount" value={dist.default_flat_amount ? formatCurrency(dist.default_flat_amount) : null} />
          )}
        </div>
      </Card>

      {dist.notes && (
        <Card className="mb-4">
          <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Notes</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{dist.notes}</p>
        </Card>
      )}

      {user?.role === 'owner' && (
        <Button variant="outline" fullWidth className="text-red-500" onClick={() => setShowDelete(true)}>
          <Trash2 className="h-4 w-4" /> Delete Distributor
        </Button>
      )}

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Distributor" message={`Delete ${dist.name}? This cannot be undone.`} confirmLabel="Delete" />
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
