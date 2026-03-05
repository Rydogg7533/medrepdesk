import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { useAuth } from '@/context/AuthContext';

export function useReferrals() {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['referrals', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.REFERRALS)
        .select('*, referred:accounts!referred_account_id(name, plan, sub_status, created_at)')
        .eq('referrer_account_id', accountId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useReferralPayouts() {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['referral-payouts', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.REFERRAL_PAYOUTS)
        .select('*')
        .eq('referrer_account_id', accountId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useReferralStats() {
  const { data: referrals = [] } = useReferrals();
  const { data: payouts = [] } = useReferralPayouts();

  const activeReferrals = referrals.filter((r) => r.status === 'active').length;
  const totalReferred = referrals.length;
  const totalEarned = referrals.reduce((sum, r) => sum + Number(r.total_earned || 0), 0);
  const pendingPayouts = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.commission_amount || 0), 0);

  return {
    activeReferrals,
    totalReferred,
    totalEarned,
    pendingPayouts,
  };
}
