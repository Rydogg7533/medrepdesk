import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Send } from 'lucide-react';
import { usePO, useUpdatePO, useDeletePO } from '@/hooks/usePOs';
import { useChaseLog, useCreateChaseEntry } from '@/hooks/useChaseLog';
import { useSendPOEmail } from '@/hooks/usePOEmail';
import { usePoEmailLog } from '@/hooks/usePoEmailLog';
import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BottomSheet from '@/components/ui/BottomSheet';
import Skeleton from '@/components/ui/Skeleton';
import ChaseTimeline from '@/components/features/ChaseTimeline';
import ChaseBottomSheet from '@/components/features/ChaseBottomSheet';
import InfoTooltip from '@/components/ui/InfoTooltip';
import POSentConfirmation from '@/components/features/POSentConfirmation';
import { formatDate, formatCurrency } from '@/utils/formatters';

export default function PODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: po, isLoading } = usePO(id);
  const { data: chaseEntries = [] } = useChaseLog(po?.case_id);
  const updatePO = useUpdatePO();
  const deletePO = useDeletePO();
  const createChase = useCreateChaseEntry();
  const sendPOEmail = useSendPOEmail();
  const { data: emailLog } = usePoEmailLog(id);
  const [showDelete, setShowDelete] = useState(false);
  const [showSendToDistributor, setShowSendToDistributor] = useState(false);
  const [showChase, setShowChase] = useState(false);
  const [showReceived, setShowReceived] = useState(false);
  const [receivedDate, setReceivedDate] = useState('');

  async function handleDelete() {
    await deletePO.mutateAsync(id);
    navigate('/money', { replace: true });
  }

  async function handleFirstChaseComplete() {
    await updatePO.mutateAsync({ id, status: 'requested' });
  }

  async function handleMarkReceived() {
    await updatePO.mutateAsync({
      id,
      status: 'received',
      received_date: receivedDate || new Date().toISOString().split('T')[0],
    });
    await createChase.mutateAsync({
      case_id: po.case_id,
      po_id: po.id,
      chase_type: 'po_received',
      facility_id: po.facility_id,
    });
    setShowReceived(false);
    // Prompt to send PO to distributor
    const distributor = po.distributor || po.case?.distributor;
    if (distributor?.billing_email) {
      setShowSendToDistributor(true);
    }
  }

  async function handleSendToDistributor() {
    await sendPOEmail.mutateAsync({ po, caseData: po.case });
    setShowSendToDistributor(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (!po) {
    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">PO not found</div>;
  }

  const poChaseEntries = chaseEntries.filter((e) => e.po_id === po.id || !e.po_id);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Purchase Order</p>
        </div>
        <button
          onClick={() => navigate(`/po/${id}/edit`)}
          className="min-h-touch p-2 text-gray-500 dark:text-gray-400"
        >
          <Edit2 className="h-5 w-5" />
        </button>
      </div>

      {/* Info */}
      <Card className="mb-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500">Case</span>
            {po.case_id ? (
              <button
                className="font-medium text-brand-800 dark:text-brand-400"
                onClick={() => navigate(`/cases/${po.case_id}`)}
              >
                {po.case?.case_number || '—'}
              </button>
            ) : (
              <span className="font-medium text-gray-700 dark:text-gray-300">—</span>
            )}
          </div>
          <InfoRow label="Facility" value={po.case?.facility?.name || po.facility?.name} />
          <InfoRow label="Distributor" value={po.case?.distributor?.name || po.distributor?.name} />
          <InfoRow label="PO Number" value={po.po_number} />
          <InfoRow label="Amount" value={formatCurrency(po.amount)} />
          <InfoRow label="Date of Surgery" value={formatDate(po.case?.scheduled_date)} />
          {po.received_date && <InfoRow label="PO Received Date" value={formatDate(po.received_date)} />}
        </div>
      </Card>

      {/* Sent to Manufacturer confirmation */}
      {po.po_email_sent && emailLog ? (
        <POSentConfirmation
          emailLog={emailLog}
          contactName={
            (po.manufacturer || po.case?.manufacturer)?.billing_contact_name ||
            (po.distributor || po.case?.distributor)?.billing_contact_name
          }
          poNumber={po.po_number}
        />
      ) : (
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Not yet sent to manufacturer</p>
            {['received', 'processing'].includes(po.status) && (
              <button
                onClick={() => setShowSendToDistributor(true)}
                className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-400"
              >
                <Send className="h-3.5 w-3.5" /> Send Now
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Chase Timeline */}
      <Card className="mb-4">
        <h3 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Chase Timeline<InfoTooltip text="The chase log tracks every follow-up attempt for a purchase order. Log calls, emails, and texts to build a complete timeline." /></h3>
        <ChaseTimeline entries={poChaseEntries} />
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        {!po.po_number && ['not_requested', 'requested', 'pending'].includes(po.status) && (
          <Button fullWidth onClick={() => setShowChase(true)}>
            Chase PO
          </Button>
        )}
        {po.status !== 'received' && (
          <Button fullWidth variant="secondary" onClick={() => setShowReceived(true)}>
            Mark Received
          </Button>
        )}
        {po.status === 'received' && !po.po_email_sent && (
          <Button fullWidth onClick={() => setShowSendToDistributor(true)}>
            <Send className="h-4 w-4" /> Send to Manufacturer
          </Button>
        )}

        {user?.role === 'owner' && (
          <Button
            variant="outline"
            fullWidth
            className="mt-4 text-red-500"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete PO
          </Button>
        )}
      </div>

      {/* Chase PO Bottom Sheet */}
      <ChaseBottomSheet
        isOpen={showChase}
        onClose={() => setShowChase(false)}
        caseId={po.case_id}
        caseNumber={po.case?.case_number}
        facilityName={po.case?.facility?.name || po.facility?.name}
        facilityPhone={po.facility?.billing_phone || po.facility?.phone || po.case?.facility?.billing_phone || po.case?.facility?.phone}
        facilityEmail={po.case?.distributor?.billing_email || po.distributor?.billing_email}
        facilityId={po.facility_id}
        poId={po.id}
        chaseTypeOverride={po.status === 'not_requested' ? 'po_requested' : undefined}
        onAfterSave={po.status === 'not_requested' ? handleFirstChaseComplete : undefined}
      />

      {/* Mark Received Sheet */}
      <BottomSheet isOpen={showReceived} onClose={() => setShowReceived(false)} title="Mark PO Received">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Received Date</label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            />
          </div>
          <Button fullWidth loading={updatePO.isPending} onClick={handleMarkReceived}>
            Confirm Received
          </Button>
        </div>
      </BottomSheet>

      {/* Send to Manufacturer Sheet */}
      <BottomSheet isOpen={showSendToDistributor} onClose={() => setShowSendToDistributor(false)} title="Send PO to Distributor">
        <div className="flex flex-col gap-3">
          {(() => {
            const distributor = po.distributor || po.case?.distributor;
            const billingEmail = distributor?.billing_email;
            const ccEmails = distributor?.billing_email_cc?.filter(Boolean) || [];
            return billingEmail ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Send PO details to <span className="font-medium text-gray-900 dark:text-gray-100">{distributor?.name}</span>?
                </p>
                <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
                  <p className="text-xs text-gray-500 dark:text-gray-400">To</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{billingEmail}</p>
                  {ccEmails.length > 0 && (
                    <>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">CC</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{ccEmails.join(', ')}</p>
                    </>
                  )}
                </div>
                {sendPOEmail.isError && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-600 dark:text-red-400">
                    {sendPOEmail.error?.message || 'Failed to send email'}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="secondary" fullWidth onClick={() => setShowSendToDistributor(false)}>
                    Skip
                  </Button>
                  <Button fullWidth loading={sendPOEmail.isPending} onClick={handleSendToDistributor}>
                    <Send className="h-4 w-4" /> Send
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No billing email configured for this distributor. Add one in the distributor's settings to send PO details.
                </p>
                <Button fullWidth onClick={() => setShowSendToDistributor(false)}>
                  Close
                </Button>
              </>
            );
          })()}
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete PO"
        message={`Permanently delete this purchase order${po.po_number ? ` (PO #${po.po_number})` : ''}? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400 dark:text-gray-500">{label}</span>
      <span className="font-medium text-gray-700 dark:text-gray-300">{value || '—'}</span>
    </div>
  );
}
