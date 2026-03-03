import { useState } from 'react';
import { X, Calendar, CheckCircle, FileText, Send, Clock, Receipt, DollarSign, Ban, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import { CASE_STATUSES } from '@/utils/constants';

const STAGES = [
  {
    key: 'scheduled',
    icon: Calendar,
    description: 'Case is on the surgical calendar. Awaiting confirmation from the facility.',
    trigger: 'Manual — rep creates a new case',
    action: 'Confirm the case date and details with the facility.',
  },
  {
    key: 'confirmed',
    icon: CheckCircle,
    description: 'Facility confirmed the surgery date. Prepare implants and logistics.',
    trigger: 'Manual — rep confirms the case',
    action: 'Ensure implants are ready and delivered before the procedure.',
  },
  {
    key: 'completed',
    icon: CheckCircle,
    description: 'Surgery has been performed. Begin the billing process.',
    trigger: 'Manual — rep marks case as completed',
    action: 'Submit the bill sheet to the facility for processing.',
  },
  {
    key: 'bill_sheet_submitted',
    icon: FileText,
    description: 'Bill sheet sent to the facility. Enter the case value and wait for the PO.',
    trigger: 'Manual — rep logs bill sheet submission with case value',
    action: 'Follow up with the facility to ensure the bill sheet was received.',
  },
  {
    key: 'po_requested',
    icon: Send,
    description: 'PO has been requested from the facility. Chase until received.',
    trigger: 'Auto — when a PO is created and chasing begins',
    action: 'Call, email, or text the facility to get the purchase order.',
  },
  {
    key: 'po_received',
    icon: Receipt,
    description: 'PO received from the facility. Forward to the distributor for billing.',
    trigger: 'Auto — when PO status is marked as received',
    action: 'Send PO to distributor. Verify details match the invoice.',
  },
  {
    key: 'billed',
    icon: Clock,
    description: 'PO forwarded to distributor. Awaiting payment processing.',
    trigger: 'Auto — after PO is sent to distributor',
    action: 'Monitor for payment. Follow up with distributor if delayed.',
  },
  {
    key: 'paid',
    icon: DollarSign,
    description: 'Payment received from the distributor. Case is complete.',
    trigger: 'Manual — rep records payment on the PO',
    action: 'Verify commission amount and close out the case.',
  },
  {
    key: 'cancelled',
    icon: Ban,
    description: 'Case was cancelled and removed from the active pipeline.',
    trigger: 'Manual — rep cancels the case',
    action: 'No further action required.',
  },
];

export default function PipelineGuide({ isOpen, onClose, currentStatus }) {
  const [expanded, setExpanded] = useState(null);

  if (!isOpen) return null;

  const currentIndex = STAGES.findIndex((s) => s.key === currentStatus);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-2xl bg-white shadow-xl dark:bg-gray-800 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Case Pipeline</h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stages */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(85vh - 64px)' }}>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-6 bottom-6 w-px bg-gray-200 dark:bg-gray-600" />

            <div className="space-y-1">
              {STAGES.map((stage, i) => {
                const status = CASE_STATUSES[stage.key];
                const Icon = stage.icon;
                const isCurrent = stage.key === currentStatus;
                const isPast = currentIndex >= 0 && i < currentIndex;
                const isExpanded = expanded === stage.key;

                return (
                  <div key={stage.key}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isExpanded ? null : stage.key)}
                      className={clsx(
                        'relative flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left transition-colors',
                        isCurrent && 'bg-brand-50 dark:bg-brand-800/20',
                      )}
                    >
                      <div
                        className={clsx(
                          'relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                          isCurrent
                            ? 'bg-brand-800 text-white dark:bg-brand-400 dark:text-gray-900'
                            : isPast
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={clsx(
                          'text-sm font-medium',
                          isCurrent
                            ? 'text-brand-800 dark:text-brand-400'
                            : isPast
                              ? 'text-gray-600 dark:text-gray-400'
                              : 'text-gray-700 dark:text-gray-300'
                        )}>
                          {status?.label || stage.key}
                          {isCurrent && (
                            <span className="ml-2 inline-block rounded-full bg-brand-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white dark:bg-brand-400 dark:text-gray-900">
                              Current
                            </span>
                          )}
                        </p>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="ml-12 mb-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                        <p className="text-xs text-gray-600 dark:text-gray-300">{stage.description}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Trigger:</span> {stage.trigger}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Your action:</span> {stage.action}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
