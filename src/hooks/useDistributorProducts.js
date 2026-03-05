import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { TABLES } from '@/lib/tables';

/** Fetches only active distributor products (for dropdowns) */
export function useDistributorProducts(distributorId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['distributor_products', distributorId, 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.DISTRIBUTOR_PRODUCTS)
        .select('*')
        .eq('distributor_id', distributorId)
        .eq('account_id', accountId)
        .eq('is_active', true)
        .order('product_type');
      if (error) throw error;
      return data;
    },
    enabled: !!distributorId && !!accountId,
  });
}

/** Fetches all distributor products (active + inactive) for the settings page */
export function useAllDistributorProducts(distributorId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['distributor_products', distributorId, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.DISTRIBUTOR_PRODUCTS)
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
      // 1. Delete all existing products for this distributor (clean slate)
      const { error: deleteError } = await supabase
        .from(TABLES.DISTRIBUTOR_PRODUCTS)
        .delete()
        .eq('distributor_id', distributorId)
        .eq('account_id', accountId);
      if (deleteError) throw deleteError;

      // 2. Build insert array for all products (standard + custom)
      const toInsert = [];

      products.forEach((p) => {
        if (p.product_type === 'custom') {
          if (p.custom_name?.trim() && p.commission_rate !== '' && p.commission_rate != null) {
            toInsert.push({
              account_id: accountId,
              distributor_id: distributorId,
              product_type: 'custom',
              custom_name: p.custom_name,
              commission_rate: Number(p.commission_rate),
              is_active: true,
            });
          }
        } else {
          toInsert.push({
            account_id: accountId,
            distributor_id: distributorId,
            product_type: p.product_type,
            custom_name: null,
            commission_rate: Number(p.commission_rate),
            is_active: true,
          });
        }
      });

      // 3. Insert all checked products
      if (toInsert.length > 0) {
        const { error } = await supabase
          .from(TABLES.DISTRIBUTOR_PRODUCTS)
          .insert(toInsert)
          .select();
        if (error) throw error;
      }

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['distributor_products', variables.distributorId] });
    },
  });
}
