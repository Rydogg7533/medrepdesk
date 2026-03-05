import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const DEFAULTS = {
  show_todays_cases: true,
  show_upcoming_cases: true,
  show_po_pipeline: true,
  show_metrics: true,
  show_action_items: true,
  show_recent_activity: true,
};

export function useDashboardPreferences() {
  const { user } = useAuth();
  const raw = user?.dashboard_preferences || {};
  return { ...DEFAULTS, ...raw };
}

export function useUpdateDashboardPreferences() {
  const { user, refreshUser } = useAuth();

  return useMutation({
    mutationFn: async (patch) => {
      const current = user?.dashboard_preferences || {};
      const merged = { ...current, ...patch };
      const { error } = await supabase
        .from('users')
        .update({ dashboard_preferences: merged })
        .eq('id', user.id);
      if (error) throw error;
      return merged;
    },
    onSuccess: () => {
      refreshUser();
    },
  });
}
