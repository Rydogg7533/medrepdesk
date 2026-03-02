import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';
import clsx from 'clsx';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

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
};

function getNotificationLink(notification) {
  const { related_type, related_id } = notification;
  if (!related_id) return '/notifications';
  switch (related_type) {
    case 'case': return `/cases/${related_id}`;
    case 'purchase_order': return `/po/${related_id}`;
    case 'commission': return `/commissions/${related_id}`;
    default: return '/notifications';
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const { data: notifications = [] } = useNotifications(8);
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleNotificationClick(notification) {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    setOpen(false);
    navigate(getNotificationLink(notification));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative flex min-h-touch items-center justify-center p-2 text-gray-500 dark:text-gray-400"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-400"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={clsx(
                    'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
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
                    <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                      {formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <button
            onClick={() => { setOpen(false); navigate('/notifications'); }}
            className="block w-full border-t border-gray-100 px-4 py-2.5 text-center text-xs font-medium text-brand-800 hover:bg-gray-50 dark:border-gray-700 dark:text-brand-400 dark:hover:bg-gray-700"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
