import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Send } from 'lucide-react';
import { useBillSheetItems } from '@/hooks/useBillSheetItems';
import { useChaseLog, useCreateChaseEntry } from '@/hooks/useChaseLog';
import { useCasePOs, useCreatePO } from '@/hooks/usePOs';
import { useSendPOEmail } from '@/hooks/usePOEmail';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import BottomSheet from '@/components/ui/BottomSheet';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function BillSheetDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { account } = useAuth();
  const { data: items = [], isLoading: itemsLoading } = useBillSheetItems(caseId);
  const { data: chaseEntries = [] } = useChaseLog(caseId);
  const { data: casePOs = [], isLoading: posLoading } = useCasePOs(caseId);
  const createPO = useCreatePO();
  const createChase = useCreateChaseEntry();
  const sendPOEmail = useSendPOEmail();

  const [showRecordPO, setShowRecordPO] = useState(false);
  const [showSendPrompt, setShowSendPrompt] = useState(false);
  const [createdPO, setCreatedPO] = useState(null);
  const [poForm, setPOForm] = useState({
    po_number: '',
    amount: '',
    received_date: new Date().toISOString().split('T')[0],
  });

  const submissionEntry = chaseEntries.find((e) => e.chase_type === 'bill_sheet_submitted');
  const receivedPO = casePOs.find((po) => ['received', 'processing', 'paid'].includes(po.status));
  const hasPO = !!receivedPO;

  // Auto-open Record PO sheet when navigated with ?record=1
  useEffect(() => {
    if (searchParams.get('record') === '1' && !posLoading && !hasPO) {
      setShowRecordPO(true);
    }
  }, [searchParams, posLoading, hasPO]);

  const caseInfo = items[0]?.case;

  const totalValue = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
  const totalCommission = items.reduce((sum, item) => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    return sum + lineTotal * ((item.commission_rate || 0) / 100);
  }, 0);

  async function handleRecordPO(e) {
    e.preventDefault();
    if (!poForm.po_number.trim() || !poForm.amount) return;

    try {
      const po = await createPO.mutateAsync({
        case_id: caseId,
        po_number: poForm.po_number.trim(),
        amount: Number(poForm.amount),
        received_date: poForm.received_date || new Date().toISOString().split('T')[0],
        status: 'received',
        facility_id: caseInfo?.facility_id || null,
        distributor_id: caseInfo?.distributor_id || null,
      });

      // Log chase entry for PO received
      await createChase.mutateAsync({
        case_id: caseId,
        po_id: po.id,
        chase_type: 'po_received',
        facility_id: caseInfo?.facility_id || null,
      });

      setCreatedPO(po);
      setShowRecordPO(false);

      // Check if manufacturer has billing email for send prompt
      const mfr = items[0]?.manufacturer;
      if (mfr?.billing_email) {
        setShowSendPrompt(true);
      } else {
        toast({ message: 'PO recorded successfully', type: 'success' });
      }
    } catch (err) {
      toast({ message: err.message || 'Failed to record PO', type: 'error' });
    }
  }

  async function handleSendToManufacturer() {
    if (!createdPO) return;
    try {
      const mfr = items[0]?.manufacturer;
      await sendPOEmail.mutateAsync({
        po: {
          ...createdPO,
          facility: caseInfo?.facility,
          manufacturer: mfr,
        },
        caseData: caseInfo,
      });
      setShowSendPrompt(false);
      toast({ message: 'PO sent to manufacturer', type: 'success' });
    } catch (err) {
      toast({ message: err.message || 'Failed to send email', type: 'error' });
    }
  }

  function handleSkipSend() {
    setShowSendPrompt(false);
    toast({ message: 'PO recorded successfully', type: 'success' });
  }

  if (itemsLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Bill sheet not found</div>;
  }

  const manufacturer = items[0]?.manufacturer;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Bill Sheet</p>
      </div>

      {/* Case Info */}
      <Card className="mb-4">
        <div className="space-y-3">
          <InfoRow label="Case" value={caseInfo?.case_number} />
          <InfoRow label="Surgeon" value={caseInfo?.surgeon?.full_name} />
          <InfoRow label="Facility" value={caseInfo?.facility?.name} />
          <InfoRow label="Surgery Date" value={formatDate(caseInfo?.scheduled_date)} />
          <InfoRow label="Submitted" value={submissionEntry ? formatDate(submissionEntry.created_at) : '—'} />
        </div>
      </Card>

      {/* Status */}
      <Card className="mb-4">
        {hasPO ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                PO Received
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(receivedPO.received_date)}
              </span>
            </div>
            <button
              onClick={() => navigate(`/po/${receivedPO.id}`)}
              className="flex items-center gap-1 text-sm font-medium text-brand-800 dark:text-brand-400"
            >
              {receivedPO.po_number ? `PO #${receivedPO.po_number}` : 'View PO'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              Awaiting PO
            </span>
          </div>
        )}
      </Card>

      {/* Line Items */}
      <h2 className="mb-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
        Line Items ({items.length})
      </h2>
      <div className="mb-4 space-y-2">
        {items.map((item) => {
          const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
          const commAmount = lineTotal * ((item.commission_rate || 0) / 100);
          return (
            <Card key={item.id}>
              <div className="space-y-1">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {item.product_type || 'Product'}
                    </p>
                    {item.manufacturer?.name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.manufacturer.name}</p>
                    )}
                    {item.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">{item.description}</p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(lineTotal)}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </span>
                  <span>
                    {item.commission_rate}% comm → {formatCurrency(commAmount)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Totals */}
      <Card className="mb-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500">Total Case Value</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{formatCurrency(totalValue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400 dark:text-gray-500">Total Commission</span>
            <span className="font-bold text-green-600">{formatCurrency(totalCommission)}</span>
          </div>
        </div>
      </Card>

      {/* Actions */}
      {!hasPO && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate(`/cases/${caseId}`)}>
            Chase PO
          </Button>
          <Button className="flex-1" onClick={() => setShowRecordPO(true)}>
            Record PO Received
          </Button>
        </div>
      )}

      {/* Record PO Bottom Sheet */}
      <BottomSheet isOpen={showRecordPO} onClose={() => setShowRecordPO(false)} title="Record PO Received">
        <form onSubmit={handleRecordPO} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">PO Number</label>
            <input
              type="text"
              required
              value={poForm.po_number}
              onChange={(e) => setPOForm((p) => ({ ...p, po_number: e.target.value }))}
              placeholder="Enter PO number"
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
            <input
              type="number"
              step="0.01"
              required
              value={poForm.amount}
              onChange={(e) => setPOForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="0.00"
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Received Date</label>
            <input
              type="date"
              value={poForm.received_date}
              onChange={(e) => setPOForm((p) => ({ ...p, received_date: e.target.value }))}
              max={new Date().toISOString().split('T')[0]}
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <Button type="submit" fullWidth loading={createPO.isPending || createChase.isPending}>
            Save PO
          </Button>
        </form>
      </BottomSheet>

      {/* Send to Manufacturer Prompt */}
      <BottomSheet isOpen={showSendPrompt} onClose={handleSkipSend} title="Send PO to Manufacturer?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send PO details to <span className="font-medium text-gray-900 dark:text-gray-100">{manufacturer?.name}</span>?
          </p>
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">To</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{manufacturer?.billing_email}</p>
            {manufacturer?.billing_email_cc?.filter(Boolean).length > 0 && (
              <>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">CC</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{manufacturer.billing_email_cc.filter(Boolean).join(', ')}</p>
              </>
            )}
          </div>
          {sendPOEmail.isError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-600 dark:text-red-400">
              {sendPOEmail.error?.message || 'Failed to send email'}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={handleSkipSend}>
              Skip
            </Button>
            <Button fullWidth loading={sendPOEmail.isPending} onClick={handleSendToManufacturer}>
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </div>
      </BottomSheet>
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
