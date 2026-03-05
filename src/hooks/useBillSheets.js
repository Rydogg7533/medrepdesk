import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useBillSheets() {
  const { account } = useAuth();
  const accountId = account?.id;

  return useQuery({
    queryKey: ['bill_sheets', accountId],
    queryFn: async () => {
      // Fetch all bill sheet items with case/manufacturer joins
      const { data: items, error: itemsError } = await supabase
        .from('bill_sheet_items')
        .select('*, case:cases(id, case_number, status, scheduled_date, facility_id, distributor_id, surgeon:surgeons(full_name), facility:facilities(id, name, phone, billing_phone), distributor:distributors(id, name, billing_email, billing_email_cc)), manufacturer:manufacturers(id, name, billing_email, billing_contact_phone)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });
      if (itemsError) throw itemsError;

      // Fetch submission chase log entries
      const { data: submissions, error: subError } = await supabase
        .from('po_chase_log')
        .select('case_id, created_at')
        .eq('account_id', accountId)
        .eq('chase_type', 'bill_sheet_submitted')
        .order('created_at', { ascending: false });
      if (subError) throw subError;

      // Build submission date lookup (most recent per case)
      const submissionMap = {};
      for (const s of submissions) {
        if (!submissionMap[s.case_id]) {
          submissionMap[s.case_id] = s.created_at;
        }
      }

      // Fetch POs for active/archived determination and hasPO state
      const { data: pos, error: poError } = await supabase
        .from('purchase_orders')
        .select('id, case_id, status, po_number, amount, received_date, po_email_sent')
        .eq('account_id', accountId);
      if (poError) throw poError;

      // Archived = PO received AND sent to manufacturer (po_email_sent = true)
      // hasPO = PO exists with received/processing/paid but NOT yet sent
      const archivedCaseIds = new Set();
      const hasPOCaseIds = new Set();
      const casePoMap = {};
      for (const po of pos) {
        if (['received', 'processing', 'paid'].includes(po.status)) {
          if (po.po_email_sent) {
            archivedCaseIds.add(po.case_id);
          }
          hasPOCaseIds.add(po.case_id);
          if (!casePoMap[po.case_id]) {
            casePoMap[po.case_id] = po;
          }
        }
      }

      // Group items by case_id
      const caseMap = {};
      for (const item of items) {
        const cid = item.case_id;
        if (!caseMap[cid]) {
          caseMap[cid] = {
            caseId: cid,
            caseNumber: item.case?.case_number,
            surgeon: item.case?.surgeon?.full_name,
            facility: item.case?.facility?.name,
            facilityId: item.case?.facility_id,
            facilityPhone: item.case?.facility?.billing_phone || item.case?.facility?.phone,
            facilityEmail: item.case?.distributor?.billing_email,
            distributorId: item.case?.distributor_id,
            distributor: item.case?.distributor,
            manufacturer: item.manufacturer,
            scheduledDate: item.case?.scheduled_date,
            submittedAt: submissionMap[cid] || item.created_at,
            items: [],
            totalValue: 0,
            totalCommission: 0,
            hasPO: hasPOCaseIds.has(cid),
            po: casePoMap[cid] || null,
            poSentToMfr: archivedCaseIds.has(cid),
            isArchived: archivedCaseIds.has(cid),
          };
        }
        const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
        const commAmount = lineTotal * ((item.commission_rate || 0) / 100);
        caseMap[cid].items.push(item);
        caseMap[cid].totalValue += lineTotal;
        caseMap[cid].totalCommission += commAmount;
      }

      // Convert to array sorted by most recently submitted
      return Object.values(caseMap).sort(
        (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
      );
    },
    enabled: !!accountId,
  });
}
