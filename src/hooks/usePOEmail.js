import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { useAuth } from '@/context/AuthContext';

export function useSendPOEmail() {
  const queryClient = useQueryClient();
  const { account, user } = useAuth();
  const accountId = account?.id;

  return useMutation({
    mutationFn: async ({ po, caseData }) => {
      // Support sending to manufacturer (bill sheet flow) or distributor (PO flow)
      const recipient = po.manufacturer || caseData?.manufacturer || po.distributor || caseData?.distributor;
      const facility = po.facility || caseData?.facility;
      const caseInfo = po.case || caseData;

      if (!recipient?.billing_email) {
        throw new Error('No billing email configured');
      }

      const sentTo = [recipient.billing_email];
      const sentCc = recipient.billing_email_cc?.filter(Boolean) || [];

      const subject = `Purchase Order — ${caseInfo?.case_number || 'N/A'} — INV: ${po.invoice_number}`;
      const body = [
        `Purchase Order Details`,
        ``,
        `Case Number: ${caseInfo?.case_number || 'N/A'}`,
        `Invoice Number: ${po.invoice_number}`,
        `PO Number: ${po.po_number || 'N/A'}`,
        `Amount: $${po.amount ? Number(po.amount).toFixed(2) : 'N/A'}`,
        `Facility: ${facility?.name || 'N/A'}`,
        `Invoice Date: ${po.invoice_date || 'N/A'}`,
        po.storage_path ? `\nPO document is attached.` : '',
        ``,
        `Sent by ${user?.full_name || user?.email} via MedRepDesk`,
      ].filter(Boolean).join('\n');

      // Call Edge Function to send via Resend
      const { data: emailResult, error: emailError } = await supabase.functions.invoke(
        'send-po-email',
        {
          body: {
            to: sentTo,
            cc: sentCc,
            subject,
            body,
            po_id: po.id,
            storage_path: po.storage_path || null,
          },
        }
      );

      if (emailError) throw emailError;

      // Log to po_email_logs
      const { error: logError } = await supabase
        .from(TABLES.PO_EMAIL_LOGS)
        .insert({
          account_id: accountId,
          po_id: po.id,
          case_id: po.case_id,
          sent_by: user?.email,
          sent_to: sentTo,
          sent_cc: sentCc.length > 0 ? sentCc : null,
          subject,
          body_snapshot: body,
          resend_email_id: emailResult?.id || null,
          status: 'sent',
        });

      if (logError) throw logError;

      // Set po_email_sent = true on the PO
      const { error: updateError } = await supabase
        .from(TABLES.PURCHASE_ORDERS)
        .update({ po_email_sent: true, updated_at: new Date().toISOString() })
        .eq('id', po.id);

      if (updateError) throw updateError;

      // Case status advancement to 'billed' is handled by DB trigger (advance_case_on_po_emailed)

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['po_email_log'] });
      queryClient.invalidateQueries({ queryKey: ['bill_sheets'] });
    },
  });
}
