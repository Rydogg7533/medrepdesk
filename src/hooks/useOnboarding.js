import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { useAuth } from '@/context/AuthContext';

export function useUpdateUser() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateAccountOnboarding() {
  const { account } = useAuth();

  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from(TABLES.ACCOUNTS)
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', account.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });
}
