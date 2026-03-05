import { TABLES } from '@/lib/tables';
import { generateCaseNumber } from '@/utils/caseNumber';

export async function executeVoiceAction(parsedResult, accountId, userId, supabase) {
  const { intent, fields } = parsedResult;

  switch (intent) {
    case 'schedule_case':
      return scheduleCase(fields, accountId, supabase);
    case 'log_chase':
      return logChase(fields, accountId, userId, supabase);
    case 'log_commission':
      return logCommission(fields, accountId, supabase);
    case 'log_communication':
      return logCommunication(fields, accountId, userId, supabase);
    case 'add_contact':
      return { redirect: 'conversational', scriptType: 'add_contact' };
    case 'add_surgeon':
      return { redirect: 'conversational', scriptType: 'add_surgeon' };
    case 'add_facility':
      return { redirect: 'conversational', scriptType: 'add_facility' };
    default:
      return { success: false, recordId: null, message: `Unsupported intent: ${intent}` };
  }
}

async function scheduleCase(fields, accountId, supabase) {
  const caseNumber = await generateCaseNumber(supabase, accountId);

  let scheduled_time = null;
  if (fields.scheduled_time) {
    scheduled_time = fields.scheduled_time.length === 5
      ? `${fields.scheduled_time}:00`
      : fields.scheduled_time;
  }

  const { data: account } = await supabase
    .from(TABLES.ACCOUNTS)
    .select('primary_distributor_id')
    .eq('id', accountId)
    .single();

  const payload = {
    account_id: accountId,
    case_number: caseNumber,
    surgeon_id: fields.surgeon_id || null,
    facility_id: fields.facility_id || null,
    distributor_id: fields.distributor_id || account?.primary_distributor_id || null,
    procedure_type: fields.procedure_type || null,
    scheduled_date: fields.scheduled_date || null,
    scheduled_time,
    case_value: fields.case_value || null,
    notes: fields.notes || null,
    status: 'scheduled',
  };

  const { data, error } = await supabase
    .from(TABLES.CASES)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return { success: true, recordId: data.id, message: `Case ${caseNumber} created` };
}

async function logChase(fields, accountId, userId, supabase) {
  const payload = {
    account_id: accountId,
    created_by: userId,
    case_id: fields.case_id || null,
    facility_id: fields.facility_id || null,
    chase_type: fields.chase_type || 'follow_up_call',
    action_taken: fields.action_taken || 'call',
    outcome: fields.outcome || null,
    promised_date: fields.promised_date || null,
    next_follow_up: fields.next_follow_up || null,
  };

  const { data, error } = await supabase
    .from(TABLES.PO_CHASE_LOG)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return { success: true, recordId: data.id, message: 'Chase entry logged' };
}

async function logCommission(fields, accountId, supabase) {
  const today = new Date().toISOString().split('T')[0];
  let payPeriodId = null;

  const { data: openPeriod } = await supabase
    .from(TABLES.PAY_PERIODS)
    .select('id')
    .eq('account_id', accountId)
    .eq('status', 'open')
    .lte('period_start', today)
    .gte('period_end', today)
    .maybeSingle();

  if (openPeriod) payPeriodId = openPeriod.id;

  const payload = {
    account_id: accountId,
    case_id: fields.case_id || null,
    distributor_id: fields.distributor_id || null,
    amount: fields.amount || null,
    status: fields.status || 'received',
    notes: fields.notes || null,
    pay_period_id: payPeriodId,
  };

  const { data, error } = await supabase
    .from(TABLES.COMMISSIONS)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return { success: true, recordId: data.id, message: 'Commission logged' };
}

async function logCommunication(fields, accountId, userId, supabase) {
  const payload = {
    account_id: accountId,
    created_by: userId,
    case_id: fields.case_id || null,
    comm_type: fields.comm_type || 'note',
    direction: fields.direction || 'outbound',
    contact_id: fields.contact_id || null,
    contact_name: fields.contact_name || null,
    contact_role: fields.contact_role || null,
    subject: fields.subject || null,
    notes: fields.notes || null,
    follow_up_date: fields.follow_up_date || null,
  };

  const { data, error } = await supabase
    .from(TABLES.COMMUNICATIONS)
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return { success: true, recordId: data.id, message: 'Communication logged' };
}
