import clsx from 'clsx';
import { CASE_STATUSES, PO_STATUSES, COMMISSION_STATUSES, PAY_PERIOD_STATUSES } from '@/utils/constants';

const statusMaps = {
  case: CASE_STATUSES,
  po: PO_STATUSES,
  commission: COMMISSION_STATUSES,
  pay_period: PAY_PERIOD_STATUSES,
};

export default function StatusBadge({ status, type = 'case' }) {
  const map = statusMaps[type] || CASE_STATUSES;
  const config = map[status];

  if (!config) return null;

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  );
}
