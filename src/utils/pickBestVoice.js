const PREFERRED_NAMES = ['Samantha', 'Alex', 'Karen', 'Daniel', 'Moira'];

export function pickBestVoice() {
  if (!window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // 1. Try preferred voices in priority order
  for (const name of PREFERRED_NAMES) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }

  // 2. First en-US voice that isn't Google or Microsoft
  const nativeEnUS = voices.find(
    (v) =>
      v.lang === 'en-US' &&
      !v.name.startsWith('Google') &&
      !v.name.startsWith('Microsoft')
  );
  if (nativeEnUS) return nativeEnUS;

  // 3. Any English voice as fallback
  const anyEnglish = voices.find((v) => v.lang.startsWith('en'));
  if (anyEnglish) return anyEnglish;

  return null;
}
