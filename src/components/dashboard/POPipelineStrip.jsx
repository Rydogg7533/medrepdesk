import { useNavigate } from 'react-router-dom';
import { PO_STATUSES } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatters';

const PIPELINE_ORDER = ['requested', 'pending', 'received', 'processing', 'paid'];

export default function POPipelineStrip({ pos = [] }) {
  const navigate = useNavigate();

  const grouped = {};
  pos.forEach((po) => {
    if (!grouped[po.status]) grouped[po.status] = { count: 0, total: 0 };
    grouped[po.status].count += 1;
    grouped[po.status].total += po.amount || 0;
  });

  const statuses = PIPELINE_ORDER.filter((s) => grouped[s]?.count > 0);

  if (statuses.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">No active POs</p>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
      {statuses.map((status) => {
        const info = PO_STATUSES[status];
        const { count, total } = grouped[status];
        return (
          <button
            key={status}
            onClick={() => navigate(`/money?status=${status}`)}
            className="flex-shrink-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-center shadow-sm active:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:active:bg-gray-700"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{info.label}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{count}</p>
            <p className="text-xs text-green-600 dark:text-green-400">{formatCurrency(total)}</p>
          </button>
        );
      })}
    </div>
  );
}
