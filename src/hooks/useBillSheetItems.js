import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useBillSheetItems(caseId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['bill_sheet_items', caseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bill_sheet_items')
        .select('*, distributor_product:distributor_products(*), manufacturer:manufacturers(name), case:cases(id, case_number, status, scheduled_date, facility_id, distributor_id, surgeon:surgeons(full_name), facility:facilities(name), distributor:distributors(id, name, billing_email, billing_email_cc))')
        .eq('case_id', caseId)
        .eq('account_id', accountId)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!caseId && !!accountId,
  });
}

export function useCreateBillSheetItems() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async (items) => {
      const toInsert = items.map((item) => ({
        ...item,
        account_id: accountId,
      }));
      const { data, error } = await supabase
        .from('bill_sheet_items')
        .insert(toInsert)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill_sheet_items'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
