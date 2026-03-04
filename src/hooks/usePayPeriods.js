import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { calculatePayPeriods } from '@/utils/payPeriods';

export function usePayPeriods(distributorId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['pay_periods', accountId, distributorId],
    queryFn: async () => {
      let query = supabase
        .from('pay_periods')
        .select('*, distributor:distributors(name)')
        .eq('account_id', accountId)
        .order('period_end', { ascending: false });

      if (distributorId) {
        query = query.eq('distributor_id', distributorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function usePayPeriod(id) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['pay_periods', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pay_periods')
        .select('*, distributor:distributors(name)')
        .eq('id', id)
        .eq('account_id', accountId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!accountId,
  });
}

export function useCreatePayPeriod() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('pay_periods')
        .insert({ ...values, account_id: accountId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay_periods'] });
    },
  });
}

export function useUpdatePayPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from('pay_periods')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay_periods'] });
    },
  });
}

export function usePayPeriodCommissions(periodId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['commissions', 'pay_period', periodId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*, case:cases(case_number), distributor:distributors(name)')
        .eq('pay_period_id', periodId)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!periodId && !!accountId,
  });
}

export function useEnsurePayPeriods(distributorId, paySchedule) {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (overrideSchedule) => {
      const schedule = overrideSchedule || paySchedule;
      if (!schedule?.frequency || !schedule?.first_pay_date || !distributorId || !accountId) {
        return [];
      }

      // Generate from first_pay_date to 3 months ahead of today
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setMonth(futureDate.getMonth() + 3);
      const endDate = futureDate.toISOString().split('T')[0];

      const periods = calculatePayPeriods(schedule, schedule.first_pay_date, endDate);
      if (periods.length === 0) return [];

      // Upsert — on conflict do nothing (keep existing data)
      const rows = periods.map((p) => ({
        account_id: accountId,
        distributor_id: distributorId,
        period_start: p.period_start,
        period_end: p.period_end,
        status: 'open',
      }));

      const { data, error } = await supabase
        .from('pay_periods')
        .upsert(rows, { onConflict: 'account_id,distributor_id,period_start,period_end', ignoreDuplicates: true })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay_periods'] });
    },
  });
}
