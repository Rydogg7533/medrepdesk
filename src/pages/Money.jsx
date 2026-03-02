import { useState } from 'react';
import { DollarSign, FileText } from 'lucide-react';
import clsx from 'clsx';
import EmptyState from '@/components/ui/EmptyState';

const tabs = [
  { key: 'pos', label: 'Purchase Orders' },
  { key: 'commissions', label: 'Commissions' },
];

export default function Money() {
  const [activeTab, setActiveTab] = useState('pos');

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

      <EmptyState
        icon={activeTab === 'pos' ? FileText : DollarSign}
        title="Coming Soon"
        description={
          activeTab === 'pos'
            ? 'PO tracking and chase workflow will be built in Step 4'
            : 'Commission tracking will be built in Step 4'
        }
      />
    </div>
  );
}
