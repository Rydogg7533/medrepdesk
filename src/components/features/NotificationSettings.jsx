import { useState, useEffect } from 'react';
import { Bell, Clock, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { useAuth } from '@/context/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUpdateAccount } from '@/hooks/useAccount';
import { useToast } from '@/components/ui/Toast';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? 'AM' : 'PM';
  const h = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: i, label: `${h}:00 ${ampm}` };
});

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const NOTIFICATION_TOGGLES = [
  { key: 'notify_case_tomorrow', label: 'Case Tomorrow', desc: 'Remind me about cases scheduled for tomorrow' },
  { key: 'notify_case_today', label: 'Case Today', desc: 'Morning alert for cases happening today' },
  { key: 'notify_po_needed', label: 'PO Needed', desc: 'Alert when a case needs a purchase order' },
  { key: 'notify_po_overdue', label: 'PO Overdue', desc: 'Alert when a PO is past due' },
  { key: 'notify_commission_due', label: 'Commission Due', desc: 'Alert when commission payment is expected' },
  { key: 'notify_commission_overdue', label: 'Commission Overdue', desc: 'Alert when commission is past due' },
  { key: 'notify_promised_date', label: 'Promised Date Passed', desc: 'Alert when a promised payment date passes' },
  { key: 'notify_escalation', label: 'Escalation Needed', desc: 'Suggest escalation after chase threshold' },
  { key: 'notify_weekly_digest', label: 'Weekly Digest', desc: 'AI summary of your week ahead' },
  { key: 'notify_pay_period_close', label: 'Pay Period Close', desc: 'Reminder when pay period is about to close' },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-brand-800' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function HourPicker({ value, onChange, label }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      >
        {HOUR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberStepper({ value, onChange, label, suffix, min = 0, max = 30 }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-sm font-medium dark:bg-gray-700"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-sm font-medium dark:bg-gray-700"
        >
          +
        </button>
        {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
      </div>
    </div>
  );
}

export default function NotificationSettings() {
  const { account } = useAuth();
  const { supported: pushSupported, isSubscribed, subscribe, unsubscribe, loading: pushLoading } = usePushNotifications();
  const updateAccount = useUpdateAccount();
  const toast = useToast();

  const [form, setForm] = useState({
    reminder_hour: 20,
    morning_check_hour: 6,
    case_tomorrow_hours_before: 24,
    promised_date_grace_days: 0,
    po_overdue_grace_days: 0,
    commission_overdue_grace_days: 0,
    escalation_threshold: 3,
    notify_case_tomorrow: true,
    notify_case_today: true,
    notify_po_needed: true,
    notify_po_overdue: true,
    notify_commission_due: true,
    notify_commission_overdue: true,
    notify_promised_date: true,
    notify_escalation: true,
    notify_weekly_digest: true,
    notify_pay_period_close: true,
    digest_day: 1,
    digest_hour: 8,
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (account) {
      setForm((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(prev)) {
          if (account[key] !== undefined && account[key] !== null) {
            next[key] = account[key];
          }
        }
        return next;
      });
      setDirty(false);
    }
  }, [account]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await updateAccount.mutateAsync(form);
      setDirty(false);
      toast({ message: 'Notification settings saved', type: 'success' });
    } catch (err) {
      toast({ message: `Failed to save: ${err.message}`, type: 'error' });
    }
  }

  return (
    <section className="mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Notifications</h2>

      <div className="flex flex-col gap-5">
        {/* Push enable/disable */}
        {pushSupported && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Push Notifications
                  <InfoTooltip text="Enable browser push notifications for real-time alerts." />
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isSubscribed ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <Button
              variant={isSubscribed ? 'secondary' : 'primary'}
              size="sm"
              loading={pushLoading}
              onClick={isSubscribed ? unsubscribe : subscribe}
            >
              {isSubscribed ? 'Disable' : 'Enable'}
            </Button>
          </div>
        )}

        {/* Timing */}
        <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Timing</span>
          </div>
          <div className="flex flex-col gap-3">
            <HourPicker
              label="Nightly Reminder"
              value={form.reminder_hour}
              onChange={(v) => set('reminder_hour', v)}
            />
            <HourPicker
              label="Morning Check"
              value={form.morning_check_hour}
              onChange={(v) => set('morning_check_hour', v)}
            />
          </div>
        </div>

        {/* Weekly Digest */}
        <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Weekly Digest</span>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Enable Digest</span>
              <Toggle checked={form.notify_weekly_digest} onChange={(v) => set('notify_weekly_digest', v)} />
            </div>
            {form.notify_weekly_digest && (
              <>
                <div>
                  <span className="mb-2 block text-sm text-gray-700 dark:text-gray-300">Day</span>
                  <div className="flex gap-1">
                    {DAYS.map((day, i) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => set('digest_day', i + 1)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                          form.digest_day === i + 1
                            ? 'bg-brand-800 text-white'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <HourPicker
                  label="Digest Time"
                  value={form.digest_hour}
                  onChange={(v) => set('digest_hour', v)}
                />
              </>
            )}
          </div>
        </div>

        {/* Notification Toggles */}
        <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
          <span className="mb-3 block text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
            Notification Types
          </span>
          <div className="flex flex-col gap-3">
            {NOTIFICATION_TOGGLES.filter((t) => t.key !== 'notify_weekly_digest').map((toggle) => (
              <div key={toggle.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{toggle.label}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{toggle.desc}</p>
                </div>
                <Toggle checked={form[toggle.key] ?? true} onChange={(v) => set(toggle.key, v)} />
              </div>
            ))}
          </div>
        </div>

        {/* Variable Controls */}
        <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
          <span className="mb-3 block text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
            Thresholds
          </span>
          <div className="flex flex-col gap-3">
            <NumberStepper
              label="Case Tomorrow (hours before)"
              value={form.case_tomorrow_hours_before}
              onChange={(v) => set('case_tomorrow_hours_before', v)}
              suffix="hrs"
              max={72}
            />
            <NumberStepper
              label="Promised Date Grace"
              value={form.promised_date_grace_days}
              onChange={(v) => set('promised_date_grace_days', v)}
              suffix="days"
            />
            <NumberStepper
              label="PO Overdue Grace"
              value={form.po_overdue_grace_days}
              onChange={(v) => set('po_overdue_grace_days', v)}
              suffix="days"
            />
            <NumberStepper
              label="Commission Overdue Grace"
              value={form.commission_overdue_grace_days}
              onChange={(v) => set('commission_overdue_grace_days', v)}
              suffix="days"
            />
            <NumberStepper
              label="Escalation Threshold"
              value={form.escalation_threshold}
              onChange={(v) => set('escalation_threshold', v)}
              suffix="attempts"
              min={1}
              max={10}
            />
          </div>
        </div>

        {/* Save */}
        {dirty && (
          <Button
            variant="primary"
            fullWidth
            loading={updateAccount.isPending}
            onClick={handleSave}
          >
            Save Notification Settings
          </Button>
        )}
      </div>
    </section>
  );
}
