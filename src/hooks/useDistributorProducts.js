import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useDistributorProducts(distributorId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['distributor_products', distributorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distributor_products')
        .select('*')
        .eq('distributor_id', distributorId)
        .eq('account_id', accountId)
        .order('product_type');
      if (error) throw error;
      return data;
    },
    enabled: !!distributorId && !!accountId,
  });
}

export function useUpsertDistributorProducts() {
  const queryClient = useQueryClient();
  const { account } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async ({ distributorId, products }) => {
      // Delete existing products for this distributor
      const { error: deleteError } = await supabase
        .from('distributor_products')
        .delete()
        .eq('distributor_id', distributorId)
        .eq('account_id', accountId);
      if (deleteError) throw deleteError;

      // Insert new products (filter out empty ones)
      const toInsert = products
        .filter((p) => p.commission_rate !== '' && p.commission_rate != null)
        .map((p) => ({
          account_id: accountId,
          distributor_id: distributorId,
          product_type: p.product_type,
          custom_name: p.product_type === 'ancillary' ? p.custom_name : null,
          commission_rate: Number(p.commission_rate),
          is_active: true,
        }));

      if (toInsert.length > 0) {
        const { data, error } = await supabase
          .from('distributor_products')
          .insert(toInsert)
          .select();
        if (error) throw error;
        return data;
      }
      return [];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['distributor_products', variables.distributorId] });
    },
  });
}
