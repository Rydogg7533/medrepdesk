import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useSubscription() {
  const { account } = useAuth();

  const plan = account?.plan || 'solo';
  const subStatus = account?.sub_status || 'trialing';
  const isActive = ['active', 'trialing'].includes(subStatus);
  const isTrialing = subStatus === 'trialing';
  const isPastDue = subStatus === 'past_due';
  const isCanceled = subStatus === 'canceled';

  return {
    plan,
    status: subStatus,
    subStatus,
    isActive,
    isTrial: isTrialing,
    isTrialing,
    isPastDue,
    isCanceled,
    hasStripeCustomer: !!account?.stripe_customer_id,
    canAccessAssistant: isActive && ['assistant', 'distributorship'].includes(plan),
    canAccessDistributorship: isActive && plan === 'distributorship',
    trialEndsAt: account?.created_at ? new Date(new Date(account.created_at).getTime() + 14 * 24 * 60 * 60 * 1000) : null,
  };
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async ({ plan }) => {
      console.log('useCreateCheckout mutationFn called, plan:', plan);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan,
          success_url: `${window.location.origin}/settings?checkout=success`,
          cancel_url: `${window.location.origin}/pricing?checkout=cancel`,
        },
      });
      console.log('create-checkout response data:', data);
      console.log('create-checkout response error:', error);
      if (error) {
        // Try to extract message from FunctionsHttpError
        const msg = error?.context?.body ? await error.context.text?.() : error.message;
        console.error('create-checkout error detail:', msg);
        throw new Error(msg || error.message);
      }
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
