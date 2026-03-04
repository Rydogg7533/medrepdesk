import { useQuery } from '@tanstack/react-query';
import { Phone, Mail, StickyNote } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatRelativeTime } from '@/utils/formatters';

const TYPE_ICONS = {
  call: Phone,
  email: Mail,
  note: StickyNote,
};

export default function RecentActivity({ limit = 5 }) {
  const { account } = useAuth();

  const { data: chaseEntries = [] } = useQuery({
    queryKey: ['recent_chase_log', account?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_chase_log')
        .select('id, notes, contact_method, created_at, case:cases(case_number)')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!account?.id,
  });

  const { data: comms = [] } = useQuery({
    queryKey: ['recent_communications', account?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communications')
        .select('id, type, notes, created_at, case:cases(case_number)')
        .eq('account_id', account.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!account?.id,
  });

  const merged = [
    ...chaseEntries.map((e) => ({
      id: `chase-${e.id}`,
      type: e.contact_method || 'note',
      text: e.notes || 'Chase log entry',
      caseNumber: e.case?.case_number,
      created_at: e.created_at,
    })),
    ...comms.map((c) => ({
      id: `comm-${c.id}`,
      type: c.type || 'note',
      text: c.notes || 'Communication',
      caseNumber: c.case?.case_number,
      created_at: c.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  if (merged.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500">No recent activity</p>;
  }

  return (
    <div className="space-y-3">
      {merged.map((item) => {
        const Icon = TYPE_ICONS[item.type] || StickyNote;
        return (
          <div key={item.id} className="flex items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.text}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {item.caseNumber ? `Case #${item.caseNumber} · ` : ''}
                {formatRelativeTime(item.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
