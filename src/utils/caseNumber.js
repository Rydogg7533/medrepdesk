export async function generateCaseNumber(supabase, accountId) {
  const year = new Date().getFullYear();

  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('referral_code')
    .eq('id', accountId)
    .single();

  if (accountError || !account) throw new Error('Account not found');

  const prefix = account.referral_code.substring(0, 4).toUpperCase();

  const { count, error: countError } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .gte('created_at', `${year}-01-01T00:00:00Z`);

  if (countError) throw new Error('Failed to count cases');

  const sequence = String((count || 0) + 1).padStart(4, '0');
  return `MRD-${prefix}-${year}-${sequence}`;
}
