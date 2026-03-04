import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useRepStates() {
  const { account } = useAuth();
  const accountId = account?.id;
  const profileStates = account?.rep_states;

  return useQuery({
    queryKey: ['repStates', accountId],
    queryFn: async () => {
      // If account has explicit rep_states configured, use those
      if (Array.isArray(profileStates) && profileStates.length > 0) {
        return profileStates;
      }
      // Fall back to facility-inferred states via RPC
      const { data, error } = await supabase.rpc('get_rep_states');
      if (error) throw error;
      if (data && data.length > 0) return data;
      // No states found at all — return null to indicate "show all"
      return null;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });
}
