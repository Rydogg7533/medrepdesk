import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useSubscription() {
  const { account } = useAuth();

  return {
    plan: account?.plan || 'solo',
    status: account?.sub_status || 'trialing',
    isActive: ['active', 'trialing'].includes(account?.sub_status),
    isPastDue: account?.sub_status === 'past_due',
    isCanceled: account?.sub_status === 'canceled',
    isTrialing: account?.sub_status === 'trialing',
    hasStripeCustomer: !!account?.stripe_customer_id,
  };
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async ({ plan }) => {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan,
          success_url: `${window.location.origin}/settings?checkout=success`,
          cancel_url: `${window.location.origin}/pricing?checkout=cancel`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          return_url: `${window.location.origin}/settings`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

export function useCreateConnectAccount() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-connect-account', {
        body: {
          return_url: `${window.location.origin}/referrals?connect=complete`,
          refresh_url: `${window.location.origin}/referrals?connect=refresh`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}
