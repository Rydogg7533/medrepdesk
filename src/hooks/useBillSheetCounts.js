import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { useAuth } from '@/context/AuthContext';

export function useCaseIdsWithBillSheet() {
  const { account } = useAuth();
  return useQuery({
    queryKey: ['bill_sheet_case_ids', account?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.BILL_SHEET_ITEMS)
        .select('case_id')
        .eq('account_id', account.id);
      if (error) throw error;
      return new Set(data.map((r) => r.case_id));
    },
    enabled: !!account?.id,
  });
}
