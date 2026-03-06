import { useReducer, useRef, useCallback, useEffect } from 'react';
import { useVoice } from '@/hooks/useVoice';
import { useVoicePreferences, VOICE_DEFAULTS } from '@/hooks/useVoicePreferences';
import { pickBestVoice } from '@/utils/pickBestVoice';

const CONFIRM_WORDS = ['yes', 'yeah', 'yep', 'yup', 'correct', "that's right", 'thats right', 'save', 'confirm', 'sure', 'do it', 'looks good', 'perfect'];
const DENY_WORDS = ['no', 'nope', 'wrong', 'incorrect', 'start over', 'redo', 'go back'];
const CANCEL_WORDS = ['cancel', 'stop', 'nevermind', 'never mind'];

const initialState = {
  phase: 'idle', // idle | speaking | listening | confirming | done
  stepIndex: -1,
  collected: {},
  conversationLog: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...initialState, phase: 'speaking', stepIndex: -1, conversationLog: [] };
    case 'ASK_STEP':
      return { ...state, phase: 'speaking', stepIndex: action.index };
    case 'LISTEN':
      return { ...state, phase: 'listening' };
    case 'START_CONFIRM':
      return { ...state, phase: 'confirming' };
    case 'SPEAK_CONFIRM':
      return { ...state, phase: 'speaking' };
    case 'SET_FIELD':
      return { ...state, collected: { ...state.collected, [action.field]: action.value } };
    case 'SET_COLLECTED':
      return { ...state, collected: action.collected };
    case 'ADD_LOG':
      return { ...state, conversationLog: [...state.conversationLog, { role: action.role, text: action.text, time: Date.now() }] };
    case 'CONFIRM_SAVE':
      return { ...state, phase: 'done' };
    case 'RESTART':
      return { ...initialState, phase: 'speaking', conversationLog: [] };
    case 'CANCEL':
      return { ...initialState };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function useConversationalVoice({ script, onComplete, onCancel, onAllAnswered }) {
  const { data: prefs = VOICE_DEFAULTS } = useVoicePreferences();
  const { isListening, transcript, startListening, stopListening, isSupported, error: voiceError } = useVoice();

  const [state, dispatch] = useReducer(reducer, initialState);
  // isSpeaking needs to trigger re-renders, so keep it as a ref + forceUpdate
  const isSpeakingRef = useRef(false);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const setIsSpeaking = useCallback((val) => {
    isSpeakingRef.current = val;
    forceUpdate();
  }, []);

  const utteranceRef = useRef(null);
  const prevListeningRef = useRef(false);
  const mountedRef = useRef(true);
  const onCompleteRef = useRef(onComplete);
  const onCancelRef = useRef(onCancel);
  const onAllAnsweredRef = useRef(onAllAnswered);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onAllAnsweredRef.current = onAllAnswered; }, [onAllAnswered]);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      dispatch({ type: 'ADD_LOG', role: 'assistant', text });

      if (!prefs.enabled || !window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = prefs.speaking_rate || 0.9;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      const bestVoice = pickBestVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
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
      window.speechSynthesis.speak(utterance);
    });
  }, [prefs, setIsSpeaking]);

  function formatForSpeech(value) {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return value;
  }

  const doReadBackAndConfirm = useCallback(async (collected) => {
    const style = prefs.confirmation_style || 'brief';

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

    dispatch({ type: 'SPEAK_CONFIRM' });
    await speak(summary);

    if (mountedRef.current) {
      dispatch({ type: 'START_CONFIRM' });
      startListening();
    }
  }, [script, prefs, speak, startListening]);

  const askStep = useCallback(async (index, currentCollected) => {
    if (index >= script.length) {
      let finalCollected = currentCollected;
      if (onAllAnsweredRef.current) {
        const result = await onAllAnsweredRef.current(currentCollected, { speak, startListening, dispatch, mountedRef });
        if (result) {
          if (result._restart) {
            dispatch({ type: 'RESTART' });
            askStep(0, {});
            return;
          }
          finalCollected = result;
          dispatch({ type: 'SET_COLLECTED', collected: result });
          if (result._skipReadback) {
            dispatch({ type: 'CONFIRM_SAVE' });
            if (onCompleteRef.current) onCompleteRef.current(finalCollected);
            return;
          }
        }
      }
      await doReadBackAndConfirm(finalCollected);
      return;
    }

    const step = script[index];
    dispatch({ type: 'ASK_STEP', index });

    await speak(step.question);

    if (mountedRef.current) {
      dispatch({ type: 'LISTEN' });
      startListening();
    }
  }, [script, speak, startListening, doReadBackAndConfirm]);

  // Handle transcript when listening finishes — uses dispatch so no stale closures
  const handleResponse = useCallback((text, currentState) => {
    if (!text?.trim()) return;

    const lower = text.toLowerCase().trim();
    dispatch({ type: 'ADD_LOG', role: 'user', text });

    // Cancel commands
    if (CANCEL_WORDS.some((w) => lower === w)) {
      dispatch({ type: 'CANCEL' });
      if (onCancelRef.current) onCancelRef.current();
      return;
    }

    // Confirmation phase
    if (currentState.phase === 'confirming') {
      const isDeny = DENY_WORDS.some((w) => lower.includes(w));
      if (isDeny) {
        dispatch({ type: 'RESTART' });
        askStep(0, {});
        return;
      }

      const isConfirm = CONFIRM_WORDS.some((w) => lower.includes(w));
      if (isConfirm) {
        dispatch({ type: 'CONFIRM_SAVE' });
        console.log('VOICE COMPLETE - calling onComplete with:', currentState.collected);
        if (onCompleteRef.current) onCompleteRef.current(currentState.collected);
        return;
      }

      // Didn't understand
      speak('Sorry, should I save this? Say yes or no.').then(() => {
        if (mountedRef.current) {
          dispatch({ type: 'START_CONFIRM' });
          startListening();
        }
      });
      return;
    }

    // Skip / next
    if (lower === 'skip' || lower === 'next') {
      const step = script[currentState.stepIndex];
      if (step && !step.required) {
        askStep(currentState.stepIndex + 1, currentState.collected);
      } else {
        speak('This field is required. Please provide a value.').then(() => {
          if (mountedRef.current) {
            dispatch({ type: 'LISTEN' });
            startListening();
          }
        });
      }
      return;
    }

    // Go back
    if (lower === 'go back' || lower === 'back' || lower === 'previous') {
      if (currentState.stepIndex > 0) {
        askStep(currentState.stepIndex - 1, currentState.collected);
      } else {
        speak("We're already on the first question.").then(() => {
          if (mountedRef.current) {
            dispatch({ type: 'LISTEN' });
            startListening();
          }
        });
      }
      return;
    }

    // Validate and store field
    const step = script[currentState.stepIndex];
    if (!step) return;

    let fieldValue = text;
    if (step.validator) {
      const result = step.validator(text);
      if (result.error) {
        speak(result.error).then(() => {
          if (mountedRef.current) {
            dispatch({ type: 'LISTEN' });
            startListening();
          }
        });
        return;
      }
      fieldValue = result.value ?? text;
    }

    dispatch({ type: 'SET_FIELD', field: step.field, value: fieldValue });
    const updatedCollected = { ...currentState.collected, [step.field]: fieldValue };
    askStep(currentState.stepIndex + 1, updatedCollected);
  }, [script, speak, startListening, askStep]);

  // Use a ref to hold latest state for the listening effect
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // When listening stops and we have a transcript, handle it
  useEffect(() => {
    if (prevListeningRef.current && !isListening && transcript) {
      handleResponse(transcript, stateRef.current);
    }
    prevListeningRef.current = isListening;
  }, [isListening, handleResponse]);

  const start = useCallback(() => {
    dispatch({ type: 'START' });
    const name = prefs.assistant_name || 'Max';
    speak(`Hi, I'm ${name}. Let's get started.`).then(() => {
      if (mountedRef.current) askStep(0, {});
    });
  }, [prefs, speak, askStep]);

  const reset = useCallback(() => {
    window.speechSynthesis.cancel();
    dispatch({ type: 'RESET' });
    if (isListening) stopListening();
  }, [isListening, stopListening]);

  const currentStep = state.stepIndex >= 0 && state.stepIndex < script.length ? script[state.stepIndex] : null;
  const progress = script.length > 0 ? Math.min((state.stepIndex + 1) / script.length, 1) : 0;

  return {
    start,
    reset,
    phase: state.phase,
    isSpeaking: isSpeakingRef.current,
    isListening,
    transcript,
    currentStep,
    stepIndex: state.stepIndex,
    collected: state.collected,
    conversationLog: state.conversationLog,
    progress,
    isSupported,
    voiceError,
  };
}
