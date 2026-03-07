import { useNavigate } from 'react-router-dom';
import { Building, Plus, Globe } from 'lucide-react';
import { useFacilities } from '@/hooks/useFacilities';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

export default function Facilities() {
  const navigate = useNavigate();
  const { data: facilities, isLoading } = useFacilities();

  if (isLoading) {
    return <div className="p-4"><Skeleton variant="list" count={6} /></div>;
  }

  const global = facilities?.filter((f) => f.is_global) || [];
  const own = facilities?.filter((f) => !f.is_global) || [];

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Facilities</h1>
        <Button size="sm" onClick={() => navigate('/facilities/new')}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {!facilities?.length ? (
        <EmptyState icon={Building} title="No facilities" description="Add hospitals and ASCs you work with" actionLabel="Add Facility" onAction={() => navigate('/facilities/new')} />
      ) : (
        <>
          {own.length > 0 && (
            <div className="mb-4">
              <h2 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Your Facilities</h2>
              <div className="space-y-2">
                {own.map((f) => (
                  <FacilityCard key={f.id} facility={f} onClick={() => navigate(`/facilities/${f.id}/edit`)} />
                ))}
              </div>
            </div>
          )}
          {global.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                <Globe className="h-3 w-3" /> Global Facilities
              </h2>
              <div className="space-y-2">
                {global.map((f) => (
                  <FacilityCard key={f.id} facility={f} readOnly />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FacilityCard({ facility, onClick, readOnly }) {
  return (
    <div
      onClick={readOnly ? undefined : onClick}
      className={`rounded-xl bg-white dark:bg-gray-800 p-4 shadow-sm ${readOnly ? 'opacity-75' : 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-700'}`}
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-gray-800 dark:text-gray-200">{facility.name}</p>
        {facility.facility_type && (
          <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400">
            {facility.facility_type.toUpperCase()}
          </span>
        )}
      </div>
      {(facility.city || facility.state) && (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {[facility.city, facility.state].filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  );
}
