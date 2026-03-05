import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { TABLES } from '@/lib/tables';

export function useManufacturers({ activeOnly, filter } = {}) {
  const { account } = useAuth();
  const accountId = account?.id;

  const resolvedFilter = filter ?? (activeOnly ? 'active' : undefined);

  return useQuery({
    queryKey: ['manufacturers', accountId, { filter: resolvedFilter }],
    queryFn: async () => {
      let query = supabase
        .from(TABLES.MANUFACTURERS)
        .select('*')
        .eq('account_id', accountId);
      if (resolvedFilter === 'active') {
        query = query.eq('is_active', true).eq('is_archived', false);
      } else if (resolvedFilter === 'inactive') {
        query = query.eq('is_active', false).eq('is_archived', false);
      } else if (resolvedFilter === 'archived') {
        query = query.eq('is_archived', true);
      }
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useManufacturer(id) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['manufacturers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.MANUFACTURERS)
        .select('*')
        .eq('id', id)
        .eq('account_id', accountId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!accountId,
  });
}

export function useCreateManufacturer() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from(TABLES.MANUFACTURERS)
        .insert({ ...values, account_id: accountId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
    },
  });
}

export function useUpdateManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from(TABLES.MANUFACTURERS)
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturers', data.id] });
    },
  });
}

export function useDeleteManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase.from(TABLES.MANUFACTURERS).delete().eq('id', id).select();
      if (error) {
        console.error('[useDeleteManufacturer] Supabase error:', error);
        throw error;
      }
      if (!data || data.length === 0) {
        console.error('[useDeleteManufacturer] No rows deleted — likely RLS policy blocking.');
        throw new Error('Delete failed — record not found or permission denied');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
    },
    onError: (error) => {
      console.error('[useDeleteManufacturer] Mutation error:', error);
      alert(`Failed to delete manufacturer: ${error.message}`);
    },
  });
}

export function useArchiveManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from(TABLES.MANUFACTURERS)
        .update({ is_archived: true, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
    },
  });
}

export function useUnarchiveManufacturer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from(TABLES.MANUFACTURERS)
        .update({ is_archived: false, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
    },
  });
}

export async function checkLinkedManufacturer(id) {
  const { count } = await supabase
    .from(TABLES.CONTACTS)
    .select('id', { count: 'exact', head: true })
    .eq('manufacturer_id', id);
  const total = count || 0;
  if (total === 0) return { count: 0, description: '' };
  return { count: total, description: `${total} contact${total > 1 ? 's' : ''}` };
}
