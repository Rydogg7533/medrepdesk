import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { useDistributors } from '@/hooks/useDistributors';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

export default function Distributors() {
  const navigate = useNavigate();
  const { data: distributors, isLoading } = useDistributors();

  if (isLoading) {
    return <div className="p-4"><Skeleton variant="list" count={5} /></div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="page-bg-text text-lg font-bold text-gray-900 dark:text-gray-100">Distributors</h1>
        <Button size="sm" onClick={() => navigate('/distributors/new')}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {!distributors?.length ? (
        <EmptyState
          icon={Building2}
          title="No distributors"
          description="Add the companies you sell for"
          actionLabel="Add Distributor"
          onAction={() => navigate('/distributors/new')}
        />
      ) : (
        <div className="space-y-2">
          {distributors.map((d) => (
            <div
              key={d.id}
              onClick={() => navigate(`/distributors/${d.id}`)}
              className="themed-card cursor-pointer rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm active:bg-gray-50 dark:active:bg-gray-700"
            >
              <p className="font-medium text-gray-800 dark:text-gray-200">{d.name}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {d.billing_email && <span>{d.billing_email}</span>}
                <span className="ml-auto rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5">
                  {d.default_commission_type === 'percentage'
                    ? `${d.default_commission_rate}%`
                    : `$${d.default_flat_amount}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
