import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useFacilities({ activeOnly, filter } = {}) {
  const { account } = useAuth();
  const accountId = account?.id;

  // Backward compat: activeOnly: true → filter: 'active'
  const resolvedFilter = filter ?? (activeOnly ? 'active' : undefined);

  return useQuery({
    queryKey: ['facilities', accountId, { filter: resolvedFilter }],
    queryFn: async () => {
      let query = supabase
        .from('facilities')
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

export function useSearchFacilities({ filterStates } = {}) {
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef(null);

  const search = useCallback(
    (term) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const { data, error } = await supabase.rpc('search_facilities', {
            search_term: term,
            filter_states: filterStates?.length ? filterStates : null,
            result_limit: 20,
          });
          if (error) throw error;
          setResults(
            (data || []).map((f) => ({
              value: f.id,
              label: f.name,
              subtitle: [f.city, f.state].filter(Boolean).join(', ') || null,
              is_global: f.is_global,
            }))
          );
        } catch (err) {
          console.error('search_facilities error:', err);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    },
    [filterStates]
  );

  return { search, results, isSearching };
}

export function useFacility(id) {
  return useQuery({
    queryKey: ['facilities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateFacility() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from('facilities')
        .insert({ ...values, account_id: accountId, is_global: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

export function useDeleteFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      console.log('[useDeleteFacility] Attempting delete for id:', id);
      const { data, error, status, statusText } = await supabase.from('facilities').delete().eq('id', id).select();
      console.log('[useDeleteFacility] Response:', { data, error, status, statusText });
      if (error) {
        console.error('[useDeleteFacility] Supabase error:', error);
        throw error;
      }
      if (!data || data.length === 0) {
        console.error('[useDeleteFacility] No rows deleted — likely RLS policy blocking. Check is_global and account_id.');
        throw new Error('Delete failed — record not found or permission denied. Check that this is not a global facility.');
      }
      console.log('[useDeleteFacility] Successfully deleted:', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
    onError: (error) => {
      console.error('[useDeleteFacility] Mutation error:', error);
      alert(`Failed to delete facility: ${error.message}`);
    },
  });
}

export function useArchiveFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('facilities')
        .update({ is_archived: true, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

export function useUnarchiveFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('facilities')
        .update({ is_archived: false, is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

export async function checkLinkedFacility(id) {
  const counts = [];
  const [cases, contacts, surgeons, pos] = await Promise.all([
    supabase.from('cases').select('id', { count: 'exact', head: true }).eq('facility_id', id),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('facility_id', id),
    supabase.from('surgeons').select('id', { count: 'exact', head: true }).eq('primary_facility_id', id),
    supabase.from('purchase_orders').select('id', { count: 'exact', head: true }).eq('facility_id', id),
  ]);
  if (cases.count > 0) counts.push(`${cases.count} case${cases.count > 1 ? 's' : ''}`);
  if (contacts.count > 0) counts.push(`${contacts.count} contact${contacts.count > 1 ? 's' : ''}`);
  if (surgeons.count > 0) counts.push(`${surgeons.count} surgeon${surgeons.count > 1 ? 's' : ''}`);
  if (pos.count > 0) counts.push(`${pos.count} PO${pos.count > 1 ? 's' : ''}`);
  const total = (cases.count || 0) + (contacts.count || 0) + (surgeons.count || 0) + (pos.count || 0);
  return { count: total, description: counts.join(' and ') };
}

export function useImportGlobalFacility() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (globalId) => {
      const { data: source, error: fetchError } = await supabase
        .from('facilities')
        .select('*')
        .eq('id', globalId)
        .single();
      if (fetchError) throw fetchError;

      const { id, created_at, updated_at, account_id, is_global, is_archived, ...fields } = source;
      const { data, error } = await supabase
        .from('facilities')
        .insert({ ...fields, account_id: accountId, is_global: false, is_archived: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  });
}

export function useUpdateFacility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from('facilities')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
      queryClient.invalidateQueries({ queryKey: ['facilities', data.id] });
    },
  });
}
