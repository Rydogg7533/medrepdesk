// Voice Agent Tool Execution
// Handles OpenAI Realtime function calls by executing Supabase queries/mutations
import { TABLES } from '@/lib/tables';
import { generateCaseNumber } from '@/utils/caseNumber';

export async function executeToolCall(name, args, { supabase, accountId, userId }) {
  switch (name) {
    case 'get_context':
      return getContext(args, { supabase, accountId });
    case 'schedule_case':
      return scheduleCase(args, { supabase, accountId });
    case 'mark_case_complete':
      return markCaseComplete(args, { supabase, accountId });
    case 'log_chase':
      return logChase(args, { supabase, accountId, userId });
    case 'log_po_received':
      return logPoReceived(args, { supabase, accountId });
    case 'log_commission_received':
      return logCommissionReceived(args, { supabase, accountId });
    case 'log_communication':
      return logCommunication(args, { supabase, accountId, userId });
    case 'add_contact':
      return addContact(args, { supabase, accountId });
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Returns which React Query keys to invalidate after a write
export function getInvalidationKeys(toolName) {
  switch (toolName) {
    case 'schedule_case':
      return [['cases'], ['dashboard']];
    case 'mark_case_complete':
      return [['cases'], ['commissions'], ['dashboard']];
    case 'log_chase':
      return [['chase-log'], ['cases'], ['dashboard']];
    case 'log_po_received':
      return [['purchase-orders'], ['cases'], ['dashboard']];
    case 'log_commission_received':
      return [['commissions'], ['dashboard']];
    case 'log_communication':
      return [['communications'], ['dashboard']];
    case 'add_contact':
      return [['contacts']];
    default:
      return [];
  }
}

async function getContext({ data_type, filters = {} }, { supabase, accountId }) {
  const limit = filters.limit || 20;

  switch (data_type) {
    case 'cases': {
      let q = supabase
        .from(TABLES.CASES)
        .select('id, case_number, status, procedure_type, scheduled_date, scheduled_time, case_value, notes, surgeon:surgeons(full_name), facility:facilities(name), distributor:distributors(name)')
        .eq('account_id', accountId)
        .order('scheduled_date', { ascending: false })
        .limit(limit);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.case_id) q = q.eq('id', filters.case_id);
      if (filters.case_number_search) q = q.ilike('case_number', `%${filters.case_number_search}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { cases: data };
    }
    case 'purchase_orders': {
      let q = supabase
        .from(TABLES.PURCHASE_ORDERS)
        .select('id, po_number, amount, status, received_date, case_id, case:cases(case_number)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.case_id) q = q.eq('case_id', filters.case_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { purchase_orders: data };
    }
    case 'commissions': {
      let q = supabase
        .from(TABLES.COMMISSIONS)
        .select('id, amount, status, received_amount, received_date, notes, case_id, case:cases(case_number), distributor:distributors(name)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.case_id) q = q.eq('case_id', filters.case_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { commissions: data };
    }
    case 'contacts': {
      const { data, error } = await supabase
        .from(TABLES.CONTACTS)
        .select('id, full_name, role, phone, email, facility:facilities(name)')
        .eq('account_id', accountId)
        .order('full_name')
        .limit(limit);
      if (error) return { error: error.message };
      return { contacts: data };
    }
    case 'surgeons': {
      const { data, error } = await supabase
        .from(TABLES.SURGEONS)
        .select('id, full_name, specialty, phone, primary_facility:facilities(name)')
        .eq('account_id', accountId)
        .order('full_name')
        .limit(limit);
      if (error) return { error: error.message };
      return { surgeons: data };
    }
    case 'facilities': {
      const { data, error } = await supabase
        .from(TABLES.FACILITIES)
        .select('id, name, facility_type, city, state, address, phone')
        .eq('account_id', accountId)
        .order('name')
        .limit(limit);
      if (error) return { error: error.message };
      return { facilities: data };
    }
    case 'distributors': {
      const { data, error } = await supabase
        .from(TABLES.DISTRIBUTORS)
        .select('id, name')
        .eq('account_id', accountId)
        .order('name')
        .limit(limit);
      if (error) return { error: error.message };
      return { distributors: data };
    }
    case 'chase_log': {
      let q = supabase
        .from(TABLES.PO_CHASE_LOG)
        .select('id, chase_type, action_taken, outcome, promised_date, next_follow_up, notes, created_at, case:cases(case_number)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (filters.case_id) q = q.eq('case_id', filters.case_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { chase_log: data };
    }
    default:
      return { error: `Unknown data type: ${data_type}` };
  }
}

async function scheduleCase(args, { supabase, accountId }) {
  const caseNumber = await generateCaseNumber(supabase, accountId);

  let scheduled_time = null;
  if (args.scheduled_time) {
    scheduled_time = args.scheduled_time.length === 5
      ? `${args.scheduled_time}:00`
      : args.scheduled_time;
  }

  const { data: account } = await supabase
    .from(TABLES.ACCOUNTS)
    .select('primary_distributor_id')
    .eq('id', accountId)
    .single();

  const { data, error } = await supabase
    .from(TABLES.CASES)
    .insert({
      account_id: accountId,
      case_number: caseNumber,
      surgeon_id: args.surgeon_id || null,
      facility_id: args.facility_id || null,
      distributor_id: args.distributor_id || account?.primary_distributor_id || null,
      procedure_type: args.procedure_type || null,
      scheduled_date: args.scheduled_date || null,
      scheduled_time,
      case_value: args.case_value || null,
      notes: args.notes || null,
      status: 'scheduled',
    })
    .select('id, case_number')
    .single();

  if (error) return { error: error.message };
  return { success: true, case_number: data.case_number, case_id: data.id };
}

async function markCaseComplete({ case_id }, { supabase, accountId }) {
  const { data, error } = await supabase
    .from(TABLES.CASES)
    .update({ status: 'completed' })
    .eq('id', case_id)
    .eq('account_id', accountId)
    .select('id, case_number')
    .single();

  if (error) return { error: error.message };

  // Auto-create pending commission
  const { data: caseData } = await supabase
    .from(TABLES.CASES)
    .select('case_value, distributor_id')
    .eq('id', case_id)
    .single();

  if (caseData) {
    await supabase.from(TABLES.COMMISSIONS).insert({
      account_id: accountId,
      case_id,
      distributor_id: caseData.distributor_id || null,
      amount: caseData.case_value || null,
      status: 'pending',
    });
  }

  return { success: true, case_number: data.case_number };
}

async function logChase(args, { supabase, accountId, userId }) {
  const { data, error } = await supabase
    .from(TABLES.PO_CHASE_LOG)
    .insert({
      account_id: accountId,
      created_by: userId,
      case_id: args.case_id || null,
      chase_type: args.chase_type || 'follow_up_call',
      action_taken: args.action_taken || 'call',
      contact_name: args.contact_name || null,
      contact_role: args.contact_role || null,
      outcome: args.outcome || null,
      promised_date: args.promised_date || null,
      next_follow_up: args.next_follow_up || null,
      notes: args.notes || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { success: true, chase_id: data.id };
}

async function logPoReceived(args, { supabase, accountId }) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from(TABLES.PURCHASE_ORDERS)
    .insert({
      account_id: accountId,
      case_id: args.case_id || null,
      amount: args.amount,
      po_number: args.po_number || null,
      status: 'received',
      received_date: args.received_date || today,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { success: true, po_id: data.id };
}

async function logCommissionReceived(args, { supabase, accountId }) {
  const today = new Date().toISOString().split('T')[0];

  // Find the pending commission for this case
  const { data: commission } = await supabase
    .from(TABLES.COMMISSIONS)
    .select('id')
    .eq('account_id', accountId)
    .eq('case_id', args.case_id)
    .eq('status', 'pending')
    .maybeSingle();

  if (commission) {
    const { error } = await supabase
      .from(TABLES.COMMISSIONS)
      .update({
        status: 'received',
        received_amount: args.received_amount,
        received_date: args.received_date || today,
        notes: args.notes || null,
      })
      .eq('id', commission.id);
    if (error) return { error: error.message };
    return { success: true, commission_id: commission.id };
  }

  // No pending commission found — create one as received
  const { data, error } = await supabase
    .from(TABLES.COMMISSIONS)
    .insert({
      account_id: accountId,
      case_id: args.case_id,
      received_amount: args.received_amount,
      received_date: args.received_date || today,
      status: 'received',
      notes: args.notes || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { success: true, commission_id: data.id };
}

async function logCommunication(args, { supabase, accountId, userId }) {
  const { data, error } = await supabase
    .from(TABLES.COMMUNICATIONS)
    .insert({
      account_id: accountId,
      created_by: userId,
      case_id: args.case_id || null,
      comm_type: args.comm_type || 'note',
      direction: args.direction || 'outbound',
      contact_name: args.contact_name || null,
      contact_role: args.contact_role || null,
      subject: args.subject || null,
      notes: args.notes || null,
      follow_up_date: args.follow_up_date || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { success: true, communication_id: data.id };
}

async function addContact(args, { supabase, accountId }) {
  const { data, error } = await supabase
    .from(TABLES.CONTACTS)
    .insert({
      account_id: accountId,
      full_name: args.full_name,
      role: args.role || null,
      facility_id: args.facility_id || null,
      phone: args.phone || null,
      email: args.email || null,
      notes: args.notes || null,
    })
    .select('id, full_name')
    .single();

  if (error) return { error: error.message };
  return { success: true, contact_id: data.id, name: data.full_name };
}
