import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Plus, Briefcase, MessageSquare, UserPlus, FileText } from 'lucide-react';
import BottomNav from './BottomNav';
import BottomSheet from '@/components/ui/BottomSheet';
import NotificationBell from '@/components/ui/NotificationBell';
import OfflineBanner from '@/components/ui/OfflineBanner';
import PageTransition from '@/components/ui/PageTransition';

export default function AppLayout() {
  const [fabOpen, setFabOpen] = useState(false);
  const navigate = useNavigate();

  function handleAction(path) {
    setFabOpen(false);
    navigate(path);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-gray-900">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-30 flex min-h-touch items-center justify-between border-b border-gray-200 bg-white px-4 pt-safe-top dark:border-gray-700 dark:bg-gray-800">
        <span className="text-lg font-bold text-brand-800 dark:text-brand-400">MedRepDesk</span>
        <NotificationBell />
      </header>

      <OfflineBanner />

      {/* Content */}
      <main className="flex-1 overflow-y-auto pt-[calc(44px+env(safe-area-inset-top))] pb-[calc(68px+env(safe-area-inset-bottom))]">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* FAB */}
      <button
        onClick={() => setFabOpen(true)}
        className="fixed bottom-[calc(68px+env(safe-area-inset-bottom)+12px)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-800 text-white shadow-lg transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Quick Actions Sheet */}
      <BottomSheet isOpen={fabOpen} onClose={() => setFabOpen(false)} title="Quick Actions">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => handleAction('/cases/new')}
            className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Briefcase className="h-5 w-5 text-brand-800 dark:text-brand-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">New Case</span>
          </button>
          <button
            onClick={() => handleAction('/po/new')}
            className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FileText className="h-5 w-5 text-brand-800 dark:text-brand-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Log PO</span>
          </button>
          <button
            onClick={() => handleAction('/communications/new')}
            className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <MessageSquare className="h-5 w-5 text-brand-800 dark:text-brand-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Log Communication</span>
          </button>
          <button
            onClick={() => handleAction('/contacts/new')}
            className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <UserPlus className="h-5 w-5 text-brand-800 dark:text-brand-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Add Contact</span>
          </button>
        </div>
      </BottomSheet>

      <BottomNav />
    </div>
  );
}
