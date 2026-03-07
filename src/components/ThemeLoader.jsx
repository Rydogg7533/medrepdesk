import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeLoader() {
  const { user, account } = useAuth();
  const { applyUserTheme } = useTheme();

  useEffect(() => {
    if (!user) return;
    const locked = account?.theme_locked;
    const prefs = locked ? (account?.account_theme || {}) : (user?.theme_preferences || {});
    if (Object.keys(prefs).length > 0) {
      applyUserTheme(prefs);
    }
  }, [user, account, applyUserTheme]);

  return null;
}
