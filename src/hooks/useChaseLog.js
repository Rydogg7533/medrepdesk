import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useChaseLog(caseId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['chase_log', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_chase_log')
        .select('*, facility:facilities(name)')
        .eq('case_id', caseId)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!caseId && !!accountId,
  });
}

export function useCreateChaseEntry() {
  const queryClient = useQueryClient();
  const { account, user } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('po_chase_log')
        .insert({ ...values, account_id: accountId, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chase_log'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['bill_sheets'] });
    },
  });
}

export function useUpdateChaseEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from('po_chase_log')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chase_log'] });
    },
  });
}

export function useOverdueFollowUps() {
  const { account } = useAuth();
  const accountId = account?.id;
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['chase_log', 'overdue_followups', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_chase_log')
        .select('*, case:cases(case_number), facility:facilities(name)')
        .eq('account_id', accountId)
        .eq('follow_up_done', false)
        .lte('next_follow_up', today)
        .not('next_follow_up', 'is', null)
        .order('next_follow_up', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useOverduePromisedDates() {
  const { account } = useAuth();
  const accountId = account?.id;
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['chase_log', 'overdue_promised', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_chase_log')
        .select('*, case:cases(case_number), facility:facilities(name)')
        .eq('account_id', accountId)
        .eq('follow_up_done', false)
        .lt('promised_date', today)
        .not('promised_date', 'is', null)
        .order('promised_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}
