import { useNavigate } from 'react-router-dom';
import { Stethoscope, Plus, Globe } from 'lucide-react';
import { useSurgeons } from '@/hooks/useSurgeons';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

export default function Surgeons() {
  const navigate = useNavigate();
  const { data: surgeons, isLoading } = useSurgeons();

  if (isLoading) {
    return <div className="p-4"><Skeleton variant="list" count={6} /></div>;
  }

  const global = surgeons?.filter((s) => s.is_global) || [];
  const own = surgeons?.filter((s) => !s.is_global) || [];

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Surgeons</h1>
        <Button size="sm" onClick={() => navigate('/surgeons/new')}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {!surgeons?.length ? (
        <EmptyState icon={Stethoscope} title="No surgeons" description="Add surgeons you work with" actionLabel="Add Surgeon" onAction={() => navigate('/surgeons/new')} />
      ) : (
        <>
          {own.length > 0 && (
            <div className="mb-4">
              <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Your Surgeons</h2>
              <div className="space-y-2">
                {own.map((s) => (
                  <SurgeonCard key={s.id} surgeon={s} onClick={() => navigate(`/surgeons/${s.id}/edit`)} />
                ))}
              </div>
            </div>
          )}
          {global.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                <Globe className="h-3 w-3" /> Global Surgeons
              </h2>
              <div className="space-y-2">
                {global.map((s) => (
                  <SurgeonCard key={s.id} surgeon={s} readOnly />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SurgeonCard({ surgeon, onClick, readOnly }) {
  return (
    <div
      onClick={readOnly ? undefined : onClick}
      className={`rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm ${readOnly ? 'opacity-75' : 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-700'}`}
    >
      <p className="font-medium text-gray-800 dark:text-gray-200">{surgeon.full_name}</p>
      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {surgeon.specialty && <span>{surgeon.specialty}</span>}
        {surgeon.primary_facility?.name && (
          <span className="ml-auto truncate">{surgeon.primary_facility.name}</span>
        )}
      </div>
    </div>
  );
}
