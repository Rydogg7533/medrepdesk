import { useState, useRef, useCallback, useEffect } from 'react';

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const SpeechRecognition = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
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
        setError('Microphone access denied. Please allow microphone permissions in your browser settings.');
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
    } catch (err) {
      setIsListening(false);
      setError('Failed to start speech recognition.');
    }
  }, [SpeechRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return { isListening, transcript, startListening, stopListening, isSupported, error };
}
