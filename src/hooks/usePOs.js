import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function usePOs(filters = {}) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['purchase_orders', accountId, filters],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select('*, case:cases(case_number, surgeon:surgeons(full_name)), facility:facilities(name), distributor:distributors(name)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters.facility_id) query = query.eq('facility_id', filters.facility_id);
      if (filters.distributor_id) query = query.eq('distributor_id', filters.distributor_id);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function usePO(id) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['purchase_orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, case:cases(*, surgeon:surgeons(full_name), facility:facilities(*), distributor:distributors(*)), facility:facilities(*), distributor:distributors(*)')
        .eq('id', id)
        .eq('account_id', accountId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!accountId,
  });
}

export function useCasePOs(caseId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['purchase_orders', 'case', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, facility:facilities(name), distributor:distributors(name)')
        .eq('case_id', caseId)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!caseId && !!accountId,
  });
}

export function useCreatePO() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert({ ...values, account_id: accountId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useUpdatePO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useDeletePO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
