import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useAgentMemory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ['agent-memory', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_memory')
        .select('*')
        .eq('user_id', user.id)
        .order('use_count', { ascending: false })
        .order('last_used_at', { ascending: false, nullsLast: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const buildMemoryBlock = () => {
    if (!memories.length) return '';
    const top = memories.slice(0, 20);
    const lines = top.map((m) => {
      switch (m.memory_type) {
        case 'correction': return `- When the rep says "${m.key.replace(/_/g, ' ')}", they mean: ${m.value}`;
        case 'shortcut':   return `- "${m.key.replace(/_/g, ' ')}" refers to: ${m.value}`;
        case 'preference': return `- Rep preference: ${m.value}`;
        case 'pattern':    return `- Known pattern: ${m.value}`;
        case 'workflow':   return `- Workflow habit: ${m.value}`;
        default:           return `- ${m.key}: ${m.value}`;
      }
    });
    return lines.join('\n');
  };

  const saveMemory = useMutation({
    mutationFn: async ({ key, value, memory_type = 'preference', source = 'explicit' }) => {
      const { data: userData } = await supabase
        .from('users').select('account_id').eq('id', user.id).single();
      const { data, error } = await supabase
        .from('agent_memory')
        .upsert({
          account_id: userData.account_id,
          user_id: user.id,
          memory_type,
          key,
          value,
          source,
          confidence: source === 'explicit' ? 1.0 : 0.7,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,key' })
        .select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-memory', user?.id] }),
  });

  const deleteMemory = useMutation({
    mutationFn: async (memoryId) => {
      const { error } = await supabase
        .from('agent_memory').delete().eq('id', memoryId).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-memory', user?.id] }),
  });

  const clearAllMemories = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('agent_memory').delete().eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-memory', user?.id] }),
  });

  const markMemoryUsed = async (key) => {
    const memory = memories.find((m) => m.key === key);
    if (!memory) return;
    await supabase.from('agent_memory').update({
      use_count: (memory.use_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    }).eq('id', memory.id);
  };

  return {
    memories,
    isLoading,
    buildMemoryBlock,
    saveMemory: saveMemory.mutateAsync,
    deleteMemory: deleteMemory.mutateAsync,
    clearAllMemories: clearAllMemories.mutateAsync,
    markMemoryUsed,
  };
}
