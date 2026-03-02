import { Phone, Mail, MessageSquare, AlertTriangle, FileText, CheckCircle, Users, StickyNote } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

const CHASE_TYPE_CONFIG = {
  bill_sheet_submitted: { icon: FileText, color: 'bg-blue-500', label: 'Bill Sheet Submitted' },
  po_requested: { icon: FileText, color: 'bg-orange-500', label: 'PO Requested' },
  follow_up_call: { icon: Phone, color: 'bg-brand-800', label: 'Follow-Up Call' },
  follow_up_email: { icon: Mail, color: 'bg-brand-800', label: 'Follow-Up Email' },
  follow_up_text: { icon: MessageSquare, color: 'bg-brand-800', label: 'Follow-Up Text' },
  po_received: { icon: CheckCircle, color: 'bg-green-500', label: 'PO Received' },
  escalation: { icon: AlertTriangle, color: 'bg-red-500', label: 'Escalation' },
  note: { icon: StickyNote, color: 'bg-gray-400', label: 'Note' },
};

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return dateStr < new Date().toISOString().split('T')[0];
}

export default function ChaseTimeline({ entries = [] }) {
  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400">No chase entries yet</p>
    );
  }

  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {entries.map((entry) => {
          const config = CHASE_TYPE_CONFIG[entry.chase_type] || CHASE_TYPE_CONFIG.note;
          const Icon = config.icon;
          const promisedOverdue = isOverdue(entry.promised_date);
          const followUpOverdue = isOverdue(entry.next_follow_up) && !entry.follow_up_done;

          return (
            <div key={entry.id} className="relative flex gap-3">
              {/* Dot */}
              <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.color}`}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800">{config.label}</p>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatDate(entry.created_at)}
                  </span>
                </div>

                {entry.contact_name && (
                  <p className="text-xs text-gray-500">
                    <Users className="mr-1 inline h-3 w-3" />
                    {entry.contact_name}
                    {entry.contact_role && ` (${entry.contact_role})`}
                  </p>
                )}

                {entry.outcome && (
                  <p className="mt-1 text-sm text-gray-600">{entry.outcome}</p>
                )}

                <div className="mt-1 flex flex-wrap gap-2">
                  {entry.promised_date && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      promisedOverdue
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      Promised: {formatDate(entry.promised_date)}
                    </span>
                  )}
                  {entry.next_follow_up && (
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      followUpOverdue
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      Follow-up: {formatDate(entry.next_follow_up)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
