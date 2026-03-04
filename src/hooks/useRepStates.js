import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useRepStates() {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['repStates', accountId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_rep_states');
      if (error) throw error;
      return data || [];
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}
