import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, FileText, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { usePOs } from '@/hooks/usePOs';
import { useCommissions } from '@/hooks/useCommissions';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrency, formatDate } from '@/utils/formatters';

const tabs = [
  { key: 'pos', label: 'Purchase Orders' },
  { key: 'commissions', label: 'Commissions' },
];

const PO_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'received', label: 'Received' },
  { key: 'paid', label: 'Paid' },
  { key: 'disputed', label: 'Disputed' },
];

const COMM_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'received', label: 'Received' },
  { key: 'disputed', label: 'Disputed' },
];

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return dateStr < new Date().toISOString().split('T')[0];
}

export default function Money() {
  const [activeTab, setActiveTab] = useState('pos');
  const [poFilter, setPOFilter] = useState('all');
  const [commFilter, setCommFilter] = useState('all');
  const navigate = useNavigate();

  const { data: allPOs = [], isLoading: posLoading } = usePOs();
  const { data: allCommissions = [], isLoading: commsLoading } = useCommissions();

  const filteredPOs = poFilter === 'all' ? allPOs : allPOs.filter((p) => p.status === poFilter);
  const filteredComms = commFilter === 'all' ? allCommissions : allCommissions.filter((c) => c.status === commFilter);

  // PO summary
  const outstandingPOs = allPOs.filter((p) => !['paid', 'disputed'].includes(p.status));
  const totalOutstanding = outstandingPOs.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Commission summary
  const pendingComms = allCommissions.filter((c) => c.status === 'pending');
  const totalPending = pendingComms.reduce((sum, c) => sum + (c.expected_amount || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisYear = new Date().getFullYear().toString();
  const receivedThisMonth = allCommissions
    .filter((c) => c.status === 'received' && c.received_date?.startsWith(thisMonth))
    .reduce((sum, c) => sum + (c.received_amount || 0), 0);
  const receivedYTD = allCommissions
    .filter((c) => c.status === 'received' && c.received_date?.startsWith(thisYear))
    .reduce((sum, c) => sum + (c.received_amount || 0), 0);

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900">Money</h1>

      <div className="mb-4 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-brand-800 text-white'
                : 'bg-gray-100 text-gray-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'pos' && (
        <>
          {/* Summary */}
          <Card className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Outstanding</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalOutstanding)}</p>
              </div>
              <div className="text-right text-xs text-gray-500">
                {outstandingPOs.length} PO{outstandingPOs.length !== 1 ? 's' : ''}
              </div>
            </div>
          </Card>

          {/* Filters */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {PO_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setPOFilter(f.key)}
                className={clsx(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                  poFilter === f.key ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {posLoading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : filteredPOs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Purchase Orders"
              description="POs will appear here as you create them"
              actionLabel="Add PO"
              onAction={() => navigate('/po/new')}
            />
          ) : (
            <div className="space-y-2">
              {filteredPOs.map((po) => {
                const overdue = isOverdue(po.expected_payment_date) && po.status !== 'paid';
                return (
                  <Card
                    key={po.id}
                    className={clsx('cursor-pointer active:bg-gray-50', overdue && 'border-l-4 border-l-red-400')}
                    onClick={() => navigate(`/po/${po.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {po.case?.case_number || 'No case'}
                        </p>
                        <p className="text-xs text-gray-500">
                          INV: {po.invoice_number}
                          {po.po_number && ` · PO: ${po.po_number}`}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(po.amount)}
                          </span>
                          {po.facility?.name && (
                            <span className="text-xs text-gray-400">{po.facility.name}</span>
                          )}
                        </div>
                        {po.expected_payment_date && (
                          <p className={clsx('text-xs', overdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
                            {overdue ? 'Overdue: ' : 'Expected: '}{formatDate(po.expected_payment_date)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={po.status} type="po" />
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'commissions' && (
        <>
          {/* Summary */}
          <Card className="mb-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPending)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">This Month</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(receivedThisMonth)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">YTD</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(receivedYTD)}</p>
              </div>
            </div>
          </Card>

          {/* Filters */}
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {COMM_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setCommFilter(f.key)}
                className={clsx(
                  'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                  commFilter === f.key ? 'bg-brand-800 text-white' : 'bg-gray-100 text-gray-600'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {commsLoading ? (
            <div className="space-y-3">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : filteredComms.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No Commissions"
              description="Commissions will appear as you add them to cases"
              actionLabel="Add Commission"
              onAction={() => navigate('/commissions/new')}
            />
          ) : (
            <div className="space-y-2">
              {filteredComms.map((comm) => (
                <Card
                  key={comm.id}
                  className="cursor-pointer active:bg-gray-50"
                  onClick={() => navigate(`/commissions/${comm.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {comm.case?.case_number || 'No case'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {comm.distributor?.name || 'No distributor'}
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <span className="text-sm text-gray-500">
                          Expected: {formatCurrency(comm.expected_amount)}
                        </span>
                        {comm.received_amount != null && (
                          <span className="text-sm font-semibold text-green-600">
                            Received: {formatCurrency(comm.received_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={comm.status} type="commission" />
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
