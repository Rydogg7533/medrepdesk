import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Spinner from '@/components/ui/Spinner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const type = params.get('type');
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      const hashType = hashParams.get('type');

      const isRecovery = type === 'recovery' || hashType === 'recovery';

      try {
        // PKCE flow: exchange code for session
        if (code) {
          const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          if (data?.session) {
            navigate(isRecovery ? '/reset-password' : '/dashboard', { replace: true });
            return;
          }
          if (codeError) console.error('Code exchange failed:', codeError.message);
        }

        // Hash fragment flow
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            navigate(isRecovery ? '/reset-password' : '/dashboard', { replace: true });
            return;
          }
        }

        // Fallback: check existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate(isRecovery ? '/reset-password' : '/dashboard', { replace: true });
          return;
        }

        // Last resort: wait for auth state change
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (session) {
            navigate(isRecovery ? '/reset-password' : '/dashboard', { replace: true });
            subscription.unsubscribe();
          }
        });

        setTimeout(() => {
          subscription.unsubscribe();
          setError('Sign in timed out. Please try again.');
          setTimeout(() => navigate('/signin', { replace: true }), 2000);
        }, 5000);
      } catch (err) {
        console.error('Auth callback exception:', err);
        setError(err.message);
        setTimeout(() => navigate('/signin', { replace: true }), 2000);
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
