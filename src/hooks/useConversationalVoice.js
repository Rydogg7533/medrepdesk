import { useState, useRef, useCallback, useEffect } from 'react';
import { useVoice } from '@/hooks/useVoice';
import { useVoicePreferences, VOICE_DEFAULTS } from '@/hooks/useVoicePreferences';

export function useConversationalVoice({ script, onComplete, onCancel }) {
  const { data: prefs = VOICE_DEFAULTS } = useVoicePreferences();
  const { isListening, transcript, startListening, stopListening, isSupported, error: voiceError } = useVoice();

  const [stepIndex, setStepIndex] = useState(-1); // -1 = not started
  const [collected, setCollected] = useState({});
  const [conversationLog, setConversationLog] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | speaking | listening | confirming | done
  const phaseRef = useRef(phase);
  const utteranceRef = useRef(null);
  const prevListeningRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!prefs.enabled || !window.speechSynthesis) {
        addToLog('assistant', text);
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = prefs.speaking_rate || 1.0;
      utterance.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0 && prefs.voice_index < voices.length) {
        utterance.voice = voices[prefs.voice_index];
      }

      utterance.onstart = () => {
        if (mountedRef.current) setIsSpeaking(true);
      };
      utterance.onend = () => {
        if (mountedRef.current) setIsSpeaking(false);
        utteranceRef.current = null;
        resolve();
      };
      utterance.onerror = () => {
        if (mountedRef.current) setIsSpeaking(false);
        utteranceRef.current = null;
        resolve();
      };

      utteranceRef.current = utterance;
      addToLog('assistant', text);
      window.speechSynthesis.speak(utterance);
    });
  }, [prefs]);

  function addToLog(role, text) {
    setConversationLog((prev) => [...prev, { role, text, time: Date.now() }]);
  }

  const askStep = useCallback(async (index) => {
    if (index >= script.length) {
      setPhase('confirming');
      await readBackConfirmation();
      return;
    }

    const step = script[index];
    setStepIndex(index);
    setPhase('speaking');

    await speak(step.question);

    if (mountedRef.current) {
      setPhase('listening');
      startListening();
    }
  }, [script, speak, startListening]);

  const readBackConfirmation = useCallback(async () => {
    const name = prefs.assistant_name || 'Max';
    const style = prefs.confirmation_style || 'brief';

    function formatForSpeech(value) {
      const digits = String(value).replace(/\D/g, '');
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      return value;
    }

    let summary;
    if (style === 'brief') {
      const entries = script
        .filter((s) => collected[s.field])
        .map((s) => formatForSpeech(collected[s.field]));
      summary = `Got it. I have: ${entries.join(', ')}. Should I save this?`;
    } else {
      const entries = script
        .filter((s) => collected[s.field])
        .map((s) => `${s.field.replace(/_/g, ' ')}: ${formatForSpeech(collected[s.field])}`);
      summary = `Here's what I have. ${entries.join('. ')}. Should I save this?`;
    }

    setPhase('speaking');
    await speak(summary);

    if (mountedRef.current) {
      setPhase('listening');
      startListening();
    }
  }, [script, collected, prefs, speak, startListening]);

  // Handle transcript when listening finishes
  useEffect(() => {
    if (prevListeningRef.current && !isListening && transcript) {
      handleResponse(transcript);
    }
    prevListeningRef.current = isListening;
  }, [isListening]);

  function handleResponse(text) {
    if (!text?.trim()) return;

    const lower = text.toLowerCase().trim();
    addToLog('user', text);

    // Navigation commands
    if (lower === 'cancel' || lower === 'stop' || lower === 'nevermind' || lower === 'never mind') {
      setPhase('idle');
      setStepIndex(-1);
      if (onCancel) onCancel();
      return;
    }

    if (phaseRef.current === 'confirming') {
      const DENY_WORDS = ['no', 'nope', 'wrong', 'incorrect', 'start over', 'redo', 'go back'];
      const isDeny = DENY_WORDS.some((w) => lower.includes(w));

      if (isDeny) {
        setCollected({});
        setConversationLog([]);
        askStep(0);
        return;
      }

      const CONFIRM_WORDS = ['yes', 'yeah', 'yep', 'yup', 'correct', "that's right", 'thats right', 'save', 'confirm', 'sure', 'do it', 'looks good', 'perfect'];
      const isConfirm = CONFIRM_WORDS.some((w) => lower.includes(w));

      if (isConfirm) {
        setPhase('done');
        if (onComplete) onComplete(collected);
        return;
      }

      // Didn't understand, re-ask
      speak('Sorry, should I save this? Say yes or no.').then(() => {
        if (mountedRef.current) {
          setPhase('confirming');
          startListening();
        }
      });
      return;
    }

    if (lower === 'skip' || lower === 'next') {
      const step = script[stepIndex];
      if (step && !step.required) {
        askStep(stepIndex + 1);
      } else {
        speak('This field is required. Please provide a value.').then(() => {
          if (mountedRef.current) {
            setPhase('listening');
            startListening();
          }
        });
      }
      return;
    }

    if (lower === 'go back' || lower === 'back' || lower === 'previous') {
      if (stepIndex > 0) {
        askStep(stepIndex - 1);
      } else {
        speak("We're already on the first question.").then(() => {
          if (mountedRef.current) {
            setPhase('listening');
            startListening();
          }
        });
      }
      return;
    }

    // Validate and store
    const step = script[stepIndex];
    if (!step) return;

    if (step.validator) {
      const result = step.validator(text);
      if (result.error) {
        speak(result.error).then(() => {
          if (mountedRef.current) {
            setPhase('listening');
            startListening();
          }
        });
        return;
      }
      setCollected((prev) => ({ ...prev, [step.field]: result.value ?? text }));
    } else {
      setCollected((prev) => ({ ...prev, [step.field]: text }));
    }

    askStep(stepIndex + 1);
  }

  function start() {
    setCollected({});
    setConversationLog([]);
    const name = prefs.assistant_name || 'Max';
    speak(`Hi, I'm ${name}. Let's get started.`).then(() => {
      if (mountedRef.current) askStep(0);
    });
  }

  function reset() {
    window.speechSynthesis.cancel();
    setStepIndex(-1);
    setCollected({});
    setConversationLog([]);
    setPhase('idle');
    if (isListening) stopListening();
  }

  const currentStep = stepIndex >= 0 && stepIndex < script.length ? script[stepIndex] : null;
  const progress = script.length > 0 ? Math.min((stepIndex + 1) / script.length, 1) : 0;

  return {
    start,
    reset,
    phase,
    isSpeaking,
    isListening,
    transcript,
    currentStep,
    stepIndex,
    collected,
    conversationLog,
    progress,
    isSupported,
    voiceError,
  };
}
