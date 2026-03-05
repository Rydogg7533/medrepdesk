import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { TABLES } from '@/lib/tables';

const DEFAULTS = {
  assistant_name: 'Max',
  voice_index: 0,
  speaking_rate: 1.0,
  confirmation_style: 'brief',
  enabled: true,
};

export function useVoicePreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['voice_preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('voice_preferences')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return { ...DEFAULTS, ...(data?.voice_preferences || {}) };
    },
    enabled: !!user?.id,
    placeholderData: DEFAULTS,
  });
}

export function useUpdateVoicePreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (prefs) => {
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .update({ voice_preferences: prefs, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('voice_preferences')
        .single();
      if (error) throw error;
      return data.voice_preferences;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['voice_preferences', user.id], { ...DEFAULTS, ...data });
    },
  });
}

export { DEFAULTS as VOICE_DEFAULTS };
