import { formatDate, formatCurrency } from '@/utils/formatters';

/**
 * Close a pay period:
 * 1. Find unlinked commissions that fall within the period date range
 * 2. Link them to the period (set pay_period_id)
 * 3. Calculate expected_amount from linked commissions
 * 4. Update period status to 'closed'
 * 5. Create notification
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} periodId
 * @param {string} accountId
 * @param {string} [userId] - for notification targeting
 * @returns {Promise<{ period: object, expectedAmount: number }>}
 */
export async function closePayPeriod(supabase, periodId, accountId, userId) {
  // 1. Fetch the period
  const { data: period, error: periodErr } = await supabase
    .from('pay_periods')
    .select('*')
    .eq('id', periodId)
    .single();
  if (periodErr) throw periodErr;

  // 2. Find unlinked commissions within the period date range
  const { data: unlinkedComms, error: commsErr } = await supabase
    .from('commissions')
    .select('id, expected_amount')
    .eq('account_id', accountId)
    .is('pay_period_id', null)
    .gte('created_at', period.period_start)
    .lte('created_at', period.period_end + 'T23:59:59.999Z');
  if (commsErr) throw commsErr;

  // 3. Link unlinked commissions to this period
  if (unlinkedComms && unlinkedComms.length > 0) {
    const commIds = unlinkedComms.map((c) => c.id);
    const { error: linkErr } = await supabase
      .from('commissions')
      .update({ pay_period_id: periodId, updated_at: new Date().toISOString() })
      .in('id', commIds);
    if (linkErr) throw linkErr;
  }

  // 4. Get ALL commissions linked to this period (including previously linked ones)
  const { data: allLinkedComms, error: allErr } = await supabase
    .from('commissions')
    .select('expected_amount')
    .eq('pay_period_id', periodId);
  if (allErr) throw allErr;

  const expectedAmount = (allLinkedComms || []).reduce(
    (sum, c) => sum + (c.expected_amount || 0),
    0
  );

  // 5. Update period: status='closed', expected_amount
  const { data: closedPeriod, error: updateErr } = await supabase
    .from('pay_periods')
    .update({
      status: 'closed',
      expected_amount: expectedAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', periodId)
    .select()
    .single();
  if (updateErr) throw updateErr;

  // 6. Create notification
  if (userId) {
    const dateRange = `${formatDate(period.period_start)} - ${formatDate(period.period_end)}`;
    await supabase.from('notifications').insert({
      account_id: accountId,
      user_id: userId,
      type: 'pay_period_closed',
      title: 'Pay Period Closed',
      body: `Period ${dateRange} closed. Expected commission: ${formatCurrency(expectedAmount)}. Verify your payment.`,
      related_id: periodId,
      related_type: 'pay_period',
    });
  }

  return { period: closedPeriod, expectedAmount };
}
