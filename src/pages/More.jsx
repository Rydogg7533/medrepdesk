import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Building,
  Stethoscope,
  Gift,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RoleGate from '@/components/layout/RoleGate';

const items = [
  { icon: Building2, label: 'Distributors', path: '/distributors' },
  { icon: Building, label: 'Facilities', path: '/facilities' },
  { icon: Stethoscope, label: 'Surgeons', path: '/surgeons' },
];

const ownerItems = [
  { icon: Gift, label: 'Referrals', path: '/referrals' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function More() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  function MenuItem({ icon: Icon, label, path, onClick }) {
    return (
      <button
        onClick={onClick || (() => navigate(path))}
        className="flex min-h-touch w-full items-center gap-3 rounded-lg px-3 py-3 text-left active:bg-gray-100"
      >
        <Icon className="h-5 w-5 text-gray-500" />
        <span className="flex-1 text-sm font-medium text-gray-700">{label}</span>
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-bold text-gray-900">More</h1>

      <div className="rounded-xl bg-white shadow-sm">
        {items.map((item) => (
          <MenuItem key={item.path} {...item} />
        ))}
        <RoleGate allowedRoles={['owner']}>
          {ownerItems.map((item) => (
            <MenuItem key={item.path} {...item} />
          ))}
        </RoleGate>
      </div>

      <div className="mt-4 rounded-xl bg-white shadow-sm">
        {bottomItems.map((item) => (
          <MenuItem key={item.path} {...item} />
        ))}
        <button
          onClick={signOut}
          className="flex min-h-touch w-full items-center gap-3 rounded-lg px-3 py-3 text-left active:bg-gray-100"
        >
          <LogOut className="h-5 w-5 text-red-500" />
          <span className="flex-1 text-sm font-medium text-red-500">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
