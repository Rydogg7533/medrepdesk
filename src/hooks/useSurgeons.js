import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useSurgeons({ activeOnly = false } = {}) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['surgeons', accountId, { activeOnly }],
    queryFn: async () => {
      let query = supabase
        .from('surgeons')
        .select('*, primary_facility:facilities(name)')
        .eq('account_id', accountId);
      if (activeOnly) query = query.eq('is_active', true);
      const { data, error } = await query.order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useSearchSurgeons({ filterStates } = {}) {
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef(null);

  const search = useCallback(
    (term) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const { data, error } = await supabase.rpc('search_surgeons', {
            search_term: term,
            filter_states: filterStates?.length ? filterStates : null,
            result_limit: 20,
          });
          if (error) throw error;
          setResults(
            (data || []).map((s) => ({
              value: s.id,
              label: s.full_name,
              subtitle: s.specialty || null,
              is_global: s.is_global,
            }))
          );
        } catch (err) {
          console.error('search_surgeons error:', err);
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

export function useDeleteSurgeon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('surgeons').delete().eq('id', id);
      if (error) throw error;
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
