import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, Phone, Upload, Building, Factory, Stethoscope } from 'lucide-react';
import { useContacts, useUpdateContact } from '@/hooks/useContacts';
import { useFacilities, useUpdateFacility } from '@/hooks/useFacilities';
import { useManufacturers, useUpdateManufacturer } from '@/hooks/useManufacturers';
import { useSurgeons, useUpdateSurgeon } from '@/hooks/useSurgeons';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import ActiveToggle from '@/components/ui/ActiveToggle';
import { formatDate } from '@/utils/formatters';

const TABS = [
  { key: 'people', label: 'People', icon: Users },
  { key: 'facilities', label: 'Facilities', icon: Building },
  { key: 'manufacturers', label: 'Manufacturers', icon: Factory },
  { key: 'surgeons', label: 'Surgeons', icon: Stethoscope },
];

function getContactTypeBadge(contact) {
  if (contact.contact_type === 'surgeon_office' || contact.surgeon_id) return "Surgeon's Office";
  if (contact.facility_id) return 'Facility';
  if (contact.distributor_id) return 'Distributor';
  if (contact.manufacturer_id) return 'Manufacturer';
  return null;
}

function getContactOrg(contact) {
  if (contact.surgeon?.full_name) return contact.surgeon.full_name;
  return contact.facility?.name || contact.distributor?.name || contact.manufacturer?.name || '';
}

