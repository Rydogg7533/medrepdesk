import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/context/AuthContext';

const VOICE_LIMITS = { solo: 0, assistant: 60, distributorship: 200 };

export function useVoice({ forceWebSpeech = false } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [minutesLimit, setMinutesLimit] = useState(0);

  const { plan, canAccessAssistant } = useSubscription();
  const { account } = useAuth();

  const recognitionRef = useRef(null);
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sessionStartRef = useRef(null);
  const accountIdRef = useRef(null);

  const SpeechRecognition = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

  const useOpenAI = !forceWebSpeech && canAccessAssistant;
  const isSupported = useOpenAI || !!SpeechRecognition;

  // Sync minutes from account
  useEffect(() => {
    const limit = VOICE_LIMITS[plan] || 0;
    setMinutesLimit(limit);
    setMinutesUsed(Number(account?.voice_minutes_this_month) || 0);
  }, [plan, account?.voice_minutes_this_month]);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    if (dcRef.current) {
      try { dcRef.current.close(); } catch {}
      dcRef.current = null;
    }
    if (pcRef.current) {
      try { pcRef.current.close(); } catch {}
      pcRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // Report voice minutes used to the server
  const reportMinutes = useCallback(async (durationMinutes) => {
    const aid = accountIdRef.current;
    if (!aid || durationMinutes < 0.01) return;
    try {
      // Use RPC or direct update — increment voice_minutes_this_month
      await supabase.rpc('increment_voice_minutes', {
        p_account_id: aid,
        p_minutes: Math.round(durationMinutes * 100) / 100,
      });
      setMinutesUsed((prev) => prev + durationMinutes);
    } catch (err) {
      console.error('Failed to report voice minutes:', err);
    }
  }, []);

  const startOpenAI = useCallback(async () => {
    setError(null);
    setTranscript('');
    setIsProcessing(true);

    try {
      // 1. Get ephemeral token
      const { data, error: fnError } = await supabase.functions.invoke('openai-voice-session', {
        body: {},
      });

      if (fnError) {
        const msg = fnError?.context?.body ? await fnError.context.text?.() : fnError.message;
        throw new Error(msg || fnError.message);
      }

      if (data?.error === 'limit_reached') {
        setError(`Voice limit reached (${data.minutes_used}/${data.limit} min)`);
        setIsProcessing(false);
        return;
      }
      if (data?.error === 'upgrade_required') {
        setError('Upgrade to Assistant plan for OpenAI voice');
        setIsProcessing(false);
        return;
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      const ephemeralToken = data.client_secret?.value;
      if (!ephemeralToken) throw new Error('No ephemeral token received');

      accountIdRef.current = data.account_id;
      setMinutesUsed(data.minutes_used || 0);
      setMinutesLimit(data.minutes_limit || 0);

      // 2. Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Create RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Add audio track
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Play remote audio
      pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play().catch(() => {});
      };

      // 4. Create data channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        // Configure session for transcription
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: 'You are a voice transcription assistant. Listen to the user and transcribe what they say accurately. Do not respond with audio. Only transcribe.',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: { type: 'server_vad', silence_duration_ms: 1000 },
          },
        }));
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'conversation.item.input_audio_transcription.completed') {
            const text = msg.transcript?.trim();
            if (text) setTranscript(text);
          }

          if (msg.type === 'response.audio_transcript.done') {
            // Assistant response transcript — we don't need this for transcription-only
          }

          if (msg.type === 'error') {
            console.error('OpenAI Realtime error:', msg.error);
            setError(msg.error?.message || 'Voice session error');
          }
        } catch {}
      };

      // 5. Create SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 6. Send offer to OpenAI
      const sdpRes = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ephemeralToken}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      if (!sdpRes.ok) throw new Error('Failed to connect to OpenAI Realtime');

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      sessionStartRef.current = Date.now();
      setIsListening(true);
      setIsProcessing(false);
    } catch (err) {
      console.error('OpenAI voice error:', err);
      cleanup();
      setIsProcessing(false);

      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Enable it in Settings → Safari → MedRepDesk');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found');
      } else {
        setError(err.message || 'Failed to start voice session');
      }
    }
  }, [cleanup, reportMinutes]);

  const startBrowserSpeech = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    setError(null);
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(final || interim);
    };

    recognition.onspeechend = () => {
      recognition.stop();
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Enable it in your browser settings.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setError('Failed to start speech recognition.');
    }
  }, [SpeechRecognition]);

  const startListening = useCallback(() => {
    if (isListening || isProcessing) return;

    if (useOpenAI) {
      startOpenAI();
    } else {
      startBrowserSpeech();
    }
  }, [isListening, isProcessing, useOpenAI, startOpenAI, startBrowserSpeech]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // OpenAI path — report minutes and cleanup
    if (pcRef.current && sessionStartRef.current) {
      const durationMs = Date.now() - sessionStartRef.current;
      const durationMin = durationMs / 60000;
      sessionStartRef.current = null;
      reportMinutes(durationMin);
    }

    cleanup();
    setIsListening(false);
  }, [cleanup, reportMinutes]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    minutesUsed,
    minutesLimit,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    useOpenAI,
  };
}
