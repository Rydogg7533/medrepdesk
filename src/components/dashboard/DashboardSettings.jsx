import BottomSheet from '@/components/ui/BottomSheet';
import { useDashboardPreferences, useUpdateDashboardPreferences } from '@/hooks/useDashboardPreferences';

const SECTIONS = [
  { key: 'show_todays_cases', label: "Today's Cases" },
  { key: 'show_upcoming_cases', label: 'Upcoming Cases' },
  { key: 'show_po_pipeline', label: 'PO Pipeline' },
  { key: 'show_metrics', label: 'Metrics' },
  { key: 'show_action_items', label: 'Action Items' },
  { key: 'show_recent_activity', label: 'Recent Activity' },
];

export default function DashboardSettings({ isOpen, onClose }) {
  const prefs = useDashboardPreferences();
  const updatePrefs = useUpdateDashboardPreferences();

  function toggle(key) {
    updatePrefs.mutate({ [key]: !prefs[key] });
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Dashboard Settings">
      <div className="space-y-1">
        {SECTIONS.map(({ key, label }) => (
          <label
            key={key}
            className="flex min-h-touch items-center justify-between rounded-lg px-2 py-3"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key]}
              onClick={() => toggle(key)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs[key] ? 'bg-brand-800' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  prefs[key] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        ))}
      </div>
    </BottomSheet>
  );
}
