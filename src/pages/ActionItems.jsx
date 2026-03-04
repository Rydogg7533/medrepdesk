import { useNavigate } from 'react-router-dom';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCases } from '@/hooks/useCases';
import { usePOs } from '@/hooks/usePOs';
import { useOverdueFollowUps, useOverduePromisedDates } from '@/hooks/useChaseLog';
import { useCommissions } from '@/hooks/useCommissions';
import { useOverdueCommunications } from '@/hooks/useCommunications';
import { useCaseIdsWithBillSheet } from '@/hooks/useBillSheetCounts';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { buildActionItems } from '@/utils/actionItems';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function ActionItems() {
  const navigate = useNavigate();
  const today = todayISO();

  const { data: allCases, isLoading } = useCases();
  const { data: allPOs = [] } = usePOs();
  const { data: overdueFollowUps = [] } = useOverdueFollowUps();
  const { data: overduePromised = [] } = useOverduePromisedDates();
  const { data: allCommissions = [] } = useCommissions();
  const { data: overdueComms = [] } = useOverdueCommunications();
  const { data: billSheetCaseIds = new Set() } = useCaseIdsWithBillSheet();

  const completedNeedBillSheet = allCases?.filter(
    (c) => c.status === 'completed' && !billSheetCaseIds.has(c.id)
  ) || [];

  const overduePOs = allPOs.filter(
    (p) => p.expected_payment_date && p.expected_payment_date < today && p.status !== 'paid'
  );
  const overdueCommissions = allCommissions.filter(
    (c) => c.expected_date && c.expected_date < today && c.status === 'pending'
  );

  const actionItems = buildActionItems({
    overdueFollowUps,
    overduePromised,
    completedNeedBillSheet,
    overduePOs,
    overdueCommissions,
    overdueComms,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Action Items</h1>
        {actionItems.length > 0 && (
          <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
            {actionItems.length}
          </span>
        )}
      </div>

      {actionItems.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="mb-3 h-12 w-12 text-green-400" />
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">All caught up!</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">No action items require your attention.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {actionItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.id}
                className="cursor-pointer active:bg-gray-50 dark:active:bg-gray-700"
                onClick={() => item.link && navigate(item.link)}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 flex-shrink-0 ${item.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.text}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
