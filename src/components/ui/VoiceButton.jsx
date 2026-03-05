import { useState, useEffect } from 'react';
import { Mic, MicOff, Lock, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useVoice } from '@/hooks/useVoice';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

export default function VoiceButton({ onTranscript, size = 56, className, processing = false }) {
  const { isListening, transcript, startListening, stopListening, isSupported, error } = useVoice();
  const { canAccessAssistant } = useSubscription();
  const navigate = useNavigate();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (!isListening && transcript && onTranscript) {
      onTranscript(transcript);
    }
  }, [isListening, transcript, onTranscript]);

  function handleClick() {
    if (!canAccessAssistant) {
      navigate('/pricing');
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  if (!isSupported) return null;

  const isIdle = !isListening && !processing;
  const sizeStyle = { width: size, height: size };

  return (
    <div className={clsx('relative inline-flex flex-col items-center', className)}>
      {/* Live transcript bubble */}
      {isListening && transcript && (
        <div className="absolute bottom-full mb-2 max-w-[280px] rounded-xl bg-gray-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-gray-700">
          <span className="italic">{transcript}</span>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 h-2 w-2 bg-gray-900 dark:bg-gray-700" />
        </div>
      )}

      {/* Error flash */}
      {showError && error && (
        <div className="absolute bottom-full mb-2 max-w-[280px] rounded-xl bg-red-600 px-3 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}

      {/* Button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={processing}
        style={sizeStyle}
        className={clsx(
          'relative flex items-center justify-center rounded-full shadow-md transition-all active:scale-95',
          !canAccessAssistant && 'bg-gray-300 dark:bg-gray-600',
          canAccessAssistant && isIdle && 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
          canAccessAssistant && isListening && 'bg-brand-800 text-white',
          canAccessAssistant && processing && 'bg-brand-800/70 text-white',
          processing && 'cursor-wait'
        )}
        aria-label={
          !canAccessAssistant ? 'Voice logging is a Pro feature'
            : isListening ? 'Stop listening'
            : processing ? 'Processing voice input'
            : 'Start voice input'
        }
      >
        {/* Pulse ring while listening */}
        {isListening && (
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-800/30" />
        )}

        {!canAccessAssistant ? (
          <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        ) : processing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
