import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

/** Fetches only active distributor products (for dropdowns) */
export function useDistributorProducts(distributorId) {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['distributor_products', distributorId, 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distributor_products')
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
      // 1. Deactivate all existing products for this distributor
      const { error: deactivateError } = await supabase
        .from('distributor_products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('distributor_id', distributorId)
        .eq('account_id', accountId);
      if (deactivateError) throw deactivateError;

      // 2. Delete old custom products (we'll re-insert the current ones)
      const { error: deleteCustomError } = await supabase
        .from('distributor_products')
        .delete()
        .eq('distributor_id', distributorId)
        .eq('account_id', accountId)
        .eq('product_type', 'custom');
      if (deleteCustomError) throw deleteCustomError;

      // 3. Separate standard and custom products
      const standardProducts = products.filter((p) => p.product_type !== 'custom');
      const customProducts = products.filter((p) => p.product_type === 'custom');

      // 4. Upsert standard products (unique index on account_id, distributor_id, product_type)
      if (standardProducts.length > 0) {
        const toUpsert = standardProducts.map((p) => ({
          account_id: accountId,
          distributor_id: distributorId,
          product_type: p.product_type,
          custom_name: null,
          commission_rate: Number(p.commission_rate),
          is_active: true,
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('distributor_products')
          .upsert(toUpsert, { onConflict: 'account_id,distributor_id,product_type', ignoreDuplicates: false })
          .select();
        if (error) throw error;
      }

      // 5. Insert custom products
      if (customProducts.length > 0) {
        const toInsert = customProducts
          .filter((p) => p.custom_name?.trim() && p.commission_rate !== '' && p.commission_rate != null)
          .map((p) => ({
            account_id: accountId,
            distributor_id: distributorId,
            product_type: 'custom',
            custom_name: p.custom_name,
            commission_rate: Number(p.commission_rate),
            is_active: true,
          }));

        if (toInsert.length > 0) {
          const { error } = await supabase
            .from('distributor_products')
            .insert(toInsert)
            .select();
          if (error) throw error;
        }
      }

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['distributor_products', variables.distributorId] });
    },
  });
}
