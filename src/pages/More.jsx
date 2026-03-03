import { useNavigate } from 'react-router-dom';
import {
  Gift,
  Settings,
  LogOut,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import RoleGate from '@/components/layout/RoleGate';
import clsx from 'clsx';

const ownerItems = [
  { icon: Gift, label: 'Referrals', path: '/referrals' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const themeOptions = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
];

export default function More() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  function MenuItem({ icon: Icon, label, path, onClick }) {
    return (
      <button
        onClick={onClick || (() => navigate(path))}
        className="flex min-h-touch w-full items-center gap-3 rounded-lg px-3 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700"
      >
        <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
        <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </button>
    );
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">More</h1>

      <RoleGate allowedRoles={['owner']}>
        <div className="rounded-xl bg-white shadow-sm dark:bg-gray-800">
          {ownerItems.map((item) => (
            <MenuItem key={item.path} {...item} />
          ))}
        </div>
      </RoleGate>

      {/* Theme Toggle */}
      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Appearance</h2>
        <div className="flex gap-2">
          {themeOptions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={clsx(
                'flex flex-1 flex-col items-center gap-1.5 rounded-lg py-3 text-xs font-medium transition-colors',
                theme === key
                  ? 'bg-brand-800 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white shadow-sm dark:bg-gray-800">
        {bottomItems.map((item) => (
          <MenuItem key={item.path} {...item} />
        ))}
        <button
          onClick={signOut}
          className="flex min-h-touch w-full items-center gap-3 rounded-lg px-3 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700"
        >
          <LogOut className="h-5 w-5 text-red-500" />
          <span className="flex-1 text-sm font-medium text-red-500">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
