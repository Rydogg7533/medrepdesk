import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { useAuth } from '@/context/AuthContext';

export function usePoEmailLog(poId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['po_email_log', poId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.PO_EMAIL_LOGS)
        .select('*')
        .eq('po_id', poId)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!poId && !!accountId,
  });
}
