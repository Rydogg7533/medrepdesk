import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Spinner from '@/components/ui/Spinner';
import { idbPersister } from '@/lib/queryPersist';

// Auth pages
import SignUp from '@/pages/SignUp';
import SignIn from '@/pages/SignIn';
import ForgotPassword from '@/pages/ForgotPassword';
import AuthCallback from '@/pages/AuthCallback';
import ResetPassword from '@/pages/ResetPassword';

// Beta Program pages
import BetaLanding from '@/pages/BetaLanding';
import BugReportPortal from '@/pages/BugReportPortal';
import FeatureRequestPortal from '@/pages/FeatureRequestPortal';
import BetaDashboard from '@/pages/BetaDashboard';
import BetaScheduler from '@/pages/BetaScheduler';
import FeatureBacklog from '@/pages/FeatureBacklog';

// App pages
import Dashboard from '@/pages/Dashboard';
import Cases from '@/pages/Cases';
import CaseDetail from '@/pages/CaseDetail';
import CaseForm from '@/pages/CaseForm';
import Contacts from '@/pages/Contacts';
import ContactDetail from '@/pages/ContactDetail';
import ContactForm from '@/pages/ContactForm';
import Money from '@/pages/Money';
import PODetail from '@/pages/PODetail';
import POForm from '@/pages/POForm';
import CommissionDetail from '@/pages/CommissionDetail';
import CommissionForm from '@/pages/CommissionForm';
import CommunicationForm from '@/pages/CommunicationForm';
import More from '@/pages/More';
import Distributors from '@/pages/Distributors';
import DistributorDetail from '@/pages/DistributorDetail';
import DistributorForm from '@/pages/DistributorForm';
import Facilities from '@/pages/Facilities';
import FacilityForm from '@/pages/FacilityForm';
import Surgeons from '@/pages/Surgeons';
import SurgeonForm from '@/pages/SurgeonForm';
import ContactImport from '@/pages/ContactImport';
import ManufacturerForm from '@/pages/ManufacturerForm';
import Notifications from '@/pages/Notifications';
import Pricing from '@/pages/Pricing';
import Settings from '@/pages/Settings';
import Referrals from '@/pages/Referrals';
import JoinReferral from '@/pages/JoinReferral';
import Landing from '@/pages/Landing';
import MyDistributor from '@/pages/MyDistributor';
import BillSheetForm from '@/pages/BillSheetForm';
import BillSheetDetail from '@/pages/BillSheetDetail';
import ActionItems from '@/pages/ActionItems';
import Export from '@/pages/Export';
import FAQ from '@/pages/FAQ';
import PayPeriodSummary from '@/pages/PayPeriodSummary';
import Onboarding from '@/pages/Onboarding';
import TermsOfService from '@/pages/legal/TermsOfService';
import PrivacyPolicy from '@/pages/legal/PrivacyPolicy';
import Blog from '@/pages/Blog';
import BlogPost from '@/pages/BlogPost';
import SubscriptionGate from '@/components/SubscriptionGate';
import ThemeLoader from '@/components/ThemeLoader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24, // 24h — keep data for offline
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

function PublicRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function LandingRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

function PlaceholderPage({ title }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Coming soon</p>
    </div>
  );
}

function BetaAnnouncementBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('beta_bar_dismissed') === '1');

  const show = !dismissed && location.pathname === '/';

  if (show) {
    document.body.style.paddingTop = '40px';
  } else {
    document.body.style.paddingTop = '';
  }

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        zIndex: 1000,
        backgroundColor: '#d4a843',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.03em',
        color: '#09090f',
      }}
    >
      <span>⚡ Early access is open — 10 spots remaining.</span>
      <button
        onClick={() => navigate('/beta')}
        style={{
          background: 'none',
          border: '1px solid #09090f',
          borderRadius: 4,
          padding: '2px 10px',
          cursor: 'pointer',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.03em',
          color: '#09090f',
          textDecoration: 'none',
        }}
      >
        Apply now →
      </button>
      <button
        onClick={() => {
          localStorage.setItem('beta_bar_dismissed', '1');
          setDismissed(true);
          document.body.style.paddingTop = '';
        }}
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          color: '#09090f',
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: idbPersister, maxAge: 1000 * 60 * 60 * 24 }}>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
            <ToastProvider>
            <ThemeLoader />
            <BetaAnnouncementBar />
            <Routes>
            {/* Auth routes (no AppLayout) */}
            <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/join" element={<JoinReferral />} />
            <Route path="/" element={<LandingRoute />} />

            {/* Public pages (no auth) */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />

            {/* Beta Program pages (public, no auth) */}
            <Route path="/beta" element={<BetaLanding />} />
            <Route path="/beta/bugs" element={<BugReportPortal />} />
            <Route path="/beta/features" element={<FeatureRequestPortal />} />
            <Route path="/beta/dashboard" element={<BetaDashboard />} />
            <Route path="/beta/schedule" element={<BetaScheduler />} />
            <Route path="/admin/features" element={<FeatureBacklog />} />

            {/* Onboarding (protected, no AppLayout) */}
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            {/* Pricing — protected with AppLayout but outside SubscriptionGate so canceled users can reach it */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/pricing" element={<Pricing />} />
            </Route>

            {/* Protected routes with AppLayout */}
            <Route element={<ProtectedRoute><SubscriptionGate><AppLayout /></SubscriptionGate></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cases" element={<Cases />} />
              <Route path="/cases/new" element={<CaseForm />} />
              <Route path="/cases/:id" element={<CaseDetail />} />
              <Route path="/cases/:id/edit" element={<CaseForm />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/new" element={<ContactForm />} />
              <Route path="/contacts/:id" element={<ContactDetail />} />
              <Route path="/contacts/:id/edit" element={<ContactForm />} />
              <Route path="/contacts/import" element={<ContactImport />} />
              <Route path="/money" element={<Money />} />
              <Route path="/po/new" element={<POForm />} />
              <Route path="/po/:id" element={<PODetail />} />
              <Route path="/po/:id/edit" element={<POForm />} />
              <Route path="/commissions/new" element={<CommissionForm />} />
              <Route path="/commissions/:id" element={<CommissionDetail />} />
              <Route path="/commissions/:id/edit" element={<CommissionForm />} />
              <Route path="/pay-periods/:id" element={<PayPeriodSummary />} />
              <Route path="/communications/new" element={<CommunicationForm />} />
              <Route path="/more" element={<More />} />
              <Route path="/distributors" element={<Distributors />} />
              <Route path="/distributors/new" element={<DistributorForm />} />
              <Route path="/distributors/:id" element={<DistributorDetail />} />
              <Route path="/distributors/:id/edit" element={<DistributorForm />} />
              <Route path="/facilities" element={<Facilities />} />
              <Route path="/facilities/new" element={<FacilityForm />} />
              <Route path="/facilities/:id/edit" element={<FacilityForm />} />
              <Route path="/surgeons" element={<Surgeons />} />
              <Route path="/surgeons/new" element={<SurgeonForm />} />
              <Route path="/surgeons/:id/edit" element={<SurgeonForm />} />
              <Route path="/manufacturers/new" element={<ManufacturerForm />} />
              <Route path="/manufacturers/:id" element={<ManufacturerForm />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/my-distributor" element={<MyDistributor />} />
              <Route path="/bill-sheet" element={<BillSheetForm />} />
              <Route path="/bill-sheets/:caseId" element={<BillSheetDetail />} />
              <Route path="/action-items" element={<ActionItems />} />
              <Route path="/export" element={<Export />} />
              <Route path="/faq" element={<FAQ />} />
            </Route>
          </Routes>
          </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </PersistQueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
