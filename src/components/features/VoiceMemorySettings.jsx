import { useState } from 'react';
import { Brain, Trash2, Trash, AlertTriangle } from 'lucide-react';
import { useAgentMemory } from '@/hooks/useAgentMemory';

const TYPE_LABELS = { preference: 'Preference', correction: 'Correction', shortcut: 'Shortcut', workflow: 'Workflow', pattern: 'Pattern' };
const TYPE_COLORS = {
  preference: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  correction: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  shortcut:   'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  workflow:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  pattern:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export default function VoiceMemorySettings() {
  const { memories, isLoading, deleteMemory, clearAllMemories } = useAgentMemory();
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [clearing, setClearing] = useState(false);

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await deleteMemory(id); } finally { setDeleting(null); }
  };

  const handleClearAll = async () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    setClearing(true);
    try { await clearAllMemories(); setConfirmClear(false); } finally { setClearing(false); }
  };

  if (isLoading) return <div className="py-6 text-center text-sm text-gray-400">Loading memories...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Voice Memory</span>
          {memories.length > 0 && (
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">{memories.length}</span>
          )}
        </div>
        {memories.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              confirmClear ? 'bg-red-500 text-white' : 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100'
            }`}
          >
            {confirmClear ? <><AlertTriangle className="w-3 h-3" />{clearing ? 'Clearing...' : 'Confirm clear all'}</> : <><Trash className="w-3 h-3" />Clear all</>}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        Your voice assistant learns from your sessions. Say <span className="italic">"remember that..."</span> anytime to save something.
      </p>

      {memories.length === 0 ? (
        <div className="py-8 text-center">
          <Brain className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No memories yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start a voice session and say "remember that..." to save something</p>
        </div>
      ) : (
        <div className="space-y-2">
          {memories.map((memory) => (
            <div key={memory.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[memory.memory_type] || TYPE_COLORS.pattern}`}>
                    {TYPE_LABELS[memory.memory_type] || memory.memory_type}
                  </span>
                  <span className="text-xs text-gray-400">{memory.source === 'explicit' ? 'You told me' : 'I learned this'}</span>
                  {memory.use_count > 0 && <span className="text-xs text-gray-400">· used {memory.use_count}x</span>}
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-100 font-medium">{memory.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{memory.key.replace(/_/g, ' ')}</p>
              </div>
              <button onClick={() => handleDelete(memory.id)} disabled={deleting === memory.id}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmClear && (
        <button onClick={() => setConfirmClear(false)} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">Cancel</button>
      )}
    </div>
  );
}
