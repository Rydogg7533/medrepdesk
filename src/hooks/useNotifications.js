import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useNotifications(limit = 20) {
  const { account, user } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['notifications', accountId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('account_id', accountId)
        .order('sent_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useUnreadCount() {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['notifications', 'unread-count', accountId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId)
        .eq('is_read', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!accountId,
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const { account } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('account_id', account.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
