import { useState, useEffect } from 'react';
import { Mic, X } from 'lucide-react';

const STORAGE_KEY = 'mrd_mic_tooltip_shown';

export default function MicPermissionToast({ permission }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (permission === 'granted' && !localStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [permission]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-fade-in">
      <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-700 flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center mt-0.5">
          <Mic className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Microphone ready</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            MedRepDesk holds your mic permission open so voice sessions start instantly.
            We never record audio unless you're actively in a session.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
