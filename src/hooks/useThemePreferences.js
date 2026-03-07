import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

const DEFAULTS = {
  bg_type: 'color',
  bg_color: '#f8fafc',
  bg_gradient: null,
  bg_image_url: null,
  overlay_opacity: 0.5,
  card_opacity: 1.0,
  auto_text_color: true,
  accent_color: '#0F4C81',
};

export function useThemePreferences() {
  const { user, account } = useAuth();
  const locked = account?.theme_locked;
  const raw = locked ? (account?.account_theme || {}) : (user?.theme_preferences || {});
  return { ...DEFAULTS, ...raw, locked: !!locked };
}

export function useUpdateThemePreferences() {
  const { user, refreshUser } = useAuth();

  return useMutation({
    mutationFn: async (updates) => {
      const current = user?.theme_preferences || {};
      const merged = { ...current, ...updates };
      const { error } = await supabase
        .from(TABLES.USERS)
        .update({ theme_preferences: merged })
        .eq('id', user.id);
      if (error) throw error;
      return merged;
    },
    onSuccess: () => {
      refreshUser();
    },
  });
}

export { DEFAULTS as THEME_DEFAULTS };
