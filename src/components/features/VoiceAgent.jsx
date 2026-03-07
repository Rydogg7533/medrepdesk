import { useEffect, useRef } from 'react';
import { X, Mic, Loader2 } from 'lucide-react';
import { useVoiceAgent } from '@/hooks/useVoiceAgent';

export default function VoiceAgent({ isOpen, onClose }) {
  const agent = useVoiceAgent();
  const logEndRef = useRef(null);

  // Auto-connect when opened
  useEffect(() => {
    if (isOpen && agent.status === 'idle') {
      agent.connect();
    }
  }, [isOpen]);

  // Disconnect when closed
  useEffect(() => {
    if (!isOpen && agent.status === 'connected') {
      agent.disconnect();
    }
  }, [isOpen]);

  // Auto-scroll conversation log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agent.conversationLog, agent.aiText]);

  function handleClose() {
    agent.disconnect();
    onClose();
  }

  if (!isOpen) return null;

  const isConnecting = agent.status === 'connecting';
  const isConnected = agent.status === 'connected';
  const hasError = agent.status === 'error';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe-top pb-2">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm text-gray-400">
            {isConnecting ? 'Connecting...' : isConnected ? 'Listening' : hasError ? 'Error' : 'Idle'}
          </span>
        </div>
        {agent.minutesLimit > 0 && (
          <span className="text-xs text-gray-500">
            {Math.round(agent.minutesUsed)}/{agent.minutesLimit} min
          </span>
        )}
        <button
          onClick={handleClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Conversation log */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-lg flex-col gap-3">
          {agent.conversationLog.map((entry, i) => (
            <div
              key={i}
              className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  entry.role === 'user'
                    ? 'bg-brand-800 text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-200 rounded-bl-sm'
                }`}
              >
                {entry.text}
              </div>
            </div>
          ))}

          {/* Streaming AI text */}
          {agent.aiText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-gray-800 px-4 py-2.5 text-sm text-gray-200">
                {agent.aiText}
              </div>
            </div>
          )}

          {/* Empty state */}
          {agent.conversationLog.length === 0 && !agent.aiText && isConnected && (
            <div className="flex flex-col items-center gap-3 pt-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-800/20">
                <Mic className="h-8 w-8 text-brand-400" />
              </div>
              <p className="text-lg font-medium text-gray-300">Voice Agent Ready</p>
              <p className="text-sm text-gray-500 max-w-xs">
                Start speaking to schedule cases, log POs, check your pipeline, or manage contacts.
              </p>
            </div>
          )}

          <div ref={logEndRef} />
        </div>
      </div>

      {/* Bottom area */}
      <div className="px-4 pb-safe-bottom pt-3">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-3 pb-4">
          {/* Connecting state */}
          {isConnecting && (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Connecting to voice agent...</span>
            </div>
          )}

          {/* Waveform while connected */}
          {isConnected && (
            <div className="flex items-center gap-1.5 h-10">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-brand-600"
                  style={{
                    animation: `va-wave 1s ease-in-out ${i * 0.1}s infinite alternate`,
                    height: '8px',
                  }}
                />
              ))}
            </div>
          )}

          {/* Error state */}
          {hasError && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-red-400 text-center">{agent.error}</p>
              <button
                onClick={() => agent.connect()}
                className="rounded-full bg-brand-800 px-6 py-2.5 text-sm font-medium text-white"
              >
                Try Again
              </button>
            </div>
          )}

          {/* End session button */}
          {isConnected && (
            <button
              onClick={handleClose}
              className="rounded-full bg-red-600 px-8 py-3 text-sm font-medium text-white transition-all active:scale-95"
            >
              End Session
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes va-wave {
          0% { height: 6px; }
          100% { height: 28px; }
        }
      `}</style>
    </div>
  );
}
