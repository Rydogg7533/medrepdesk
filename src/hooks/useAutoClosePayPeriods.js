import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { closePayPeriod } from '@/utils/payPeriodClose';
import { formatDate, formatCurrency } from '@/utils/formatters';

/**
 * On app load, checks for open pay periods past their end date and auto-closes them.
 * Shows a toast for each closed period.
 */
export function useAutoClosePayPeriods() {
  const { account, user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!account?.id || !user?.id || hasRun.current) return;
    hasRun.current = true;

    async function checkAndClose() {
      const today = new Date().toISOString().split('T')[0];

      // Find open periods where period_end < today
      const { data: expiredPeriods, error } = await supabase
        .from('pay_periods')
        .select('id, period_start, period_end')
        .eq('account_id', account.id)
        .eq('status', 'open')
        .lt('period_end', today)
        .order('period_end', { ascending: true });

      if (error || !expiredPeriods?.length) return;

      for (const period of expiredPeriods) {
        try {
          const result = await closePayPeriod(supabase, period.id, account.id, user.id);
          const dateRange = `${formatDate(period.period_start)} – ${formatDate(period.period_end)}`;
          toast({
            message: `Pay period closed: ${dateRange}. Expected: ${formatCurrency(result.expectedAmount)}`,
            type: 'info',
            duration: 5000,
          });
        } catch (err) {
          console.error('Failed to auto-close pay period:', period.id, err);
        }
      }

      // Refresh pay periods and notifications caches
      queryClient.invalidateQueries({ queryKey: ['pay_periods'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    }

    checkAndClose();
  }, [account?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
