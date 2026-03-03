import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Phone, Upload } from 'lucide-react';
import { useContacts } from '@/hooks/useContacts';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { formatDate } from '@/utils/formatters';

export default function Contacts() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: contacts, isLoading } = useContacts();

  const filtered = useMemo(() => {
    if (!contacts) return [];
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q) ||
        c.facility?.name?.toLowerCase().includes(q) ||
        c.distributor?.name?.toLowerCase().includes(q) ||
        c.manufacturer?.name?.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="mb-3 h-10 w-full" />
        <Skeleton variant="list" count={6} />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-2 flex items-center gap-1">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Contacts</h1>
        <InfoTooltip text="Your contact network for facilities, distributors, and manufacturers. Import contacts via CSV or add them manually. Contacts auto-populate in forms throughout the app." />
      </div>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-touch w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
        />
        </div>
        <button
          onClick={() => navigate('/contacts/import')}
          className="flex min-h-touch items-center gap-1.5 rounded-lg bg-brand-50 dark:bg-brand-800/20 px-3 py-2.5 text-sm font-medium text-brand-800 dark:text-brand-400"
        >
          <Upload className="h-4 w-4" />
          CSV
        </button>
        <InfoTooltip text="Import contacts from a CSV file (Google Contacts, Excel, etc). Map your columns to MedRepDesk fields and preview before importing." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first contact to start building your network"
          actionLabel="Add Contact"
          onAction={() => navigate('/contacts/new')}
        />
      ) : (
        <div className="space-y-1">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/contacts/${c.id}`)}
              className="flex min-h-touch cursor-pointer items-center gap-3 rounded-lg px-3 py-3 active:bg-gray-100 dark:active:bg-gray-800"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800">
                {c.full_name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-800 dark:text-gray-200">{c.full_name}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {c.role && `${c.role} · `}
                  {c.facility?.name || c.distributor?.name || c.manufacturer?.name || ''}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-brand-800"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
                {c.last_contacted_at && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {formatDate(c.last_contacted_at)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
