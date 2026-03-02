import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, DollarSign, Users, Menu } from 'lucide-react';
import clsx from 'clsx';

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/cases', icon: Briefcase, label: 'Cases' },
  { to: '/money', icon: DollarSign, label: 'Money' },
  { to: '/contacts', icon: Users, label: 'Contacts' },
  { to: '/more', icon: Menu, label: 'More' },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-safe-bottom dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-around">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-brand-800 dark:text-brand-400' : 'text-gray-400 dark:text-gray-500'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
