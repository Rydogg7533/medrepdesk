import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { TABLES } from '@/lib/tables';
import { generateCaseNumber } from '@/utils/caseNumber';

export function useCases(filters = {}) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['cases', accountId, filters],
    queryFn: async () => {
      let query = supabase
        .from(TABLES.CASES)
        .select('*, surgeon:surgeons(full_name), facility:facilities(name), distributor:distributors(name)')
        .eq('account_id', accountId)
        .order('scheduled_date', { ascending: false });

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useCase(id) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['cases', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.CASES)
        .select('*, surgeon:surgeons(*), facility:facilities(*), distributor:distributors(*)')
        .eq('id', id)
        .eq('account_id', accountId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!accountId,
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (values) => {
      const caseNumber = await generateCaseNumber(supabase, accountId);
      const insertPayload = { ...values, account_id: accountId, case_number: caseNumber, status: 'scheduled' };
      const { data, error } = await supabase
        .from(TABLES.CASES)
        .insert(insertPayload)
        .select()
        .single();
      if (error) {
        console.error('[useCreateCase] insert error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from(TABLES.CASES)
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['cases', data.id] });
    },
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from(TABLES.CASES).delete().eq('id', id);
      if (error) {
        console.error('Failed to delete case:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['bill_sheets'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['communications'] });
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}
