import { useState, useEffect } from 'react';
import { Volume2, Play } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useVoicePreferences, useUpdateVoicePreferences, VOICE_DEFAULTS } from '@/hooks/useVoicePreferences';
import { useToast } from '@/components/ui/Toast';

export default function VoiceSettings() {
  const { data: prefs } = useVoicePreferences();
  const updatePrefs = useUpdateVoicePreferences();
  const toast = useToast();

  const [form, setForm] = useState(VOICE_DEFAULTS);
  const [voices, setVoices] = useState([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (prefs) {
      setForm(prefs);
      setDirty(false);
    }
  }, [prefs]);

  useEffect(() => {
    function loadVoices() {
      const available = window.speechSynthesis?.getVoices() || [];
      setVoices(available);
    }
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await updatePrefs.mutateAsync(form);
      setDirty(false);
      toast({ message: 'Voice settings saved', type: 'success' });
    } catch (err) {
      toast({ message: `Failed to save: ${err.message}`, type: 'error' });
    }
  }

  function handleTest() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      `Hi, I'm ${form.assistant_name || 'Max'}. Ready to help.`
    );
    utterance.rate = form.speaking_rate || 1.0;
    utterance.lang = 'en-US';

    if (voices.length > 0 && form.voice_index < voices.length) {
      utterance.voice = voices[form.voice_index];
    }

    window.speechSynthesis.speak(utterance);
  }

  const hasSpeechSynthesis = typeof window !== 'undefined' && !!window.speechSynthesis;

  if (!hasSpeechSynthesis) return null;

  return (
    <section className="mt-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <h2 className="mb-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Voice Assistant</h2>

      <div className="flex flex-col gap-4">
        {/* Assistant Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Assistant Name
          </label>
          <input
            type="text"
            value={form.assistant_name}
            onChange={(e) => handleChange('assistant_name', e.target.value)}
            maxLength={20}
            className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Max"
          />
        </div>

        {/* Speaking Speed */}
        <div>
          <label className="mb-1 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
            <span>Speaking Speed</span>
            <span className="text-xs text-gray-400 font-normal">{form.speaking_rate.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={form.speaking_rate}
            onChange={(e) => handleChange('speaking_rate', parseFloat(e.target.value))}
            className="w-full accent-brand-800"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Confirmation Style */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirmation Style
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleChange('confirmation_style', 'brief')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                form.confirmation_style === 'brief'
                  ? 'bg-brand-800 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Brief
            </button>
            <button
              type="button"
              onClick={() => handleChange('confirmation_style', 'detailed')}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                form.confirmation_style === 'detailed'
                  ? 'bg-brand-800 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* Voice Selector */}
        {voices.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Voice
            </label>
            <select
              value={form.voice_index}
              onChange={(e) => handleChange('voice_index', parseInt(e.target.value))}
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {voices.map((v, i) => (
                <option key={i} value={i}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Test & Save */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleTest}
            className="flex items-center gap-1.5"
          >
            <Play className="h-4 w-4" />
            Test
          </Button>
          {dirty && (
            <Button
              type="button"
              variant="primary"
              className="flex-1"
              loading={updatePrefs.isPending}
              onClick={handleSave}
            >
              Save
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
