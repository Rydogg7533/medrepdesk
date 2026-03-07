import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import Button from '@/components/ui/Button';

const TYPE_LABELS = {
  case_tomorrow: 'Case Tomorrow',
  follow_up_due: 'Follow-up Due',
  promised_date_passed: 'Promised Date Passed',
  escalation_recommended: 'Escalation',
  po_overdue: 'PO Overdue',
  commission_overdue: 'Commission Overdue',
  referral_signup: 'Referral',
  payout_sent: 'Payout',
  weekly_digest: 'Digest',
  payment_failed: 'Payment Failed',
  pay_period_closed: 'Pay Period Closed',
};

function getNotificationLink(notification) {
  const { related_type, related_id } = notification;
  if (!related_id) return null;
  switch (related_type) {
    case 'case': return `/cases/${related_id}`;
    case 'purchase_order': return `/po/${related_id}`;
    case 'commission': return `/commissions/${related_id}`;
    case 'pay_period': return `/pay-periods/${related_id}`;
    default: return null;
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // all | unread

  const { data: notifications = [], isLoading } = useNotifications(100);
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const { supported, isSubscribed, subscribe, unsubscribe, loading: pushLoading, permission } = usePushNotifications();

  const filtered = filter === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  function handleClick(notification) {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    const link = getNotificationLink(notification);
    if (link) navigate(link);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="page-bg-text text-lg font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-400"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Push notification banner */}
      {supported && !isSubscribed && permission !== 'denied' && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Enable push notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Get alerts for cases, POs, and commissions</p>
            </div>
            <Button size="sm" onClick={subscribe} loading={pushLoading}>Enable</Button>
          </div>
        </div>
      )}

      {supported && isSubscribed && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">Push notifications enabled</span>
            </div>
            <button
              onClick={unsubscribe}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <BellOff className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="mb-3 flex gap-2">
        {['all', 'unread'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === f
                ? 'bg-brand-800 text-white dark:bg-brand-400 dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            )}
          >
            {f === 'all' ? 'All' : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={clsx(
                'flex w-full gap-3 px-2 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                !n.is_read && 'bg-blue-50/50 dark:bg-blue-900/10'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-brand-800 dark:text-brand-400">
                    {TYPE_LABELS[n.type] || n.type}
                  </span>
                  {!n.is_read && (
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
                <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {n.body}
                </p>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                  {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
