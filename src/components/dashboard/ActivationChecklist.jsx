import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Building2, MapPin, Stethoscope, Briefcase, Bell, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDistributors } from '@/hooks/useDistributors';
import { useFacilities } from '@/hooks/useFacilities';
import { useSurgeons } from '@/hooks/useSurgeons';
import { useCases } from '@/hooks/useCases';
import Card from '@/components/ui/Card';

const DISMISS_KEY = 'activation_checklist_dismissed';

export default function ActivationChecklist() {
  const navigate = useNavigate();
  const { account } = useAuth();
  const { data: distributors = [] } = useDistributors();
  const { data: facilities = [] } = useFacilities();
  const { data: surgeons = [] } = useSurgeons();
  const { data: cases = [] } = useCases();

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  // Check if account is < 7 days old
  const isNew = account?.created_at &&
    (Date.now() - new Date(account.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;

  if (dismissed || !isNew) return null;

  const items = [
    {
      label: 'Add your first distributor',
      done: distributors.length > 0,
      action: () => navigate('/distributors/new'),
    },
    {
      label: 'Add a facility',
      done: facilities.length > 0,
      action: () => navigate('/facilities/new'),
    },
    {
      label: 'Add a surgeon',
      done: surgeons.length > 0,
      action: () => navigate('/surgeons/new'),
    },
    {
      label: 'Schedule your first case',
      done: cases.length > 0,
      action: () => navigate('/cases/new'),
    },
    {
      label: 'Enable notifications',
      done: notificationsEnabled,
      action: async () => {
        if (typeof Notification !== 'undefined') {
          const result = await Notification.requestPermission();
          if (result === 'granted') setNotificationsEnabled(true);
        }
      },
    },
  ];

  const completedCount = items.filter((i) => i.done).length;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  }

  return (
    <Card className="border border-brand-200 dark:border-brand-800/30 bg-brand-50/50 dark:bg-brand-900/10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Get Started ({completedCount}/{items.length})
        </h2>
        <button
          onClick={handleDismiss}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.done ? undefined : item.action}
            disabled={item.done}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left active:bg-brand-100 dark:active:bg-brand-800/20 disabled:opacity-60 disabled:cursor-default"
          >
            {item.done ? (
              <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
            ) : (
              <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-600" />
            )}
            <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}
