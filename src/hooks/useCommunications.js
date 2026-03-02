import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useCommunications(filters = {}) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['communications', accountId, filters],
    queryFn: async () => {
      let query = supabase
        .from('communications')
        .select('*, case:cases(case_number)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (filters.case_id) query = query.eq('case_id', filters.case_id);
      if (filters.contact_id) query = query.eq('contact_id', filters.contact_id);
      if (filters.follow_up_done !== undefined) query = query.eq('follow_up_done', filters.follow_up_done);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useCaseCommunications(caseId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['communications', 'case', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communications')
        .select('*')
        .eq('case_id', caseId)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!caseId && !!accountId,
  });
}

export function useCreateCommunication() {
  const queryClient = useQueryClient();
  const { account, user } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('communications')
        .insert({ ...values, account_id: accountId, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from('communications')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications'] });
    },
  });
}

export function useOverdueCommunications() {
  const { account } = useAuth();
  const accountId = account?.id;
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['communications', 'overdue', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communications')
        .select('*, case:cases(case_number)')
        .eq('account_id', accountId)
        .eq('follow_up_done', false)
        .lte('follow_up_date', today)
        .not('follow_up_date', 'is', null)
        .order('follow_up_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}