export default function Contacts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'people';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [search, setSearch] = useState('');

  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: facilities, isLoading: facilitiesLoading } = useFacilities();
  const { data: manufacturers, isLoading: manufacturersLoading } = useManufacturers();
  const { data: surgeons, isLoading: surgeonsLoading } = useSurgeons();

  const updateContact = useUpdateContact();
  const updateFacility = useUpdateFacility();
  const updateManufacturer = useUpdateManufacturer();
  const updateSurgeon = useUpdateSurgeon();

  const isLoading = contactsLoading || facilitiesLoading || manufacturersLoading || surgeonsLoading;

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    let list = contacts;
    if (showActiveOnly) list = list.filter((c) => c.is_active !== false);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.role?.toLowerCase().includes(q) ||
          getContactOrg(c).toLowerCase().includes(q)
      );
    }
    return list;
  }, [contacts, search, showActiveOnly]);

  const filteredFacilities = useMemo(() => {
    if (!facilities) return [];
    let list = facilities;
    if (showActiveOnly) list = list.filter((f) => f.is_active !== false);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.name?.toLowerCase().includes(q) || f.city?.toLowerCase().includes(q));
    }
    return list;
  }, [facilities, search, showActiveOnly]);

  const filteredManufacturers = useMemo(() => {
    if (!manufacturers) return [];
    let list = manufacturers;
    if (showActiveOnly) list = list.filter((m) => m.is_active !== false);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.name?.toLowerCase().includes(q));
    }
    return list;
  }, [manufacturers, search, showActiveOnly]);

  const filteredSurgeons = useMemo(() => {
    if (!surgeons) return [];
    let list = surgeons;
    if (showActiveOnly) list = list.filter((s) => s.is_active !== false);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.full_name?.toLowerCase().includes(q) || s.specialty?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [surgeons, search, showActiveOnly]);

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="mb-3 h-10 w-full" />
        <Skeleton variant="list" count={6} />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Banner */}
      <div className="bg-brand-50 dark:bg-brand-800/10 px-4 py-2.5">
        <p className="text-xs text-brand-800 dark:text-brand-400">
          Manage your complete network — people, facilities, manufacturers, and surgeons all in one place.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto px-4 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-800 text-brand-800 dark:text-brand-400 dark:border-brand-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls: search + active toggle + CSV import */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder={`Search ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-touch w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-3 text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
          />
        </div>
        <div className="flex min-h-touch items-center gap-2">
          <ActiveToggle isActive={showActiveOnly} onToggle={(val) => setShowActiveOnly(val)} size="sm" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{showActiveOnly ? 'Active' : 'All'}</span>
        </div>
        {activeTab === 'people' && (
          <button
            onClick={() => navigate('/contacts/import')}
            className="flex min-h-touch items-center gap-1.5 rounded-lg bg-brand-50 dark:bg-brand-800/20 px-3 py-2.5 text-sm font-medium text-brand-800 dark:text-brand-400"
          >
            <Upload className="h-4 w-4" />
            CSV
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="px-4">
        {activeTab === 'people' && (
          <PeopleTab
            contacts={filteredContacts}
            onToggle={(id, val) => updateContact.mutate({ id, is_active: val })}
            navigate={navigate}
          />
        )}
        {activeTab === 'facilities' && (
          <FacilitiesTab
            facilities={filteredFacilities}
            onToggle={(id, val) => updateFacility.mutate({ id, is_active: val })}
            navigate={navigate}
          />
        )}
        {activeTab === 'manufacturers' && (
          <ManufacturersTab
            manufacturers={filteredManufacturers}
            onToggle={(id, val) => updateManufacturer.mutate({ id, is_active: val })}
            navigate={navigate}
          />
        )}
        {activeTab === 'surgeons' && (
          <SurgeonsTab
            surgeons={filteredSurgeons}
            onToggle={(id, val) => updateSurgeon.mutate({ id, is_active: val })}
            navigate={navigate}
          />
        )}
      </div>

    </div>
  );
}

function PeopleTab({ contacts, onToggle, navigate }) {
  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No contacts yet"
        description="Add your first contact to start building your network"
        actionLabel="Add Contact"
        onAction={() => navigate('/contacts/new')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {contacts.map((c) => (
        <div
          key={c.id}
          onClick={() => navigate(`/contacts/${c.id}`)}
          className="flex min-h-touch cursor-pointer items-center gap-3 rounded-lg px-3 py-3 active:bg-gray-100 dark:active:bg-gray-800"
        >
          <ActiveToggle isActive={c.is_active !== false} onToggle={(val) => onToggle(c.id, val)} />
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-800/20 text-sm font-semibold text-brand-800 dark:text-brand-400">
            {c.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-800 dark:text-gray-200">{c.full_name}</p>
              {getContactTypeBadge(c) && (
                <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  {getContactTypeBadge(c)}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {c.role && `${c.role} · `}
              {getContactOrg(c)}
            </p>
          </div>
          {c.phone && (
            <a
              href={`tel:${c.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-brand-800 dark:text-brand-400"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function FacilitiesTab({ facilities, onToggle, navigate }) {
  if (facilities.length === 0) {
    return (
      <EmptyState
        icon={Building}
        title="No facilities"
        description="Add hospitals and ASCs you work with"
        actionLabel="Add Facility"
        onAction={() => navigate('/facilities/new')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {facilities.map((f) => (
        <div
          key={f.id}
          onClick={() => navigate(`/facilities/${f.id}/edit?returnTab=facilities`)}
          className="flex min-h-touch cursor-pointer items-center justify-between rounded-lg px-3 py-3 active:bg-gray-100 dark:active:bg-gray-800"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-800 dark:text-gray-200">{f.name}</p>
              {f.facility_type && (
                <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  {f.facility_type.toUpperCase()}
                </span>
              )}
            </div>
            {(f.city || f.state) && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {[f.city, f.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <ActiveToggle isActive={f.is_active !== false} onToggle={(val) => onToggle(f.id, val)} />
        </div>
      ))}
    </div>
  );
}

function ManufacturersTab({ manufacturers, onToggle, navigate }) {
  if (manufacturers.length === 0) {
    return (
      <EmptyState
        icon={Factory}
        title="No manufacturers"
        description="Add manufacturers you work with"
        actionLabel="Add Manufacturer"
        onAction={() => navigate('/manufacturers/new')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {manufacturers.map((m) => (
        <div
          key={m.id}
          onClick={() => navigate(`/manufacturers/${m.id}?returnTab=manufacturers`)}
          className="flex min-h-touch cursor-pointer items-center justify-between rounded-lg px-3 py-3 active:bg-gray-100 dark:active:bg-gray-800"
        >
          <p className="font-medium text-gray-800 dark:text-gray-200">{m.name}</p>
          <ActiveToggle isActive={m.is_active !== false} onToggle={(val) => onToggle(m.id, val)} />
        </div>
      ))}
    </div>
  );
}

function SurgeonsTab({ surgeons, onToggle, navigate }) {
  if (surgeons.length === 0) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="No surgeons"
        description="Add surgeons you work with"
        actionLabel="Add Surgeon"
        onAction={() => navigate('/surgeons/new')}
      />
    );
  }

  return (
    <div className="space-y-1">
      {surgeons.map((s) => (
        <div
          key={s.id}
          onClick={() => navigate(`/surgeons/${s.id}/edit?returnTab=surgeons`)}
          className="flex min-h-touch cursor-pointer items-center justify-between rounded-lg px-3 py-3 active:bg-gray-100 dark:active:bg-gray-800"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-800 dark:text-gray-200">{s.full_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {[s.specialty, s.primary_facility?.name].filter(Boolean).join(' · ')}
            </p>
          </div>
          <ActiveToggle isActive={s.is_active !== false} onToggle={(val) => onToggle(s.id, val)} />
        </div>
      ))}
    </div>
  );
}
