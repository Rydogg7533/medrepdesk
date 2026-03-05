import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import DOMPurify from 'dompurify';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

async function fetchUserAndAccount(userId) {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .select('*, account:accounts(*)')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUserData = useCallback(async (sess) => {
    if (!sess?.user) {
      setSession(null);
      setUser(null);
      setAccount(null);
      setLoading(false);
      return;
    }

    try {
      setSession(sess);
      const userData = await fetchUserAndAccount(sess.user.id);
      setUser(userData);
      setAccount(userData.account);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      loadUserData(sess);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
        loadUserData(sess);
      } else if (_event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setAccount(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signUp = async ({ email, password, fullName, referralCode }) => {
    const sanitizedName = DOMPurify.sanitize(fullName.trim());
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: sanitizedName,
          ...(referralCode && { referred_by: referralCode.trim().toUpperCase() }),
        },
      },
    });
    if (signUpError) throw signUpError;
    return data;
  };

  const signIn = async ({ email, password }) => {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
    return data;
  };

  const signInWithGoogle = async (referralCode) => {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        ...(referralCode && {
          data: { referred_by: referralCode.trim().toUpperCase() },
        }),
      },
    });
    if (oauthError) throw oauthError;
  };

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
  };

  const refreshUser = useCallback(async () => {
    if (session?.user) {
      try {
        const userData = await fetchUserAndAccount(session.user.id);
        setUser(userData);
        setAccount(userData.account);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
  }, [session]);

  const value = {
    session,
    user,
    account,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
