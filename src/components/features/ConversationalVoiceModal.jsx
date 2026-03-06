import { useState, useCallback } from 'react';
import { Mic, MicOff, Loader2, Volume2, CheckCircle, ArrowLeft } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import { useConversationalVoice } from '@/hooks/useConversationalVoice';
import { useCreateContact } from '@/hooks/useContacts';
import { useCreateSurgeon } from '@/hooks/useSurgeons';
import { useCreateFacility } from '@/hooks/useFacilities';
import { useFacilities } from '@/hooks/useFacilities';
import { useToast } from '@/components/ui/Toast';
import { sanitizeText } from '@/utils/sanitize';

const FACILITY_TYPES = ['hospital', 'surgery_center', 'clinic', 'office', 'other'];

function fuzzyMatchFacility(input, facilities) {
  if (!input || !facilities?.length) return null;
  const lower = input.toLowerCase();
  const match = facilities.find((f) =>
    f.name.toLowerCase().includes(lower) || lower.includes(f.name.toLowerCase())
  );
  return match || null;
}

function buildContactScript(facilities) {
  return [
    { question: "What's the contact's full name?", field: 'full_name', required: true },
    { question: "What's their role? For example, OR Manager, Sales Rep, or Billing Coordinator.", field: 'role', required: false },
    {
      question: 'Which facility are they at?',
      field: 'facility_name',
      required: false,
      validator: (text) => {
        const match = fuzzyMatchFacility(text, facilities);
        return { value: text, facilityMatch: match };
      },
    },
    {
      question: "What's their phone number?",
      field: 'phone',
      required: false,
      validator: (text) => {
        const digits = text.replace(/\D/g, '');
        if (digits.length > 0 && digits.length < 7) {
          return { error: "That doesn't sound like a complete phone number. Please try again." };
        }
        return { value: digits.length >= 7 ? digits : text };
      },
    },
    {
      question: "And their email address?",
      field: 'email',
      required: false,
      validator: (text) => {
        const cleaned = text.replace(/\s+/g, '').replace(/\s*at\s*/gi, '@').replace(/\s*dot\s*/gi, '.');
        if (cleaned.includes('@') && cleaned.includes('.')) {
          return { value: cleaned };
        }
        return { value: text };
      },
    },
  ];
}

function buildSurgeonScript() {
  return [
    { question: "What's the surgeon's full name?", field: 'full_name', required: true },
    { question: "What's their specialty? For example, orthopedic, spine, trauma, or sports medicine.", field: 'specialty', required: false },
    { question: "What's their primary facility?", field: 'primary_facility_name', required: false },
    {
      question: "What's their phone number?",
      field: 'phone',
      required: false,
      validator: (text) => {
        const digits = text.replace(/\D/g, '');
        if (digits.length > 0 && digits.length < 7) {
          return { error: "That doesn't sound like a complete phone number. Please try again." };
        }
        return { value: digits.length >= 7 ? digits : text };
      },
    },
  ];
}

function buildFacilityScript() {
  return [
    { question: "What's the facility name?", field: 'name', required: true },
    {
      question: `What type of facility is it? Hospital, surgery center, clinic, office, or other?`,
      field: 'facility_type',
      required: false,
      validator: (text) => {
        const lower = text.toLowerCase();
        if (lower.includes('hospital')) return { value: 'hospital' };
        if (lower.includes('surgery') || lower.includes('asc')) return { value: 'surgery_center' };
        if (lower.includes('clinic')) return { value: 'clinic' };
        if (lower.includes('office')) return { value: 'office' };
        return { value: 'other' };
      },
    },
    { question: "What city is it in?", field: 'city', required: false },
    {
      question: "What state?",
      field: 'state',
      required: false,
      validator: (text) => {
        const upper = text.toUpperCase().trim();
        if (upper.length === 2) return { value: upper };
        return { value: text };
      },
    },
  ];
}

const SCRIPT_CONFIGS = {
  add_contact: { title: 'Add Contact', buildScript: buildContactScript },
  add_surgeon: { title: 'Add Surgeon', buildScript: () => buildSurgeonScript() },
  add_facility: { title: 'Add Facility', buildScript: () => buildFacilityScript() },
};

