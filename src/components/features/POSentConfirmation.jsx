import { useState } from 'react';
import { Send, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatDate } from '@/utils/formatters';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Shared component for displaying PO sent-to-manufacturer/distributor confirmation.
 *
 * @param {object} props
 * @param {object} props.emailLog - po_email_logs record (sent_to, sent_cc, status, created_at, subject)
 * @param {string} [props.contactName] - manufacturer/distributor billing contact name
 * @param {string} [props.poNumber] - PO number
 * @param {number} [props.amount] - PO amount
 * @param {boolean} [props.defaultExpanded] - start expanded
 * @param {'card'|'inline'} [props.variant] - 'card' wraps in Card, 'inline' renders bare
 */
export default function POSentConfirmation({
  emailLog,
  contactName,
  poNumber,
  amount,
  defaultExpanded = false,
  variant = 'card',
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!emailLog) return null;

  const sentTo = Array.isArray(emailLog.sent_to) ? emailLog.sent_to.join(', ') : emailLog.sent_to;
  const sentCc = Array.isArray(emailLog.sent_cc) ? emailLog.sent_cc.filter(Boolean).join(', ') : emailLog.sent_cc;
  const isFailed = emailLog.status === 'failed' || emailLog.status === 'bounced';

  const content = (
    <>
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Sent to Manufacturer
          </span>
          {!isFailed && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatDate(emailLog.created_at)}
            </span>
          )}
          {isFailed && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Failed
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expandable details */}
      {expanded && (
        <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
          <DetailRow label="Sent to" value={sentTo} />
          {sentCc && <DetailRow label="CC" value={sentCc} />}
          {contactName && <DetailRow label="Contact" value={contactName} />}
          <DetailRow label="Date Sent" value={formatDateTime(emailLog.created_at)} />
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Status</span>
            {isFailed ? (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Failed
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Delivered
              </span>
            )}
          </div>
          {poNumber && <DetailRow label="PO Number" value={poNumber} />}
        </div>
      )}
    </>
  );

  if (variant === 'inline') return content;
  return <Card className="mb-4">{content}</Card>;
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right font-medium text-gray-700 dark:text-gray-300">{value || '—'}</span>
    </div>
  );
}
