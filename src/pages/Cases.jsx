import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Search, HelpCircle } from 'lucide-react';
import { useCases } from '@/hooks/useCases';
import StatusBadge from '@/components/ui/StatusBadge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { getProductLabel } from '@/utils/productCatalog';
import InfoTooltip from '@/components/ui/InfoTooltip';
import PipelineGuide from '@/components/features/PipelineGuide';
import clsx from 'clsx';

const FILTER_TABS = [
  { key: 'all', label: 'All', statuses: null },
  { key: 'scheduled', label: 'Scheduled', statuses: ['scheduled'] },
  { key: 'in_progress', label: 'In Progress', statuses: ['confirmed', 'completed', 'bill_sheet_submitted'] },
  { key: 'chasing', label: 'Chasing', statuses: ['po_requested'] },
  { key: 'money', label: 'Money', statuses: ['po_received', 'billed', 'paid'] },
];

export default function Cases() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showPipeline, setShowPipeline] = useState(false);

  const { data: cases, isLoading } = useCases();

  const filtered = useMemo(() => {
    if (!cases) return [];
    const tab = FILTER_TABS.find((t) => t.key === activeTab);
    let result = cases;
    if (tab?.statuses) {
      result = result.filter((c) => tab.statuses.includes(c.status));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.case_number?.toLowerCase().includes(q) ||
          c.surgeon?.full_name?.toLowerCase().includes(q) ||
          c.facility?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cases, activeTab, search]);

  const procLabel = (type) => getProductLabel(type);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-1">
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cases</h1>
        <InfoTooltip text="Cases track every surgical procedure from scheduling through payment. Each case gets a unique MRD number and moves through the status pipeline automatically." />
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-touch w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-500"
        />
      </div>

      {/* Filter Tabs */}
      <div className="mb-1 flex items-center gap-1">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</span>
        <button
          onClick={() => setShowPipeline(true)}
          className="ml-0.5 inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
          aria-label="Pipeline guide"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-brand-800 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Case List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No cases found"
          description={search ? 'Try a different search' : 'Create your first case to get started'}
          actionLabel="New Case"
          onAction={() => navigate('/cases/new')}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="cursor-pointer rounded-xl bg-white p-4 shadow-sm active:bg-gray-50 dark:bg-gray-800 dark:active:bg-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{c.case_number}<InfoTooltip text="Your unique case number (MRD-XXXX-YYYY-0001) is auto-generated from your account prefix, year, and sequence." /></p>
                  <p className="mt-0.5 font-medium text-gray-800 dark:text-gray-200">
                    {c.surgeon?.full_name || 'No surgeon'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {c.facility?.name || 'No facility'}
                  </p>
                </div>
                <StatusBadge status={c.status} type="case" />
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                <span>{formatDate(c.scheduled_date)}</span>
                {c.procedure_type && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    {procLabel(c.procedure_type)}
                  </span>
                )}
                <span className="ml-auto font-medium text-gray-600 dark:text-gray-300">
                  {c.case_value ? formatCurrency(c.case_value) : '—'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <PipelineGuide isOpen={showPipeline} onClose={() => setShowPipeline(false)} />
    </div>
  );
}
