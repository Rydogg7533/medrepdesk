import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useCommissions(filters = {}) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['commissions', accountId, filters],
    queryFn: async () => {
      let query = supabase
        .from('commissions')
        .select('*, case:cases(case_number), distributor:distributors(name)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters.distributor_id) query = query.eq('distributor_id', filters.distributor_id);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useCommission(id) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['commissions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*, case:cases(case_number, surgeon:surgeons(full_name)), distributor:distributors(*)')
        .eq('id', id)
        .eq('account_id', accountId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!accountId,
  });
}

export function useCaseCommission(caseId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['commissions', 'case', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*, distributor:distributors(name)')
        .eq('case_id', caseId)
        .eq('account_id', accountId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!caseId && !!accountId,
  });
}

export function useCreateCommission() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (values) => {
      // Auto-link to current open pay period if not already specified
      let payPeriodId = values.pay_period_id || null;
      if (!payPeriodId && accountId) {
        const today = new Date().toISOString().split('T')[0];
        const { data: openPeriod } = await supabase
          .from('pay_periods')
          .select('id')
          .eq('account_id', accountId)
          .eq('status', 'open')
          .lte('period_start', today)
          .gte('period_end', today)
          .maybeSingle();
        if (openPeriod) payPeriodId = openPeriod.id;
      }

      const { data, error } = await supabase
        .from('commissions')
        .insert({ ...values, account_id: accountId, pay_period_id: payPeriodId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['pay_periods'] });
    },
  });
}

export function useUpdateCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from('commissions')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
