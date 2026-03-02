import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useSurgeons() {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['surgeons', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surgeons')
        .select('*, primary_facility:facilities(name)')
        .or(`is_global.eq.true,account_id.eq.${accountId}`)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useSurgeon(id) {
  return useQuery({
    queryKey: ['surgeons', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surgeons')
        .select('*, primary_facility:facilities(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSurgeon() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('surgeons')
        .insert({ ...values, account_id: accountId, is_global: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surgeons'] });
    },
  });
}

export function useUpdateSurgeon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from('surgeons')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['surgeons'] });
      queryClient.invalidateQueries({ queryKey: ['surgeons', data.id] });
    },
  });
}
