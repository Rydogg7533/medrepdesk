import { useState } from 'react';
import { Phone, Mail, MessageSquare, FileText } from 'lucide-react';
import { useCreateChaseEntry } from '@/hooks/useChaseLog';
import { useToast } from '@/components/ui/Toast';
import BottomSheet from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import DOMPurify from 'dompurify';

/**
 * Universal Chase PO bottom sheet.
 * Props:
 *   isOpen, onClose          — controls visibility
 *   caseId                   — case UUID (required for logging)
 *   caseNumber               — display string e.g. "MRD-3A14-2026-0001"
 *   facilityName             — display string
 *   facilityPhone            — tel number (null → Call/Text disabled)
 *   facilityEmail            — email address (null → Email disabled)
 *   facilityId               — facility UUID (for chase log)
 *   poId                     — PO UUID (optional, for PO-level chases)
 */
export default function ChaseBottomSheet({
  isOpen,
  onClose,
  caseId,
  caseNumber,
  facilityName,
  facilityPhone,
  facilityEmail,
  facilityId,
  poId,
}) {
  const createChase = useCreateChaseEntry();
  const toast = useToast();

  const [step, setStep] = useState('actions'); // 'actions' | 'log'
  const [actionType, setActionType] = useState(null);
  const [logForm, setLogForm] = useState({ outcome: '', promised_date: '', next_follow_up: '' });

  function reset() {
    setStep('actions');
    setActionType(null);
    setLogForm({ outcome: '', promised_date: '', next_follow_up: '' });
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleAction(type) {
    if (type === 'call' && facilityPhone) {
      window.location.href = `tel:${facilityPhone}`;
    } else if (type === 'email' && facilityEmail) {
      const subject = encodeURIComponent(`PO Request — ${caseNumber || ''}`);
      const body = encodeURIComponent(`Hi,\n\nI'm following up on the purchase order for case ${caseNumber || ''}.\n\nPlease let me know the status.\n\nThank you`);
      window.location.href = `mailto:${facilityEmail}?subject=${subject}&body=${body}`;
    } else if (type === 'text' && facilityPhone) {
      window.location.href = `sms:${facilityPhone}`;
    }

    setActionType(type);
    setStep('log');
  }

  function handleLogNote() {
    setActionType('note');
    setStep('log');
  }

  async function handleSave() {
    const chaseType = actionType === 'call' ? 'follow_up_call'
      : actionType === 'email' ? 'follow_up_email'
      : actionType === 'text' ? 'follow_up_text'
      : 'note';

    await createChase.mutateAsync({
      case_id: caseId,
      po_id: poId || null,
      facility_id: facilityId || null,
      chase_type: chaseType,
      action_taken: actionType === 'note' ? 'note' : actionType,
      outcome: logForm.outcome ? DOMPurify.sanitize(logForm.outcome) : null,
      promised_date: logForm.promised_date || null,
      next_follow_up: logForm.next_follow_up || null,
    });
    toast({ message: 'Follow-up logged', type: 'success' });
    handleClose();
  }

  function handleSkip() {
    handleClose();
  }

  const actionLabel = actionType === 'call' ? 'Call'
    : actionType === 'email' ? 'Email'
    : actionType === 'text' ? 'Text'
    : 'Note';

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title={`Chase PO — ${caseNumber || ''}`}>
      {step === 'actions' && (
        <div className="flex flex-col gap-3">
          {facilityName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{facilityName}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleAction('call')}
              disabled={!facilityPhone}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-green-50 py-3 text-sm font-medium text-green-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-green-900/30 dark:text-green-300"
            >
              <Phone className="h-4 w-4" />
              <span>Call</span>
              <span className="text-[10px] font-normal opacity-70 truncate max-w-full px-1">
                {facilityPhone || 'No phone on file'}
              </span>
            </button>
            <button
              onClick={() => handleAction('email')}
              disabled={!facilityEmail}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-blue-50 py-3 text-sm font-medium text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-blue-900/30 dark:text-blue-300"
            >
              <Mail className="h-4 w-4" />
              <span>Email</span>
              <span className="text-[10px] font-normal opacity-70 truncate max-w-full px-1">
                {facilityEmail || 'No email on file'}
              </span>
            </button>
            <button
              onClick={() => handleAction('text')}
              disabled={!facilityPhone}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg bg-purple-50 py-3 text-sm font-medium text-purple-700 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-purple-900/30 dark:text-purple-300"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Text</span>
              <span className="text-[10px] font-normal opacity-70 truncate max-w-full px-1">
                {facilityPhone || 'No phone on file'}
              </span>
            </button>
          </div>

          <button
            onClick={handleLogNote}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 dark:border-gray-600 dark:text-gray-400"
          >
            <FileText className="h-4 w-4" /> Log Note
          </button>
        </div>
      )}

      {step === 'log' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Log this {actionLabel.toLowerCase()} follow-up?
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Outcome</label>
            <textarea
              rows={2}
              value={logForm.outcome}
              onChange={(e) => setLogForm((f) => ({ ...f, outcome: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="e.g. Left voicemail, Spoke with Janet"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Promised Date</label>
              <input
                type="date"
                value={logForm.promised_date}
                onChange={(e) => setLogForm((f) => ({ ...f, promised_date: e.target.value }))}
                className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Next Follow-up</label>
              <input
                type="date"
                value={logForm.next_follow_up}
                onChange={(e) => setLogForm((f) => ({ ...f, next_follow_up: e.target.value }))}
                className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={handleSkip}>
              Skip
            </Button>
            <Button fullWidth loading={createChase.isPending} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
