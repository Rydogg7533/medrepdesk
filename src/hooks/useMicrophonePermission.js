import { useState, useEffect } from 'react';

// Module-level state — persists across component mounts/unmounts
let globalStream = null;
let permissionState = 'unknown'; // 'unknown' | 'granted' | 'denied' | 'error'
let listeners = [];

function notifyListeners() {
  listeners.forEach((fn) => fn(permissionState));
}

// Standalone release function (usable outside React)
export function releaseMicrophoneStream() {
  if (globalStream) {
    globalStream.getTracks().forEach((track) => track.stop());
    globalStream = null;
    permissionState = 'unknown';
    notifyListeners();
  }
}

export function useMicrophonePermission() {
  const [permission, setPermission] = useState(permissionState);

  useEffect(() => {
    const handler = (state) => setPermission(state);
    listeners.push(handler);
    setPermission(permissionState);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  const requestPermission = async () => {
    // If stream is alive, return it
    if (globalStream && globalStream.getTracks().some((t) => t.readyState === 'live')) {
      permissionState = 'granted';
      notifyListeners();
      return globalStream;
    }
    globalStream = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      globalStream = stream;
      permissionState = 'granted';
      notifyListeners();
      // Mute tracks — hold permission open but don't record
      stream.getTracks().forEach((track) => {
        track.enabled = false;
      });
      return stream;
    } catch (err) {
      permissionState = err.name === 'NotAllowedError' ? 'denied' : 'error';
      notifyListeners();
      throw err;
    }
  };

  const getStream = async () => {
    if (!globalStream || globalStream.getTracks().every((t) => t.readyState === 'ended')) {
      return requestPermission();
    }
    // Unmute for active recording
    globalStream.getTracks().forEach((track) => {
      track.enabled = true;
    });
    return globalStream;
  };

  const muteStream = () => {
    if (globalStream) {
      globalStream.getTracks().forEach((track) => {
        track.enabled = false;
      });
    }
  };

  return {
    permission,
    requestPermission,
    getStream,
    muteStream,
    releaseStream: releaseMicrophoneStream,
  };
}
