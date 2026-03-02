import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Spinner from '@/components/ui/Spinner';

// Auth pages
import SignUp from '@/pages/SignUp';
import SignIn from '@/pages/SignIn';
import ForgotPassword from '@/pages/ForgotPassword';
import AuthCallback from '@/pages/AuthCallback';

// App pages
import Dashboard from '@/pages/Dashboard';
import Cases from '@/pages/Cases';
import CaseDetail from '@/pages/CaseDetail';
import CaseForm from '@/pages/CaseForm';
import Contacts from '@/pages/Contacts';
import ContactDetail from '@/pages/ContactDetail';
import ContactForm from '@/pages/ContactForm';
import Money from '@/pages/Money';
import More from '@/pages/More';
import Distributors from '@/pages/Distributors';
import DistributorDetail from '@/pages/DistributorDetail';
import DistributorForm from '@/pages/DistributorForm';
import Facilities from '@/pages/Facilities';
import FacilityForm from '@/pages/FacilityForm';
import Surgeons from '@/pages/Surgeons';
import SurgeonForm from '@/pages/SurgeonForm';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
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
    return <Navigate to="/" replace />;
  }

  return children;
}

function PlaceholderPage({ title }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">Coming soon</p>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth routes (no AppLayout) */}
            <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected routes with AppLayout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cases" element={<Cases />} />
              <Route path="/cases/new" element={<CaseForm />} />
              <Route path="/cases/:id" element={<CaseDetail />} />
              <Route path="/cases/:id/edit" element={<CaseForm />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/contacts/new" element={<ContactForm />} />
              <Route path="/contacts/:id" element={<ContactDetail />} />
              <Route path="/contacts/:id/edit" element={<ContactForm />} />
              <Route path="/money" element={<Money />} />
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
              <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
              <Route path="/referrals" element={<PlaceholderPage title="Referrals" />} />
              <Route path="/notifications" element={<PlaceholderPage title="Notifications" />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
