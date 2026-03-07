import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Briefcase, MessageSquare, UserPlus, FileText, Settings, Mic, UserRound, Stethoscope, Building2 } from 'lucide-react';
import BottomNav from './BottomNav';
import BottomSheet from '@/components/ui/BottomSheet';
import DashboardSettings from '@/components/dashboard/DashboardSettings';
import NotificationBell from '@/components/ui/NotificationBell';
import OfflineBanner from '@/components/ui/OfflineBanner';
import PageTransition from '@/components/ui/PageTransition';
import VoiceQuickLog from '@/components/features/VoiceQuickLog';
import VoiceAgent from '@/components/features/VoiceAgent';
import ConversationalVoiceModal from '@/components/features/ConversationalVoiceModal';
import { useAutoClosePayPeriods } from '@/hooks/useAutoClosePayPeriods';
import { useSubscription } from '@/hooks/useSubscription';
import { useTheme } from '@/context/ThemeContext';

export default function AppLayout() {
  useAutoClosePayPeriods();
  const { customTheme } = useTheme();
  const [fabOpen, setFabOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceAgentOpen, setVoiceAgentOpen] = useState(false);
  const [convoVoice, setConvoVoice] = useState(null); // { scriptType, prefillName?, caseData? } | null
  const { canAccessAssistant } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  const isDashboard = location.pathname === '/dashboard';
  const showVoiceFab = ['/dashboard', '/cases', '/money', '/contacts'].includes(location.pathname)
    || location.pathname.startsWith('/cases/');

  // Scroll to top on route change
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener('open-dashboard-settings', handler);
    return () => window.removeEventListener('open-dashboard-settings', handler);
  }, []);

  function handleAction(path) {
    setFabOpen(false);
    navigate(path);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Background image layer */}
      {customTheme?.bg_type === 'image' && customTheme?.bg_image_url && (
        <div
          className="fixed inset-0"
          style={{
            zIndex: -2,
            backgroundImage: `url(${customTheme.bg_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#1a1a2e',
          }}
        />
      )}
      {/* Overlay for image backgrounds */}
      {customTheme?.bg_type === 'image' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            pointerEvents: 'none',
            background: `rgba(0, 0, 0, ${customTheme?.overlay_opacity ?? 0.5})`,
          }}
        />
      )}
      {/* Gradient layer */}
      {customTheme?.bg_type === 'gradient' && customTheme?.bg_gradient && (
        <div
          className="fixed inset-0"
          style={{
            zIndex: -2,
            background: (() => {
              const presets = {
                ocean: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                sunset: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                forest: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                midnight: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
                peach: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                slate: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
              };
              return presets[customTheme.bg_gradient] || presets.ocean;
            })(),
          }}
        />
      )}
      {/* Header */}
      <header className="themed-nav fixed inset-x-0 top-0 z-30 flex min-h-touch items-center justify-between border-b border-gray-200 bg-white px-4 pt-safe-top dark:border-gray-700 dark:bg-gray-800">
        <span className="text-lg font-bold text-brand-800 dark:text-brand-400">MedRepDesk</span>
        <div className="flex items-center gap-3">
          {isDashboard && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-dashboard-settings'))}
              className="min-h-touch p-2"
            >
              <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          <NotificationBell />
        </div>
      </header>

      <OfflineBanner />

      {/* Content */}
      <main ref={mainRef} className="relative z-[1] flex-1 overflow-y-auto pt-[calc(44px+env(safe-area-inset-top))] pb-[calc(68px+env(safe-area-inset-bottom))]">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* Voice FAB */}
      {showVoiceFab && (
        <button
          onClick={() => canAccessAssistant ? setVoiceAgentOpen(true) : setVoiceOpen(true)}
          className="themed-fab fixed bottom-[calc(68px+env(safe-area-inset-bottom)+82px)] right-[22px] z-30 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-600 shadow-md transition-transform active:scale-95 dark:bg-gray-700 dark:text-gray-300"
          aria-label="Voice input"
        >
          <Mic className="h-5 w-5" />
        </button>
      )}

      {/* FAB */}
      <button
        onClick={() => setFabOpen(true)}
        className="themed-fab fixed bottom-[calc(68px+env(safe-area-inset-bottom)+12px)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-800 text-white shadow-lg transition-transform active:scale-95"
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
          {/* TESTING ONLY — re-gate before launch (was: canAccessAssistant) */}
          {true && (
            <>
              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500">Voice</p>
              <button
                onClick={() => { setFabOpen(false); canAccessAssistant ? setVoiceAgentOpen(true) : setVoiceOpen(true); }}
                className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Mic className="h-5 w-5 text-brand-800 dark:text-brand-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{canAccessAssistant ? 'Voice Agent' : 'Voice Log'}</span>
              </button>
              <button
                onClick={() => { setFabOpen(false); setConvoVoice({ scriptType: 'add_contact' }); }}
                className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <UserRound className="h-5 w-5 text-brand-800 dark:text-brand-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Voice: Add Contact</span>
              </button>
              <button
                onClick={() => { setFabOpen(false); setConvoVoice({ scriptType: 'add_surgeon' }); }}
                className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Stethoscope className="h-5 w-5 text-brand-800 dark:text-brand-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Voice: Add Surgeon</span>
              </button>
              <button
                onClick={() => { setFabOpen(false); setConvoVoice({ scriptType: 'add_facility' }); }}
                className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Building2 className="h-5 w-5 text-brand-800 dark:text-brand-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Voice: Add Facility</span>
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      <VoiceAgent isOpen={voiceAgentOpen} onClose={() => setVoiceAgentOpen(false)} />
      <VoiceQuickLog
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onConversationalRedirect={(scriptType, extras) => setConvoVoice({ scriptType, ...(extras || {}) })}
      />
      {convoVoice && (
        <ConversationalVoiceModal
          isOpen={!!convoVoice}
          onClose={() => setConvoVoice(null)}
          scriptType={convoVoice.scriptType}
          prefillName={convoVoice.prefillName}
          onComplete={(savedRecord) => {
            const caseData = convoVoice.caseData;
            const st = convoVoice.scriptType;
            setConvoVoice(null);
            if (caseData && savedRecord && st === 'add_surgeon') {
              navigate('/cases/new', {
                state: {
                  prefill: {
                    ...caseData,
                    surgeon_id: savedRecord.id,
                    surgeon_name: savedRecord.full_name,
                  },
                  showReadyBanner: true,
                },
              });
            } else if (caseData && savedRecord && st === 'add_facility') {
              navigate('/cases/new', {
                state: {
                  prefill: {
                    ...caseData,
                    facility_id: savedRecord.id,
                    facility_name: savedRecord.name,
                  },
                  showReadyBanner: true,
                },
              });
            }
          }}
        />
      )}

      <DashboardSettings isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <BottomNav />
    </div>
  );
}
