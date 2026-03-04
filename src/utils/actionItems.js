import { Clock, CalendarCheck, AlertTriangle, FileText, TrendingUp, MessageSquare } from 'lucide-react';

function daysOverdue(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function buildActionItems({
  overdueFollowUps = [],
  overduePromised = [],
  completedNeedBillSheet = [],
  overduePOs = [],
  overdueCommissions = [],
  overdueComms = [],
}) {
  const items = [];

  overdueFollowUps.forEach((entry) => {
    const days = daysOverdue(entry.next_follow_up);
    items.push({
      id: `followup-${entry.id}`,
      type: 'overdue_followup',
      icon: Clock,
      color: 'text-red-500',
      urgency: days + 100,
      text: 'Overdue follow-up',
      subtitle: `Case #${entry.case?.case_number || '—'} · ${days}d overdue`,
      link: `/cases/${entry.case_id}`,
    });
  });

  overduePromised.forEach((entry) => {
    const days = daysOverdue(entry.promised_date);
    items.push({
      id: `promised-${entry.id}`,
      type: 'overdue_promised',
      icon: CalendarCheck,
      color: 'text-red-500',
      urgency: days + 100,
      text: 'Overdue promised date',
      subtitle: `Case #${entry.case?.case_number || '—'} · ${days}d overdue`,
      link: `/cases/${entry.case_id}`,
    });
  });

  completedNeedBillSheet.forEach((c) => {
    items.push({
      id: `billsheet-${c.id}`,
      type: 'needs_bill_sheet',
      icon: FileText,
      color: 'text-amber-500',
      urgency: 50,
      text: 'Needs bill sheet',
      subtitle: `Case #${c.case_number} · ${c.surgeon?.full_name || 'No surgeon'}`,
      link: `/bill-sheet?caseId=${c.id}`,
    });
  });

  overduePOs.forEach((po) => {
    const days = daysOverdue(po.expected_payment_date);
    items.push({
      id: `po-${po.id}`,
      type: 'overdue_po',
      icon: AlertTriangle,
      color: 'text-red-500',
      urgency: days + 80,
      text: 'Overdue PO',
      subtitle: `${po.facility?.name || 'Unknown'} · ${days}d overdue`,
      link: `/po/${po.id}`,
    });
  });

  overdueCommissions.forEach((comm) => {
    const days = daysOverdue(comm.expected_date);
    items.push({
      id: `commission-${comm.id}`,
      type: 'overdue_commission',
      icon: TrendingUp,
      color: 'text-red-500',
      urgency: days + 80,
      text: 'Overdue commission',
      subtitle: `${comm.distributor?.name || 'Unknown'} · ${days}d overdue`,
      link: `/commissions/${comm.id}`,
    });
  });

  overdueComms.forEach((c) => {
    const days = daysOverdue(c.follow_up_date);
    items.push({
      id: `comm-${c.id}`,
      type: 'overdue_comm',
      icon: MessageSquare,
      color: 'text-amber-500',
      urgency: days + 60,
      text: 'Overdue communication follow-up',
      subtitle: `Case #${c.case?.case_number || '—'} · ${days}d overdue`,
      link: c.case_id ? `/cases/${c.case_id}` : null,
    });
  });

  items.sort((a, b) => b.urgency - a.urgency);
  return items;
}
