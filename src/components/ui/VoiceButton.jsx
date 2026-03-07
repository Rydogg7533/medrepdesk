import { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useVoice } from '@/hooks/useVoice';

export default function VoiceButton({ onTranscript, size = 56, className, processing: externalProcessing = false }) {
  const {
    isListening,
    isProcessing,
    transcript,
    startListening,
    stopListening,
    isSupported,
    error,
    minutesUsed,
    minutesLimit,
    useOpenAI,
  } = useVoice();
  const [showError, setShowError] = useState(false);

  const processing = externalProcessing || isProcessing;
  const nearLimit = useOpenAI && minutesLimit > 0 && minutesUsed / minutesLimit > 0.8;
  const atLimit = useOpenAI && minutesLimit > 0 && minutesUsed >= minutesLimit;

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (!isListening && !isProcessing && transcript && onTranscript) {
      onTranscript(transcript);
    }
  }, [isListening, isProcessing, transcript, onTranscript]);

  function handleClick() {
    if (atLimit) return;
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
        disabled={processing || atLimit}
        style={sizeStyle}
        className={clsx(
          'relative flex items-center justify-center rounded-full shadow-md transition-all active:scale-95',
          atLimit && 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400',
          !atLimit && isIdle && !nearLimit && 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
          !atLimit && isIdle && nearLimit && 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
          isListening && 'bg-brand-800 text-white',
          processing && 'bg-brand-800/70 text-white cursor-wait',
        )}
        aria-label={
          atLimit ? 'Voice limit reached'
            : isListening ? 'Stop listening'
            : processing ? 'Processing voice input'
            : 'Start voice input'
        }
        title={atLimit ? `Voice limit reached (${Math.round(minutesUsed)}/${minutesLimit} min)` : undefined}
      >
        {/* Pulse ring while listening */}
        {isListening && (
          <span className="absolute inset-0 animate-ping rounded-full bg-brand-800/30" />
        )}

        {processing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </button>

      {/* Minutes indicator for OpenAI users */}
      {useOpenAI && minutesLimit > 0 && !isListening && !processing && (
        <span className={clsx(
          'mt-1 text-[9px] font-medium',
          atLimit ? 'text-red-500' : nearLimit ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
        )}>
          {Math.round(minutesUsed)}/{minutesLimit}m
        </span>
      )}
    </div>
  );
}
