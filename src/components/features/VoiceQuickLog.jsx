import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Loader2, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import { useVoice } from '@/hooks/useVoice';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { executeVoiceAction } from '@/lib/voiceActions';
import { canUseAIExtraction } from '@/utils/planLimits';

const INTENT_LABELS = {
  schedule_case: 'Case',
  update_case: 'Case Update',
  log_chase: 'Chase',
  log_po_received: 'PO Received',
  log_commission: 'Commission',
  log_communication: 'Communication',
  add_contact: 'Contact',
  status_query: 'Query',
  quick_status: 'Status',
};

const INTENT_COLORS = {
  schedule_case: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  log_chase: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  log_commission: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  log_communication: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const EDITABLE_INTENTS = {
  schedule_case: '/cases/new',
  log_communication: '/communications/new',
};

export default function VoiceQuickLog({ isOpen, onClose }) {
  const { account, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isListening, transcript, startListening, stopListening, isSupported, error: voiceError } = useVoice();

  const [step, setStep] = useState('idle'); // idle | listening | processing | result | saving | error
  const [capturedTranscript, setCapturedTranscript] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState('');

  const parseMutation = useMutation({
    mutationFn: async (text) => {
      const { data, error } = await supabase.functions.invoke('voice-command', {
        body: {
          transcript: text,
          account_id: account?.id,
          context: { currentDate: new Date().toISOString().split('T')[0] },
        },
      });
      if (error) throw new Error(error.message || 'Parsing failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });

  const handleTranscript = useCallback(async (text) => {
    if (!text?.trim()) {
      setStep('idle');
      return;
    }
    setCapturedTranscript(text);
    setStep('processing');
    setParseError('');

    try {
      const result = await parseMutation.mutateAsync(text);
      setParsed(result);
      setStep('result');
    } catch (err) {
      setParseError(err.message);
      setStep('error');
    }
  }, [parseMutation]);

  function handleStartListening() {
    if (!canUseAIExtraction(account)) {
      setParseError('AI extraction limit reached. Please upgrade your plan.');
      setStep('error');
      return;
    }
    setParsed(null);
    setParseError('');
    setCapturedTranscript('');
    setStep('listening');
    startListening();
  }

  function handleStopListening() {
    stopListening();
  }

  async function handleConfirmSave() {
    if (!parsed) return;
    setStep('saving');

    try {
      const result = await executeVoiceAction(parsed, account.id, user.id, supabase);
      if (result.success) {
        toast({ message: result.message, type: 'success' });
        queryClient.invalidateQueries({ queryKey: ['cases'] });
        queryClient.invalidateQueries({ queryKey: ['chase_log'] });
        queryClient.invalidateQueries({ queryKey: ['commissions'] });
        queryClient.invalidateQueries({ queryKey: ['communications'] });
        handleClose();
      } else {
        setParseError(result.message);
        setStep('error');
      }
    } catch (err) {
      setParseError(err.message);
      setStep('error');
    }
  }

  function handleEditManually() {
    const intent = parsed?.intent;
    const route = EDITABLE_INTENTS[intent];
    if (route) {
      navigate(route);
    }
    handleClose();
  }

  function handleClose() {
    if (isListening) stopListening();
    setStep('idle');
    setParsed(null);
    setParseError('');
    setCapturedTranscript('');
    onClose();
  }

  // When voice stops listening, process the transcript
  // Using a ref to track previous listening state avoids render-phase side effects
  const prevListeningRef = useRef(isListening);
  if (prevListeningRef.current && !isListening && step === 'listening') {
    if (transcript) {
      // Defer to avoid setState during render
      setTimeout(() => handleTranscript(transcript), 0);
    } else {
      setTimeout(() => setStep('idle'), 0);
    }
  }
  prevListeningRef.current = isListening;

  const relevantFields = parsed?.fields
    ? Object.entries(parsed.fields).filter(([, v]) => v != null && v !== '')
    : [];

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Voice Log" fullHeight>
      <div className="flex flex-col items-center gap-6 py-4">
        {/* Idle / Listening state */}
        {(step === 'idle' || step === 'listening') && (
          <>
            {/* Waveform animation */}
            {step === 'listening' && (
              <div className="flex items-center gap-1 h-10">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-brand-800 dark:bg-brand-400"
                    style={{
                      animation: `voice-wave 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                      height: '16px',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Live transcript */}
            {step === 'listening' && transcript && (
              <div className="max-w-full rounded-xl bg-gray-100 dark:bg-gray-700 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 italic">
                {transcript}
              </div>
            )}

            {/* Mic button */}
            <button
              onClick={step === 'listening' ? handleStopListening : handleStartListening}
              className={`flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
                step === 'listening'
                  ? 'bg-red-500 text-white'
                  : 'bg-brand-800 text-white'
              }`}
            >
              {step === 'listening' ? (
                <>
                  <span className="absolute h-20 w-20 animate-ping rounded-full bg-red-500/30" />
                  <MicOff className="relative h-8 w-8" />
                </>
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </button>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              {step === 'listening' ? 'Listening... tap to stop' : 'Tap to speak'}
            </p>

            {voiceError && (
              <p className="text-sm text-red-500">{voiceError}</p>
            )}

            {!isSupported && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Voice input is not supported in this browser.
              </p>
            )}
          </>
        )}

        {/* Processing state */}
        {step === 'processing' && (
          <>
            <div className="rounded-xl bg-gray-100 dark:bg-gray-700 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 w-full">
              "{capturedTranscript}"
            </div>
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-brand-800 dark:text-brand-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Parsing with AI...</p>
            </div>
          </>
        )}

        {/* Result state */}
        {step === 'result' && parsed && (
          <div className="flex w-full flex-col gap-4">
            {/* Transcript */}
            <div className="rounded-xl bg-gray-100 dark:bg-gray-700 px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">Heard: </span>
              "{capturedTranscript}"
            </div>

            {/* Confirmation message */}
            <div className="rounded-xl bg-brand-800/5 dark:bg-brand-400/10 px-4 py-3">
              <p className="text-sm font-medium text-brand-800 dark:text-brand-400">
                {parsed.confirmation_message || 'Parsed successfully'}
              </p>
            </div>

            {/* Intent badge */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                INTENT_COLORS[parsed.intent] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {INTENT_LABELS[parsed.intent] || parsed.intent}
              </span>
              {parsed.confidence != null && (
                <span className="text-xs text-gray-400">
                  {Math.round(parsed.confidence * 100)}% confident
                </span>
              )}
            </div>

            {/* Fields summary */}
            {relevantFields.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700">
                {relevantFields.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 text-right max-w-[60%] truncate">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Ambiguities */}
            {parsed.ambiguities?.length > 0 && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Needs Review</span>
                </div>
                <ul className="text-xs text-amber-600 dark:text-amber-400 list-disc list-inside">
                  {parsed.ambiguities.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {EDITABLE_INTENTS[parsed.intent] && (
                <Button variant="secondary" fullWidth onClick={handleEditManually}>
                  Edit Manually
                </Button>
              )}
              <Button fullWidth onClick={handleConfirmSave}>
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Confirm & Save
              </Button>
            </div>
          </div>
        )}

        {/* Saving state */}
        {step === 'saving' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-brand-800 dark:text-brand-400" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Saving...</p>
          </div>
        )}

        {/* Error state */}
        {step === 'error' && (
          <div className="flex w-full flex-col items-center gap-4 py-4">
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 w-full text-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 dark:text-red-400">{parseError || 'Something went wrong'}</p>
            </div>
            <Button variant="secondary" onClick={() => setStep('idle')}>
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* CSS for waveform animation */}
      <style>{`
        @keyframes voice-wave {
          0% { height: 8px; }
          100% { height: 32px; }
        }
      `}</style>
    </BottomSheet>
  );
}
