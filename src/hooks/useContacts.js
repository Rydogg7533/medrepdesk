import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useContacts({ activeOnly, filter } = {}) {
  const { account } = useAuth();
  const accountId = account?.id;

  const resolvedFilter = filter ?? (activeOnly ? 'active' : undefined);

  return useQuery({
    queryKey: ['contacts', accountId, { filter: resolvedFilter }],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('*, facility:facilities(name), distributor:distributors(name), manufacturer:manufacturers(name), surgeon:surgeons(full_name)')
        .eq('account_id', accountId);
      if (resolvedFilter === 'active') {
        query = query.eq('is_active', true).eq('is_archived', false);
      } else if (resolvedFilter === 'inactive') {
        query = query.eq('is_active', false).eq('is_archived', false);
      } else if (resolvedFilter === 'archived') {
        query = query.eq('is_archived', true);
      }
      const { data, error } = await query.order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useContact(id) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['contacts', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, facility:facilities(name), distributor:distributors(name), manufacturer:manufacturers(name), surgeon:surgeons(full_name)')
        .eq('id', id)
        .eq('account_id', accountId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!accountId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...values, account_id: accountId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts', data.id] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useArchiveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('contacts')
        .update({ is_archived: true, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUnarchiveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('contacts')
        .update({ is_archived: false, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export async function checkLinkedContact() {
  return { count: 0, description: '' };
}
