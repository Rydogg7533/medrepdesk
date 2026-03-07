import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { executeToolCall, getInvalidationKeys } from '@/lib/voiceAgentTools';
import { useQueryClient } from '@tanstack/react-query';
import { useVoicePreferences, VOICE_DEFAULTS } from '@/hooks/useVoicePreferences';

export function useVoiceAgent() {
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const [transcript, setTranscript] = useState(''); // user's current speech
  const [aiText, setAiText] = useState(''); // AI's current response text
  const [conversationLog, setConversationLog] = useState([]);
  const [error, setError] = useState(null);
  const [minutesUsed, setMinutesUsed] = useState(0);
  const [minutesLimit, setMinutesLimit] = useState(0);

  const { user, account } = useAuth();
  const { data: prefs = VOICE_DEFAULTS } = useVoicePreferences();
  const queryClient = useQueryClient();

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioElRef = useRef(null);
  const sessionStartRef = useRef(null);
  const mountedRef = useRef(true);
  const currentAiTextRef = useRef('');
  const currentTranscriptRef = useRef('');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
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
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
  }, []);

  const reportMinutes = useCallback(async (durationMinutes) => {
    if (!account?.id || durationMinutes < 0.01) return;
    try {
      await supabase.rpc('increment_voice_minutes', {
        p_account_id: account.id,
        p_minutes: Math.round(durationMinutes * 100) / 100,
      });
    } catch (err) {
      console.error('Failed to report voice minutes:', err);
    }
  }, [account?.id]);

  const addToLog = useCallback((role, text) => {
    if (!mountedRef.current) return;
    setConversationLog((prev) => [...prev, { role, text, time: Date.now() }]);
  }, []);

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return;

    setStatus('connecting');
    setError(null);
    setConversationLog([]);
    setTranscript('');
    setAiText('');
    currentAiTextRef.current = '';
    currentTranscriptRef.current = '';

    try {
      // 1. Get ephemeral session from edge function
      const { data, error: fnError } = await supabase.functions.invoke('realtime-voice-agent', {
        body: { voice: prefs.voice || 'alloy' },
      });

      if (fnError) {
        const msg = fnError?.context?.body ? await fnError.context.text?.() : fnError.message;
        throw new Error(msg || fnError.message);
      }

      if (data?.error === 'limit_reached') {
        setError(`Voice limit reached (${data.minutes_used}/${data.limit} min)`);
        setStatus('error');
        return;
      }
      if (data?.error === 'upgrade_required') {
        setError('Upgrade to Assistant plan for voice agent');
        setStatus('error');
        return;
      }
      if (data?.error) throw new Error(data.error);

      const ephemeralToken = data.client_secret?.value;
      if (!ephemeralToken) throw new Error('No ephemeral token received');

      setMinutesUsed(data.minutes_used || 0);
      setMinutesLimit(data.minutes_limit || 0);

      const accountId = data.account_id;
      const userId = data.user_id;

      // 2. Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 3. Create RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Play remote audio from AI
      pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play().catch(() => {});
        audioElRef.current = audio;
      };

      // 4. Create data channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        if (mountedRef.current) {
          setStatus('connected');
          sessionStartRef.current = Date.now();
        }
      };

      dc.onmessage = async (event) => {
        if (!mountedRef.current) return;
        try {
          const msg = JSON.parse(event.data);
          handleServerEvent(msg, dc, { supabase, accountId, userId });
        } catch {}
      };

      dc.onclose = () => {
        if (mountedRef.current) {
          setStatus('idle');
        }
      };

      // 5. SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 6. Connect to OpenAI
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
    } catch (err) {
      console.error('Voice agent connect error:', err);
      cleanup();
      if (mountedRef.current) {
        setStatus('error');
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Enable it in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found');
        } else {
          setError(err.message || 'Failed to start voice agent');
        }
      }
    }
  }, [status, prefs.voice, cleanup]);

  const handleServerEvent = useCallback((msg, dc, ctx) => {
    switch (msg.type) {
      // User speech transcription
      case 'conversation.item.input_audio_transcription.completed': {
        const text = msg.transcript?.trim();
        if (text) {
          currentTranscriptRef.current = '';
          setTranscript('');
          addToLog('user', text);
        }
        break;
      }

      // AI response text streaming (delta)
      case 'response.audio_transcript.delta': {
        const delta = msg.delta || '';
        currentAiTextRef.current += delta;
        setAiText(currentAiTextRef.current);
        break;
      }

      // AI response text complete
      case 'response.audio_transcript.done': {
        const text = msg.transcript?.trim();
        if (text) {
          addToLog('assistant', text);
        }
        currentAiTextRef.current = '';
        setAiText('');
        break;
      }

      // Function call completed — execute it
      case 'response.function_call_arguments.done': {
        const { call_id, name, arguments: argsStr } = msg;
        let args;
        try {
          args = JSON.parse(argsStr);
        } catch {
          args = {};
        }

        // Execute tool async, then send result back
        executeToolCall(name, args, ctx)
          .then((result) => {
            // Invalidate React Query caches for write operations
            const keys = getInvalidationKeys(name);
            keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));

            // Send result back to OpenAI via data channel
            if (dc.readyState === 'open') {
              dc.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id,
                  output: JSON.stringify(result),
                },
              }));
              // Trigger AI to respond with the tool result
              dc.send(JSON.stringify({ type: 'response.create' }));
            }
          })
          .catch((err) => {
            console.error('Tool execution error:', err);
            if (dc.readyState === 'open') {
              dc.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id,
                  output: JSON.stringify({ error: err.message }),
                },
              }));
              dc.send(JSON.stringify({ type: 'response.create' }));
            }
          });
        break;
      }

      // Interim transcript while user is speaking
      case 'input_audio_buffer.speech_started': {
        currentTranscriptRef.current = '';
        setTranscript('');
        break;
      }

      case 'error': {
        console.error('OpenAI Realtime error:', msg.error);
        if (mountedRef.current) {
          setError(msg.error?.message || 'Voice session error');
        }
        break;
      }

      default:
        break;
    }
  }, [addToLog, queryClient]);

  const disconnect = useCallback(() => {
    // Report minutes
    if (sessionStartRef.current) {
      const durationMs = Date.now() - sessionStartRef.current;
      const durationMin = durationMs / 60000;
      sessionStartRef.current = null;
      reportMinutes(durationMin);
    }

    cleanup();
    if (mountedRef.current) {
      setStatus('idle');
    }
  }, [cleanup, reportMinutes]);

  return {
    status,
    transcript,
    aiText,
    conversationLog,
    error,
    minutesUsed,
    minutesLimit,
    connect,
    disconnect,
  };
}
