import { TABLES } from '@/lib/tables';

const MAX_RETRIES = 3;

export async function generateCaseNumber(supabase, accountId) {
  const year = new Date().getFullYear();

  const { data: account, error: accountError } = await supabase
    .from(TABLES.ACCOUNTS)
    .select('referral_code')
    .eq('id', accountId)
    .single();

  if (accountError || !account) throw new Error('Account not found');

  const prefix = account.referral_code.slice(-4).toUpperCase();
  const pattern = `MRD-${prefix}-${year}-%`;

  // Find the MAX existing sequence number for this year
  const { data: cases, error: queryError } = await supabase
    .from(TABLES.CASES)
    .select('case_number')
    .eq('account_id', accountId)
    .like('case_number', pattern)
    .order('case_number', { ascending: false })
    .limit(1);

  if (queryError) throw new Error('Failed to query cases');

  let nextSeq = 1;
  if (cases && cases.length > 0) {
    const lastNumber = cases[0].case_number;
    const seqStr = lastNumber.split('-').pop();
    const parsed = parseInt(seqStr, 10);
    if (!isNaN(parsed)) nextSeq = parsed + 1;
  }

  // Retry loop in case of race condition
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const sequence = String(nextSeq + attempt).padStart(4, '0');
    const caseNumber = `MRD-${prefix}-${year}-${sequence}`;

    // Check if this number already exists
    const { count } = await supabase
      .from(TABLES.CASES)
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('case_number', caseNumber);

    if (count === 0) return caseNumber;
  }

  // Fallback: use timestamp suffix
  const ts = Date.now().toString(36).toUpperCase();
  return `MRD-${prefix}-${year}-${ts}`;
}