export default function ConversationalVoiceModal({ isOpen, onClose, scriptType = 'add_contact', prefillName, onComplete: onCompleteProp }) {
  const toast = useToast();
  const createContact = useCreateContact();
  const createSurgeon = useCreateSurgeon();
  const createFacility = useCreateFacility();
  const { data: facilities = [] } = useFacilities({ activeOnly: true });

  const [saving, setSaving] = useState(false);

  const config = SCRIPT_CONFIGS[scriptType];
  let script = config.buildScript(facilities);

  // If prefillName is provided for add_surgeon, skip the name question
  const hasPrefill = prefillName && scriptType === 'add_surgeon';
  if (hasPrefill) {
    script = script.filter((s) => s.field !== 'full_name');
  }

  const handleComplete = useCallback(async (collected) => {
    // Merge prefilled name back into collected data
    const finalCollected = hasPrefill
      ? { full_name: prefillName, ...collected }
      : collected;

    setSaving(true);
    try {
      let savedRecord;
      if (scriptType === 'add_contact') {
        const facilityMatch = fuzzyMatchFacility(finalCollected.facility_name, facilities);
        savedRecord = await createContact.mutateAsync({
          full_name: sanitizeText(finalCollected.full_name),
          role: finalCollected.role ? sanitizeText(finalCollected.role) : null,
          facility_id: facilityMatch?.id || null,
          phone: finalCollected.phone || null,
          email: finalCollected.email || null,
        });
        toast({ message: `Contact "${finalCollected.full_name}" added`, type: 'success' });
      } else if (scriptType === 'add_surgeon') {
        const facilityMatch = fuzzyMatchFacility(finalCollected.primary_facility_name, facilities);
        savedRecord = await createSurgeon.mutateAsync({
          full_name: sanitizeText(finalCollected.full_name),
          specialty: finalCollected.specialty ? sanitizeText(finalCollected.specialty) : null,
          primary_facility_id: facilityMatch?.id || null,
          phone: finalCollected.phone || null,
        });
        toast({ message: `Surgeon "${finalCollected.full_name}" added`, type: 'success' });
      } else if (scriptType === 'add_facility') {
        savedRecord = await createFacility.mutateAsync({
          name: sanitizeText(finalCollected.name),
          facility_type: finalCollected.facility_type || null,
          city: finalCollected.city ? sanitizeText(finalCollected.city) : null,
          state: finalCollected.state ? sanitizeText(finalCollected.state) : null,
        });
        toast({ message: `Facility "${finalCollected.name}" added`, type: 'success' });
      }
      if (onCompleteProp && savedRecord) {
        onCompleteProp(savedRecord);
      } else {
        handleClose();
      }
    } catch (err) {
      toast({ message: `Failed to save: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [scriptType, facilities, createContact, createSurgeon, createFacility, toast, hasPrefill, prefillName, onCompleteProp]);

  const handleCancel = useCallback(() => {
    voice.reset();
  }, []);

  const voice = useConversationalVoice({
    script,
    onComplete: handleComplete,
    onCancel: handleCancel,
  });

  function handleClose() {
    voice.reset();
    onClose();
  }

  const isActive = voice.phase !== 'idle' && voice.phase !== 'done';

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title={config.title} fullHeight>
      <div className="flex flex-col gap-4 py-4">
        {/* Progress bar */}
        {isActive && (
          <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-800 dark:bg-brand-400 transition-all duration-300"
              style={{ width: `${voice.progress * 100}%` }}
            />
          </div>
        )}

        {/* Conversation log */}
        {voice.conversationLog.length > 0 && (
          <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
            {voice.conversationLog.map((entry, i) => (
              <div
                key={i}
                className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                    entry.role === 'user'
                      ? 'bg-brand-800 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-bl-sm'
                  }`}
                >
                  {entry.text}
                </div>
              </div>
            ))}

            {/* Live transcript while listening */}
            {voice.isListening && voice.transcript && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-800/60 px-3.5 py-2 text-sm text-white italic">
                  {voice.transcript}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status indicators */}
        <div className="flex flex-col items-center gap-3">
          {/* Speaking indicator */}
          {voice.isSpeaking && (
            <div className="flex items-center gap-2 text-sm text-brand-800 dark:text-brand-400">
              <Volume2 className="h-4 w-4 animate-pulse" />
              <span>Speaking...</span>
            </div>
          )}

          {/* Listening waveform */}
          {voice.isListening && (
            <div className="flex items-center gap-1 h-8">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-brand-800 dark:bg-brand-400"
                  style={{
                    animation: `voice-wave 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                    height: '12px',
                  }}
                />
              ))}
            </div>
          )}

          {/* Saving indicator */}
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}

          {/* Idle / start state */}
          {voice.phase === 'idle' && !saving && (
            <>
              <button
                onClick={voice.start}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-800 text-white shadow-lg transition-all active:scale-95"
              >
                <Mic className="h-8 w-8" />
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tap to start voice-guided entry
              </p>
            </>
          )}

          {/* Current question indicator */}
          {voice.currentStep && voice.phase === 'listening' && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              Say "skip" to skip, "go back" for previous, or "cancel" to stop
            </p>
          )}
        </div>

        {/* Collected fields summary (during confirming) */}
        {voice.phase === 'confirming' && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700">
            {script.map((step) => {
              const val = voice.collected[step.field];
              if (!val) return null;
              return (
                <div key={step.field} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {step.field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 text-right max-w-[60%] truncate">
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Done state */}
        {voice.phase === 'done' && !saving && (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Saved successfully!</p>
          </div>
        )}

        {/* Error display */}
        {voice.voiceError && (
          <p className="text-sm text-red-500 text-center">{voice.voiceError}</p>
        )}

        {!voice.isSupported && (
          <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
            Voice input is not supported in this browser.
          </p>
        )}

        {/* Cancel button while active */}
        {isActive && !saving && (
          <Button variant="secondary" fullWidth onClick={handleClose}>
            Cancel
          </Button>
        )}
      </div>

      <style>{`
        @keyframes voice-wave {
          0% { height: 6px; }
          100% { height: 24px; }
        }
      `}</style>
    </BottomSheet>
  );
}
