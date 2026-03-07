import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Plus, Briefcase, MessageSquare, UserPlus, FileText, Settings, Mic, UserRound, Stethoscope, Building2, AlertTriangle, CheckCircle, Clock, X } from 'lucide-react';
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
import { useSubscription, useCreatePortalSession } from '@/hooks/useSubscription';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';
import MicPermissionToast from '@/components/ui/MicPermissionToast';

export default function AppLayout() {
  useAutoClosePayPeriods();
  const { customTheme, reapplyBackground } = useTheme();
  const { user, account } = useAuth();
  const { permission, requestPermission } = useMicrophonePermission();
  const [fabOpen, setFabOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceAgentOpen, setVoiceAgentOpen] = useState(false);
  const [convoVoice, setConvoVoice] = useState(null); // { scriptType, prefillName?, caseData? } | null
  const { canAccessAssistant, isPastDue, isTrialing, trialEndsAt } = useSubscription();
  const portalSession = useCreatePortalSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const mainRef = useRef(null);
  const isDashboard = location.pathname === '/dashboard';
  const isVoiceActive = voiceOpen || voiceAgentOpen || !!convoVoice;
  const accentRgb = typeof window !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue('--app-accent-rgb').trim() || '15 76 129'
    : '15 76 129';

  // Apply theme background on mount (canvas div now exists in DOM)
  useEffect(() => {
    reapplyBackground();
  }, []);

  // Scroll to top on route change + re-apply theme backgrounds
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    reapplyBackground();
  }, [location.pathname, reapplyBackground]);

  useEffect(() => {
    const handler = () => setSettingsOpen(true);
    window.addEventListener('open-dashboard-settings', handler);
    return () => window.removeEventListener('open-dashboard-settings', handler);
  }, []);

  // Detect checkout success from URL
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setCheckoutSuccess(true);
      const next = new URLSearchParams(searchParams);
      next.delete('checkout');
      setSearchParams(next, { replace: true });
    }
  }, []);

  const trialDaysLeft = isTrialing && trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  async function handleManageBilling() {
    try {
      const result = await portalSession.mutateAsync();
      if (result?.url) window.location.href = result.url;
    } catch (err) {
      console.error('Portal session error:', err);
    }
  }

  // Proactive mic permission for voice-enabled plans
  useEffect(() => {
    if (user && ['assistant', 'distributorship'].includes(account?.plan)) {
      const timer = setTimeout(() => {
        requestPermission().catch(() => {});
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, account?.plan]);

  function handleAction(path) {
    setFabOpen(false);
    navigate(path);
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Background canvas — fixed behind everything, styled by ThemeContext */}
      <div
        id="app-bg-canvas"
        ref={(el) => { if (el) console.log('bg-canvas mounted'); }}
        style={{ position: 'fixed', inset: 0, zIndex: -1 }}
      />
      {/* Header */}
      <header className="themed-nav fixed inset-x-0 top-0 z-30 flex min-h-touch items-center justify-between border-b border-gray-200 bg-white px-4 pt-safe-top dark:border-gray-700 dark:bg-gray-800">
        <span className="text-lg font-bold text-brand-800 dark:text-white">MedRepDesk</span>
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

      {/* Subscription banners — fixed below header */}
      {checkoutSuccess && (
        <div className="fixed inset-x-0 top-[calc(44px+env(safe-area-inset-top))] z-30 flex items-center justify-between gap-2 bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            Subscription activated successfully!
          </div>
          <button onClick={() => setCheckoutSuccess(false)} className="p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {isPastDue && (
        <div className="fixed inset-x-0 top-[calc(44px+env(safe-area-inset-top))] z-30 flex items-center justify-between gap-2 bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Payment failed — update your payment method to avoid interruption.
          </div>
          <button onClick={handleManageBilling} className="whitespace-nowrap font-medium underline">
            Update payment
          </button>
        </div>
      )}
      {isTrialing && trialDaysLeft !== null && (
        <div className="fixed inset-x-0 top-[calc(44px+env(safe-area-inset-top))] z-30 flex items-center justify-center gap-2 bg-blue-50 px-4 py-1.5 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          {trialDaysLeft === 0
            ? 'Your trial ends today.'
            : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your free trial.`}
          <button onClick={() => navigate('/pricing')} className="ml-1 font-medium underline">
            Choose a plan
          </button>
        </div>
      )}

      {/* Content */}
      <main ref={mainRef} className={`relative z-[1] flex-1 overflow-x-hidden overflow-y-auto overscroll-none pb-[calc(68px+env(safe-area-inset-bottom))] ${(checkoutSuccess || isPastDue || (isTrialing && trialDaysLeft !== null)) ? 'pt-[calc(44px+env(safe-area-inset-top)+36px)]' : 'pt-[calc(44px+env(safe-area-inset-top))]'}`}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* Voice FAB */}
      <button
        onClick={() => canAccessAssistant ? setVoiceAgentOpen(true) : setVoiceOpen(true)}
        className="fixed bottom-[calc(68px+env(safe-area-inset-bottom)+82px)] right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white text-white shadow-md transition-all duration-150 active:scale-95"
        style={{ backgroundColor: `rgba(${accentRgb.replace(/ /g, ', ')}, ${isVoiceActive ? 1 : 0.75})` }}
        aria-label="Voice input"
      >
        <Mic className="h-5 w-5" />
      </button>

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
            className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Briefcase className="h-5 w-5 text-brand-800 dark:text-brand-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">New Case</span>
          </button>
          <button
            onClick={() => handleAction('/po/new')}
            className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <FileText className="h-5 w-5 text-brand-800 dark:text-brand-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Log PO</span>
          </button>
          <button
            onClick={() => handleAction('/communications/new')}
            className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <MessageSquare className="h-5 w-5 text-brand-800 dark:text-brand-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Log Communication</span>
          </button>
          <button
            onClick={() => handleAction('/contacts/new')}
            className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
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
                className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Mic className="h-5 w-5 text-brand-800 dark:text-brand-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{canAccessAssistant ? 'Voice Agent' : 'Voice Log'}</span>
              </button>
              <button
                onClick={() => { setFabOpen(false); setConvoVoice({ scriptType: 'add_contact' }); }}
                className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <UserRound className="h-5 w-5 text-brand-800 dark:text-brand-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Voice: Add Contact</span>
              </button>
              <button
                onClick={() => { setFabOpen(false); setConvoVoice({ scriptType: 'add_surgeon' }); }}
                className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <Stethoscope className="h-5 w-5 text-brand-800 dark:text-brand-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Voice: Add Surgeon</span>
              </button>
              <button
                onClick={() => { setFabOpen(false); setConvoVoice({ scriptType: 'add_facility' }); }}
                className="flex min-h-touch items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
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

      <MicPermissionToast permission={permission} />

      <BottomNav />
    </div>
  );
}
