import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Phone, Mail, MessageSquare } from 'lucide-react';
import DOMPurify from 'dompurify';
import { usePO, useUpdatePO, useDeletePO } from '@/hooks/usePOs';
import { useChaseLog, useCreateChaseEntry } from '@/hooks/useChaseLog';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/context/AuthContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import BottomSheet from '@/components/ui/BottomSheet';
import Skeleton from '@/components/ui/Skeleton';
import ChaseTimeline from '@/components/features/ChaseTimeline';
import { formatDate, formatCurrency } from '@/utils/formatters';

export default function PODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: po, isLoading } = usePO(id);
  const { data: chaseEntries = [] } = useChaseLog(po?.case_id);
  const { data: contacts = [] } = useContacts();
  const updatePO = useUpdatePO();
  const deletePO = useDeletePO();
  const createChase = useCreateChaseEntry();
  const [showDelete, setShowDelete] = useState(false);
  const [showChaseForm, setShowChaseForm] = useState(false);
  const [showReceived, setShowReceived] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [receivedDate, setReceivedDate] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [paidAmount, setPaidAmount] = useState('');

  const [chaseForm, setChaseForm] = useState({
    chase_type: 'follow_up_call',
    contact_name: '',
    contact_role: '',
    contact_phone: '',
    contact_email: '',
    outcome: '',
    promised_date: '',
    next_follow_up: '',
    action_taken: 'call',
  });

  async function handleDelete() {
    await deletePO.mutateAsync(id);
    navigate('/money', { replace: true });
  }

  async function handleStartChasing() {
    await createChase.mutateAsync({
      case_id: po.case_id,
      po_id: po.id,
      chase_type: 'po_requested',
      facility_id: po.facility_id,
    });
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
  }

  async function handleMarkPaid() {
    await updatePO.mutateAsync({
      id,
      status: 'paid',
      paid_date: paidDate || new Date().toISOString().split('T')[0],
      ...(paidAmount && { amount: Number(paidAmount) }),
    });
    setShowPaid(false);
  }

  async function handleSubmitChase(e) {
    e.preventDefault();
    await createChase.mutateAsync({
      case_id: po.case_id,
      po_id: po.id,
      facility_id: po.facility_id,
      chase_type: chaseForm.chase_type,
      contact_name: chaseForm.contact_name || null,
      contact_role: chaseForm.contact_role || null,
      contact_phone: chaseForm.contact_phone || null,
      contact_email: chaseForm.contact_email || null,
      outcome: chaseForm.outcome ? DOMPurify.sanitize(chaseForm.outcome) : null,
      promised_date: chaseForm.promised_date || null,
      next_follow_up: chaseForm.next_follow_up || null,
      action_taken: chaseForm.action_taken || null,
    });
    setShowChaseForm(false);
    setChaseForm({
      chase_type: 'follow_up_call',
      contact_name: '',
      contact_role: '',
      contact_phone: '',
      contact_email: '',
      outcome: '',
      promised_date: '',
      next_follow_up: '',
      action_taken: 'call',
    });
  }

  async function handleQuickAction(actionType) {
    let phone = po?.facility?.billing_contact_phone || po?.facility?.phone;
    let email = po?.facility?.billing_email;

    if (actionType === 'call' && phone) {
      window.location.href = `tel:${phone}`;
    } else if (actionType === 'email' && email) {
      window.location.href = `mailto:${email}`;
    } else if (actionType === 'text' && phone) {
      window.location.href = `sms:${phone}`;
    }

    await createChase.mutateAsync({
      case_id: po.case_id,
      po_id: po.id,
      facility_id: po.facility_id,
      chase_type: actionType === 'call' ? 'follow_up_call' : actionType === 'email' ? 'follow_up_email' : 'follow_up_text',
      action_taken: actionType,
    });
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
    return <div className="p-4 text-center text-gray-500">PO not found</div>;
  }

  const poChaseEntries = chaseEntries.filter((e) => e.po_id === po.id || !e.po_id);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400">Invoice #{po.invoice_number}</p>
          <StatusBadge status={po.status} type="po" />
        </div>
        <button
          onClick={() => navigate(`/po/${id}/edit`)}
          className="min-h-touch p-2 text-gray-500"
        >
          <Edit2 className="h-5 w-5" />
        </button>
      </div>

      {/* Info */}
      <Card className="mb-4">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Case</span>
            <button
              className="font-medium text-brand-800"
              onClick={() => navigate(`/cases/${po.case_id}`)}
            >
              {po.case?.case_number || '—'}
            </button>
          </div>
          <InfoRow label="Facility" value={po.facility?.name} />
          <InfoRow label="Distributor" value={po.distributor?.name} />
          <InfoRow label="PO Number" value={po.po_number} />
          <InfoRow label="Amount" value={formatCurrency(po.amount)} />
          <InfoRow label="Invoice Date" value={formatDate(po.invoice_date)} />
          <InfoRow label="Issue Date" value={formatDate(po.issue_date)} />
          <InfoRow label="Expected Payment" value={formatDate(po.expected_payment_date)} />
          <InfoRow label="Received" value={formatDate(po.received_date)} />
          <InfoRow label="Paid" value={formatDate(po.paid_date)} />
        </div>
      </Card>

      {/* Quick Actions */}
      {po.status !== 'paid' && (
        <Card className="mb-4">
          <h3 className="mb-3 text-xs font-semibold uppercase text-gray-400">Quick Actions</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleQuickAction('call')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-50 py-3 text-sm font-medium text-green-700"
            >
              <Phone className="h-4 w-4" /> Call
            </button>
            <button
              onClick={() => handleQuickAction('email')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-50 py-3 text-sm font-medium text-blue-700"
            >
              <Mail className="h-4 w-4" /> Email
            </button>
            <button
              onClick={() => handleQuickAction('text')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-50 py-3 text-sm font-medium text-purple-700"
            >
              <MessageSquare className="h-4 w-4" /> Text
            </button>
          </div>
        </Card>
      )}

      {/* Chase Timeline */}
      <Card className="mb-4">
        <h3 className="mb-3 text-xs font-semibold uppercase text-gray-400">Chase Timeline</h3>
        <ChaseTimeline entries={poChaseEntries} />
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        {po.status === 'not_requested' && (
          <Button fullWidth loading={createChase.isPending || updatePO.isPending} onClick={handleStartChasing}>
            Start Chasing
          </Button>
        )}
        {['requested', 'pending'].includes(po.status) && (
          <Button fullWidth onClick={() => setShowChaseForm(true)}>
            Log Follow-Up
          </Button>
        )}
        {po.status !== 'paid' && po.status !== 'received' && (
          <Button fullWidth variant="secondary" onClick={() => setShowReceived(true)}>
            Mark Received
          </Button>
        )}
        {po.status === 'received' && (
          <Button fullWidth onClick={() => setShowPaid(true)}>
            Mark Paid
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

      {/* Chase Entry Bottom Sheet */}
      <BottomSheet isOpen={showChaseForm} onClose={() => setShowChaseForm(false)} title="Log Follow-Up">
        <form onSubmit={handleSubmitChase} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Chase Type</label>
            <select
              value={chaseForm.chase_type}
              onChange={(e) => setChaseForm((p) => ({ ...p, chase_type: e.target.value }))}
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            >
              <option value="follow_up_call">Follow-Up Call</option>
              <option value="follow_up_email">Follow-Up Email</option>
              <option value="follow_up_text">Follow-Up Text</option>
              <option value="escalation">Escalation</option>
              <option value="note">Note</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contact</label>
            <select
              value={chaseForm.contact_name}
              onChange={(e) => {
                const contact = contacts.find((c) => c.full_name === e.target.value);
                setChaseForm((p) => ({
                  ...p,
                  contact_name: e.target.value,
                  contact_role: contact?.role || '',
                  contact_phone: contact?.phone || '',
                  contact_email: contact?.email || '',
                }));
              }}
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            >
              <option value="">Select or type below</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.full_name}>{c.full_name} {c.role ? `(${c.role})` : ''}</option>
              ))}
            </select>
            <input
              placeholder="Or type contact name"
              value={chaseForm.contact_name}
              onChange={(e) => setChaseForm((p) => ({ ...p, contact_name: e.target.value }))}
              className="mt-1 min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Outcome</label>
            <textarea
              rows={2}
              value={chaseForm.outcome}
              onChange={(e) => setChaseForm((p) => ({ ...p, outcome: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              placeholder="What happened?"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Promised Date</label>
              <input
                type="date"
                value={chaseForm.promised_date}
                onChange={(e) => setChaseForm((p) => ({ ...p, promised_date: e.target.value }))}
                className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Next Follow-Up</label>
              <input
                type="date"
                value={chaseForm.next_follow_up}
                onChange={(e) => setChaseForm((p) => ({ ...p, next_follow_up: e.target.value }))}
                className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Action Taken</label>
            <div className="flex gap-2">
              {['call', 'email', 'text', 'in_person', 'note'].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setChaseForm((p) => ({ ...p, action_taken: a }))}
                  className={`rounded-lg px-3 py-2 text-xs font-medium ${
                    chaseForm.action_taken === a
                      ? 'bg-brand-800 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {a.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" fullWidth loading={createChase.isPending}>
            Save Entry
          </Button>
        </form>
      </BottomSheet>

      {/* Mark Received Sheet */}
      <BottomSheet isOpen={showReceived} onClose={() => setShowReceived(false)} title="Mark PO Received">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Received Date</label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            />
          </div>
          <Button fullWidth loading={updatePO.isPending} onClick={handleMarkReceived}>
            Confirm Received
          </Button>
        </div>
      </BottomSheet>

      {/* Mark Paid Sheet */}
      <BottomSheet isOpen={showPaid} onClose={() => setShowPaid(false)} title="Mark PO Paid">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Paid Date</label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Amount Paid</label>
            <input
              type="number"
              step="0.01"
              placeholder={po.amount ? String(po.amount) : '0.00'}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="min-h-touch w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            />
          </div>
          <Button fullWidth loading={updatePO.isPending} onClick={handleMarkPaid}>
            Confirm Paid
          </Button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete PO"
        message={`Permanently delete invoice #${po.invoice_number}? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-700">{value || '—'}</span>
    </div>
  );
}
