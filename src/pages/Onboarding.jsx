import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, X, Check, Search, ChevronDown, ChevronRight, CheckCircle,
  Building2, User, Stethoscope, Contact, Factory, Briefcase,
} from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useUpdateUser, useUpdateAccountOnboarding } from '@/hooks/useOnboarding';
import { useCreateDistributor } from '@/hooks/useDistributors';
import { useUpsertDistributorProducts } from '@/hooks/useDistributorProducts';
import { useEnsurePayPeriods } from '@/hooks/usePayPeriods';
import { useSearchFacilities, useCreateFacility, useImportGlobalFacility } from '@/hooks/useFacilities';
import { useSearchSurgeons, useCreateSurgeon, useImportGlobalSurgeon } from '@/hooks/useSurgeons';
import { useCreateContact } from '@/hooks/useContacts';
import { useCreateManufacturer } from '@/hooks/useManufacturers';
import { useCreateCase } from '@/hooks/useCases';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import BottomSheet from '@/components/ui/BottomSheet';
import { US_STATES } from '@/utils/usStates';
import { PRODUCT_CATALOG } from '@/utils/productCatalog';
import { SURGEON_SPECIALTIES, SURGEON_PREFIXES } from '@/utils/constants';

const TOTAL_STEPS = 9;

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'America/Adak', 'Pacific/Honolulu', 'America/Phoenix',
];

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
function ProgressBar({ step, total }) {
  const pct = ((step - 1) / (total - 1)) * 100;
  return (
    <div className="h-1 w-full bg-gray-200 dark:bg-gray-700">
      <div
        className="h-full bg-brand-800 transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── SKIP CONFIRMATION ────────────────────────────────────────────────────────
function SkipConfirmation({ isOpen, onClose, onSkip, title, body, goBackLabel }) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <p className="mb-6 whitespace-pre-line text-sm text-gray-600 dark:text-gray-400">{body}</p>
      <div className="flex flex-col gap-3">
        <Button fullWidth onClick={onClose}>{goBackLabel || 'Go Back'}</Button>
        <button
          onClick={onSkip}
          className="text-center text-sm font-medium text-gray-400 dark:text-gray-500"
        >
          Skip for Now
        </button>
      </div>
    </BottomSheet>
  );
}

// ─── STEP WRAPPER ─────────────────────────────────────────────────────────────
function StepWrapper({ step, onBack, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10">
        <div className="pt-safe-top" />
        <ProgressBar step={step} total={TOTAL_STEPS} />
        {step > 1 && (
          <div className="px-4 py-3">
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 px-5 pb-safe-bottom">
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4: YOUR FACILITIES (top-level component to preserve search state)
// ═══════════════════════════════════════════════════════════════════════════════
function Step4Facilities({ userState, addedFacilities, setAddedFacilities, importGlobalFacility, createFacility, goToStep, goBack }) {
  const filterStates = useMemo(() => userState ? [userState] : [], [userState]);
  const { search: searchFacilities, results: facilityResults, isSearching: facilitySearching } = useSearchFacilities({ filterStates });
  const [searchTerm, setSearchTerm] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', facility_type: 'hospital', address: '', city: '', state: userState, phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchTerm.length >= 3) searchFacilities(searchTerm);
  }, [searchTerm, searchFacilities]);

  async function handleAddGlobal(result) {
    setSaving(true);
    try {
      const facility = await importGlobalFacility.mutateAsync(result.value);
      setAddedFacilities((p) => [...p, { id: facility.id, name: facility.name }]);
      setSearchTerm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddManual() {
    if (!manualForm.name.trim()) { setError('Facility name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const facility = await createFacility.mutateAsync(manualForm);
      setAddedFacilities((p) => [...p, { id: facility.id, name: facility.name }]);
      setManualForm({ name: '', facility_type: 'hospital', address: '', city: '', state: userState, phone: '' });
      setShowManual(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleContinue() {
    if (addedFacilities.length === 0) { setError('Add at least 1 facility to continue'); return; }
    await goToStep(5);
  }

  const addedIds = new Set(addedFacilities.map((f) => f.id));
  const filteredResults = facilityResults.filter((r) => !addedIds.has(r.value));

  return (
    <StepWrapper step={4} onBack={goBack}>
      <h1 className="mb-1 mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Your Facilities <span className="text-red-500">*</span></h1>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Where do you cover cases? Add at least 1.</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search hospitals & facilities..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-10 pr-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
        />
      </div>

      {/* Search Results */}
      {searchTerm.length >= 3 && (
        <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {facilitySearching ? (
            <p className="p-3 text-sm text-gray-400">Searching...</p>
          ) : filteredResults.length === 0 ? (
            <p className="p-3 text-sm text-gray-400">No results found</p>
          ) : (
            filteredResults.map((r) => (
              <button key={r.value} onClick={() => handleAddGlobal(r)} className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.label}</p>
                  {r.subtitle && <p className="text-xs text-gray-400">{r.subtitle}</p>}
                </div>
                <Plus className="h-4 w-4 text-brand-800 dark:text-brand-400" />
              </button>
            ))
          )}
        </div>
      )}

      {/* Added Facilities */}
      {addedFacilities.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{addedFacilities.length} facilit{addedFacilities.length === 1 ? 'y' : 'ies'} added</p>
          <div className="space-y-1.5">
            {addedFacilities.map((f) => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{f.name}</span>
                <button onClick={() => setAddedFacilities((p) => p.filter((x) => x.id !== f.id))} className="text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Manually */}
      <button type="button" onClick={() => setShowManual(!showManual)} className="mb-4 text-sm font-medium text-brand-800 dark:text-brand-400">
        + Add Manually
      </button>
      {showManual && (
        <div className="mb-4 space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <Input label={<>Name <span className="text-red-500">*</span></>} name="name" value={manualForm.name} onChange={(e) => setManualForm((p) => ({ ...p, name: e.target.value }))} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <select value={manualForm.facility_type} onChange={(e) => setManualForm((p) => ({ ...p, facility_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800">
              <option value="hospital">Hospital</option>
              <option value="asc">ASC</option>
              <option value="clinic">Clinic</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Input label="Address" name="address" value={manualForm.address} onChange={(e) => setManualForm((p) => ({ ...p, address: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" value={manualForm.city} onChange={(e) => setManualForm((p) => ({ ...p, city: e.target.value }))} />
            <Input label="Phone" type="tel" value={manualForm.phone} onChange={(e) => setManualForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <Button size="sm" onClick={handleAddManual} loading={saving}>Add Facility</Button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <div className="mt-6 pb-6">
        <Button fullWidth loading={saving} onClick={handleContinue}>Continue</Button>
      </div>
    </StepWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5: YOUR SURGEONS (top-level component to preserve search state)
// ═══════════════════════════════════════════════════════════════════════════════
function Step5Surgeons({ userState, addedSurgeons, setAddedSurgeons, addedFacilities, importGlobalSurgeon, createSurgeon, goToStep, goBack }) {
  const filterStates = useMemo(() => userState ? [userState] : [], [userState]);
  const { search: searchSurgeons, results: surgeonResults, isSearching: surgeonSearching } = useSearchSurgeons({ filterStates });
  const [searchTerm, setSearchTerm] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    prefix: '', first_name: '', last_name: '', specialty: '',
    primary_facility_id: '', phone: '', email: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchTerm.length >= 3) searchSurgeons(searchTerm);
  }, [searchTerm, searchSurgeons]);

  async function handleAddGlobal(result) {
    setSaving(true);
    try {
      const surgeon = await importGlobalSurgeon.mutateAsync(result.value);
      setAddedSurgeons((p) => [...p, { id: surgeon.id, full_name: surgeon.full_name }]);
      setSearchTerm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddManual() {
    if (!manualForm.last_name.trim()) { setError('Last name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const fullName = [manualForm.prefix, manualForm.first_name, manualForm.last_name].filter(Boolean).join(' ');
      const surgeon = await createSurgeon.mutateAsync({
        full_name: fullName,
        specialty: manualForm.specialty || null,
        primary_facility_id: manualForm.primary_facility_id || null,
        phone: manualForm.phone || null,
        email: manualForm.email || null,
      });
      setAddedSurgeons((p) => [...p, { id: surgeon.id, full_name: surgeon.full_name }]);
      setManualForm({ prefix: '', first_name: '', last_name: '', specialty: '', primary_facility_id: '', phone: '', email: '' });
      setShowManual(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleContinue() {
    if (addedSurgeons.length === 0) { setError('Add at least 1 surgeon to continue'); return; }
    await goToStep(6);
  }

  const addedIds = new Set(addedSurgeons.map((s) => s.id));
  const filteredResults = surgeonResults.filter((r) => !addedIds.has(r.value));

  return (
    <StepWrapper step={5} onBack={goBack}>
      <h1 className="mb-1 mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Your Surgeons <span className="text-red-500">*</span></h1>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Who do you cover? Add at least 1.</p>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search surgeons..." className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-10 pr-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20" />
      </div>

      {searchTerm.length >= 3 && (
        <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {surgeonSearching ? (
            <p className="p-3 text-sm text-gray-400">Searching...</p>
          ) : filteredResults.length === 0 ? (
            <p className="p-3 text-sm text-gray-400">No results found</p>
          ) : (
            filteredResults.map((r) => (
              <button key={r.value} onClick={() => handleAddGlobal(r)} className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.label}</p>
                  {r.subtitle && <p className="text-xs text-gray-400">{r.subtitle}</p>}
                </div>
                <Plus className="h-4 w-4 text-brand-800 dark:text-brand-400" />
              </button>
            ))
          )}
        </div>
      )}

      {addedSurgeons.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{addedSurgeons.length} surgeon{addedSurgeons.length !== 1 ? 's' : ''} added</p>
          <div className="space-y-1.5">
            {addedSurgeons.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{s.full_name}</span>
                <button onClick={() => setAddedSurgeons((p) => p.filter((x) => x.id !== s.id))} className="text-gray-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={() => setShowManual(!showManual)} className="mb-4 text-sm font-medium text-brand-800 dark:text-brand-400">+ Add Manually</button>
      {showManual && (
        <div className="mb-4 space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Prefix</label>
              <select value={manualForm.prefix} onChange={(e) => setManualForm((p) => ({ ...p, prefix: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800">
                {SURGEON_PREFIXES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <Input label="First Name" value={manualForm.first_name} onChange={(e) => setManualForm((p) => ({ ...p, first_name: e.target.value }))} />
            <Input label={<>Last Name <span className="text-red-500">*</span></>} value={manualForm.last_name} onChange={(e) => setManualForm((p) => ({ ...p, last_name: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Specialty</label>
            <select value={manualForm.specialty} onChange={(e) => setManualForm((p) => ({ ...p, specialty: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800">
              <option value="">Select specialty</option>
              {SURGEON_SPECIALTIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          {addedFacilities.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Primary Facility</label>
              <select value={manualForm.primary_facility_id} onChange={(e) => setManualForm((p) => ({ ...p, primary_facility_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800">
                <option value="">Select facility</option>
                {addedFacilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" type="tel" value={manualForm.phone} onChange={(e) => setManualForm((p) => ({ ...p, phone: e.target.value }))} />
            <Input label="Email" type="email" value={manualForm.email} onChange={(e) => setManualForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <Button size="sm" onClick={handleAddManual} loading={saving}>Add Surgeon</Button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <div className="mt-6 pb-6">
        <Button fullWidth loading={saving} onClick={handleContinue}>Continue</Button>
      </div>
    </StepWrapper>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, account } = useAuth();
  const updateUser = useUpdateUser();
  const updateAccount = useUpdateAccountOnboarding();
  const createDistributor = useCreateDistributor();
  const upsertProducts = useUpsertDistributorProducts();
  const createFacility = useCreateFacility();
  const importGlobalFacility = useImportGlobalFacility();
  const createSurgeon = useCreateSurgeon();
  const importGlobalSurgeon = useImportGlobalSurgeon();
  const createContact = useCreateContact();
  const createManufacturer = useCreateManufacturer();
  const createCase = useCreateCase();

  // Resume from saved step
  const [step, setStep] = useState(() => user?.onboarding_step || 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Shared state across steps
  const [userState, setUserState] = useState(''); // selected state code
  const [addedFacilities, setAddedFacilities] = useState([]); // [{id, name}]
  const [addedSurgeons, setAddedSurgeons] = useState([]); // [{id, full_name}]
  const [addedContacts, setAddedContacts] = useState([]);
  const [addedManufacturers, setAddedManufacturers] = useState([]);
  const [createdCase, setCreatedCase] = useState(null);
  const [distributorId, setDistributorId] = useState(null);
  const [productGroupCount, setProductGroupCount] = useState(0);

  // Pay periods
  const ensurePayPeriods = useEnsurePayPeriods(distributorId, null);

  async function goToStep(n) {
    setStep(n);
    setError('');
    try {
      await updateUser.mutateAsync({ onboarding_step: n });
    } catch { /* silent */ }
  }

  function goBack() {
    if (step > 1) goToStep(step - 1);
  }

  // ── STEP 1: WELCOME + TOS ──────────────────────────────────────────────
  function Step1() {
    const [tosChecked, setTosChecked] = useState(false);
    const [privacyChecked, setPrivacyChecked] = useState(false);

    async function handleAccept() {
      setSaving(true);
      setError('');
      try {
        await updateAccount.mutateAsync({
          tos_agreed_at: new Date().toISOString(),
          privacy_agreed_at: new Date().toISOString(),
          tos_ip_address: 'client',
        });
        await goToStep(2);
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }

    return (
      <StepWrapper step={1} onBack={goBack}>
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-800">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome to MedRepDesk!</h1>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">Let's get you set up in under 5 minutes</p>

          <div className="w-full space-y-4 text-left">
            <label className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={tosChecked}
                onChange={(e) => setTosChecked(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-800 focus:ring-brand-800"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I agree to the <span className="font-medium text-brand-800 dark:text-brand-400">Terms of Service</span> <span className="text-red-500">*</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyChecked}
                onChange={(e) => setPrivacyChecked(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-800 focus:ring-brand-800"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I agree to the <span className="font-medium text-brand-800 dark:text-brand-400">Privacy Policy</span> <span className="text-red-500">*</span>
              </span>
            </label>
          </div>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <div className="mt-8 w-full">
            <Button
              fullWidth
              disabled={!tosChecked || !privacyChecked}
              loading={saving}
              onClick={handleAccept}
            >
              Get Started
            </Button>
          </div>
        </div>
      </StepWrapper>
    );
  }

  // ── STEP 2: YOUR INFO ──────────────────────────────────────────────────
  function Step2() {
    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [form, setForm] = useState({
      full_name: user?.full_name || '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      timezone: detectedTz || 'America/Denver',
    });

    function onChange(e) {
      setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    }

    async function handleContinue() {
      if (!form.full_name.trim() || !form.state) {
        setError('Name and state are required');
        return;
      }
      setSaving(true);
      setError('');
      try {
        await updateUser.mutateAsync({
          full_name: form.full_name.trim(),
          timezone: form.timezone,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
        });
        await updateAccount.mutateAsync({
          rep_states: [form.state],
        });
        setUserState(form.state);
        await goToStep(3);
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }

    return (
      <StepWrapper step={2} onBack={goBack}>
        <h1 className="mb-1 mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Your Info</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Tell us about yourself</p>

        <div className="space-y-4">
          <Input label={<>Full Name <span className="text-red-500">*</span></>} name="full_name" value={form.full_name} onChange={onChange} required />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} />
          <Input label="Address" name="address" value={form.address} onChange={onChange} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" name="city" value={form.city} onChange={onChange} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">State <span className="text-red-500">*</span></label>
              <select
                name="state"
                value={form.state}
                onChange={onChange}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              >
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Input label="ZIP Code" name="zip" value={form.zip} onChange={onChange} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
            <select
              name="timezone"
              value={form.timezone}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        <div className="mt-8 pb-6">
          <Button fullWidth loading={saving} onClick={handleContinue}>Continue</Button>
        </div>
      </StepWrapper>
    );
  }

  // ── STEP 3: MY DISTRIBUTOR ─────────────────────────────────────────────
  function Step3() {
    const [distForm, setDistForm] = useState({
      name: '', phone: '', address: '',
      billing_email: '', billing_contact_name: '', billing_contact_phone: '',
    });
    const [addedGroups, setAddedGroups] = useState([]);
    const [checkedProducts, setCheckedProducts] = useState({});
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [showGroupPicker, setShowGroupPicker] = useState(false);
    const [payForm, setPayForm] = useState({ pay_frequency: '', pay_day: '', first_pay_date: '', commission_lag: '' });
    const [showPay, setShowPay] = useState(false);

    function onDistChange(e) { setDistForm((p) => ({ ...p, [e.target.name]: e.target.value })); }
    function onPayChange(e) { setPayForm((p) => ({ ...p, [e.target.name]: e.target.value })); }

    function addGroup(catKey) {
      setAddedGroups((p) => [...p, catKey]);
      setExpandedGroups((p) => new Set(p).add(catKey));
      setShowGroupPicker(false);
    }
    function removeGroup(catKey) {
      setAddedGroups((p) => p.filter((k) => k !== catKey));
      const cat = PRODUCT_CATALOG.find((c) => c.key === catKey);
      if (cat) {
        setCheckedProducts((prev) => {
          const next = { ...prev };
          cat.products.forEach((p) => delete next[p.value]);
          return next;
        });
      }
    }
    function toggleProduct(value) {
      setCheckedProducts((prev) => {
        if (prev[value]?.checked) { const next = { ...prev }; delete next[value]; return next; }
        return { ...prev, [value]: { checked: true, commission_rate: '' } };
      });
    }
    function setProductRate(value, rate) {
      setCheckedProducts((prev) => ({ ...prev, [value]: { ...prev[value], commission_rate: rate } }));
    }

    const availableGroups = PRODUCT_CATALOG.filter((cat) => !addedGroups.includes(cat.key));

    function buildProductsArray() {
      const products = [];
      Object.entries(checkedProducts).forEach(([productType, data]) => {
        if (data.checked && data.commission_rate !== '' && data.commission_rate != null) {
          products.push({ product_type: productType, commission_rate: data.commission_rate });
        }
      });
      return products;
    }

    async function handleContinue() {
      if (!distForm.name.trim()) { setError('Distributor name is required'); return; }
      setSaving(true);
      setError('');
      try {
        // Create distributor
        const dist = await createDistributor.mutateAsync({
          name: distForm.name.trim(),
          phone: distForm.phone || null,
          address: distForm.address || null,
          billing_email: distForm.billing_email || null,
          billing_contact_name: distForm.billing_contact_name || null,
          billing_contact_phone: distForm.billing_contact_phone || null,
          pay_schedule: payForm.pay_frequency ? {
            frequency: payForm.pay_frequency,
            pay_day: payForm.pay_day || null,
            first_pay_date: payForm.first_pay_date || null,
            commission_lag: payForm.commission_lag || null,
          } : null,
        });
        setDistributorId(dist.id);

        // Set primary distributor
        await updateAccount.mutateAsync({ primary_distributor_id: dist.id });

        // Upsert products
        const products = buildProductsArray();
        if (products.length > 0) {
          await upsertProducts.mutateAsync({ distributorId: dist.id, products });
        }
        setProductGroupCount(addedGroups.length);

        // Generate pay periods
        if (payForm.pay_frequency && payForm.first_pay_date) {
          const schedule = {
            frequency: payForm.pay_frequency,
            pay_day: payForm.pay_day || null,
            first_pay_date: payForm.first_pay_date,
            commission_lag: payForm.commission_lag || null,
          };
          await ensurePayPeriods.mutateAsync(schedule);
        }

        // Create billing contact
        if (distForm.billing_contact_name) {
          await createContact.mutateAsync({
            full_name: distForm.billing_contact_name,
            contact_type: 'distributor',
            distributor_id: dist.id,
            phone: distForm.billing_contact_phone || null,
            email: distForm.billing_email || null,
            role: 'Billing Contact',
          });
        }

        await goToStep(4);
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }

    async function handleSkip() {
      await goToStep(4);
    }

    return (
      <StepWrapper step={3} onBack={goBack}>
        <h1 className="mb-1 mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">My Distributor</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Set up your distributor, products, and pay schedule</p>

        {/* Section A: Distributor Info */}
        <div className="space-y-4">
          <Input label={<>Distributor Name <span className="text-red-500">*</span></>} name="name" value={distForm.name} onChange={onDistChange} required />
          <Input label="Phone" name="phone" type="tel" value={distForm.phone} onChange={onDistChange} />
          <Input label="Address" name="address" value={distForm.address} onChange={onDistChange} />
          <Input label="Billing Email" name="billing_email" type="email" value={distForm.billing_email} onChange={onDistChange} />
          <Input label="Billing Contact Name" name="billing_contact_name" value={distForm.billing_contact_name} onChange={onDistChange} />
          <Input label="Billing Contact Phone" name="billing_contact_phone" type="tel" value={distForm.billing_contact_phone} onChange={onDistChange} />
        </div>

        {/* Section B: Product Groups */}
        {distForm.name.trim() && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">What do you sell?</h2>
            <div className="space-y-3">
              {addedGroups.map((catKey) => {
                const cat = PRODUCT_CATALOG.find((c) => c.key === catKey);
                if (!cat) return null;
                const isExpanded = expandedGroups.has(catKey);
                return (
                  <div key={catKey} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setExpandedGroups((p) => { const n = new Set(p); n.has(catKey) ? n.delete(catKey) : n.add(catKey); return n; })} className="flex flex-1 items-center gap-2 text-left">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cat.label}</span>
                      </button>
                      <button type="button" onClick={() => removeGroup(catKey)} className="p-1 text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 space-y-1 border-t border-gray-100 dark:border-gray-700 pt-3">
                        {cat.products.map((product) => {
                          const isChecked = checkedProducts[product.value]?.checked;
                          return (
                            <div key={product.value} className="flex items-center gap-3 py-1">
                              <label className="flex flex-1 items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={!!isChecked} onChange={() => toggleProduct(product.value)} className="h-4 w-4 rounded border-gray-300 text-brand-800 focus:ring-brand-800" />
                                <span className={`text-sm ${isChecked ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>{product.label}</span>
                              </label>
                              {isChecked && (
                                <div className="flex items-center gap-1">
                                  <input type="number" step="0.01" min="0" max="100" placeholder="0.00" value={checkedProducts[product.value]?.commission_rate || ''} onChange={(e) => setProductRate(product.value, e.target.value)} className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-right dark:text-white outline-none focus:border-brand-800" />
                                  <span className="text-sm text-gray-400">%</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => setShowGroupPicker(true)} disabled={availableGroups.length === 0} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 active:bg-gray-50 dark:active:bg-gray-800 disabled:opacity-40">
              <Plus className="h-4 w-4" /> Add Product Group
            </button>
            <BottomSheet isOpen={showGroupPicker} onClose={() => setShowGroupPicker(false)} title="Add Product Group">
              <div className="space-y-1">
                {availableGroups.map((cat) => (
                  <button key={cat.key} type="button" onClick={() => addGroup(cat.key)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700">
                    <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">{cat.label}</span>
                    <span className="text-xs text-gray-400">{cat.products.length} products</span>
                  </button>
                ))}
              </div>
            </BottomSheet>
          </div>
        )}

        {/* Section C: Pay Schedule */}
        {distForm.name.trim() && (
          <div className="mt-6">
            <button type="button" onClick={() => setShowPay(!showPay)} className="flex w-full items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {showPay ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Pay Schedule (optional)
            </button>
            {showPay && (
              <div className="mt-3 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pay Frequency</label>
                  <select name="pay_frequency" value={payForm.pay_frequency} onChange={onPayChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20">
                    <option value="">Not set</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="semi-monthly">Semi-Monthly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {(payForm.pay_frequency === 'weekly' || payForm.pay_frequency === 'bi-weekly') && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pay Day</label>
                    <select name="pay_day" value={payForm.pay_day} onChange={onPayChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20">
                      <option value="">Select day</option>
                      <option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option>
                    </select>
                  </div>
                )}
                {payForm.pay_frequency === 'semi-monthly' && <p className="text-sm text-gray-500 dark:text-gray-400">1st & 15th of each month</p>}
                {payForm.pay_frequency === 'monthly' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Pay Day</label>
                    <select name="pay_day" value={payForm.pay_day} onChange={onPayChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20">
                      <option value="">Select day</option>
                      {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                    </select>
                  </div>
                )}
                {payForm.pay_frequency && (
                  <>
                    <Input label="First Pay Date" name="first_pay_date" type="date" value={payForm.first_pay_date} onChange={onPayChange} />
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Commission Lag</label>
                      <select name="commission_lag" value={payForm.commission_lag} onChange={onPayChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20">
                        <option value="">Not set</option>
                        <option value="current">Current Period</option>
                        <option value="1_period">1 Period Behind</option>
                        <option value="2_periods">2 Periods Behind</option>
                        <option value="30_days">30 Days</option>
                        <option value="60_days">60 Days</option>
                        <option value="90_days">90 Days</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        <div className="mt-8 flex flex-col gap-3 pb-6">
          <Button fullWidth loading={saving} onClick={handleContinue}>Continue</Button>
          <button onClick={handleSkip} className="text-center text-sm text-gray-400 dark:text-gray-500">I'll set this up later</button>
        </div>
      </StepWrapper>
    );
  }

  // Steps 4 & 5 are extracted as top-level components (Step4Facilities, Step5Surgeons)
  // to prevent search state from being lost on parent re-renders

  // ── STEP 6: YOUR CONTACTS ─────────────────────────────────────────────
  function Step6() {
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [contactForm, setContactForm] = useState({ first_name: '', last_name: '', role: '', phone: '', email: '', facility_id: '' });

    async function handleAddContact() {
      if (!contactForm.first_name.trim() || !contactForm.last_name.trim()) { setError('First and last name required'); return; }
      setSaving(true);
      setError('');
      try {
        const fullName = `${contactForm.first_name.trim()} ${contactForm.last_name.trim()}`;
        const contact = await createContact.mutateAsync({
          full_name: fullName,
          role: contactForm.role || null,
          phone: contactForm.phone || null,
          email: contactForm.email || null,
          facility_id: contactForm.facility_id || null,
          contact_type: 'facility',
        });
        setAddedContacts((p) => [...p, { id: contact.id, full_name: fullName }]);
        setContactForm({ first_name: '', last_name: '', role: '', phone: '', email: '', facility_id: '' });
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }

    return (
      <StepWrapper step={6} onBack={goBack}>
        <h1 className="mb-1 mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Your Contacts</h1>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Add key contacts at your facilities — billing contacts, OR managers, nurses</p>

        <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label={<>First Name <span className="text-red-500">*</span></>} value={contactForm.first_name} onChange={(e) => setContactForm((p) => ({ ...p, first_name: e.target.value }))} />
            <Input label={<>Last Name <span className="text-red-500">*</span></>} value={contactForm.last_name} onChange={(e) => setContactForm((p) => ({ ...p, last_name: e.target.value }))} />
          </div>
          <Input label="Role" value={contactForm.role} onChange={(e) => setContactForm((p) => ({ ...p, role: e.target.value }))} placeholder="e.g. Billing Contact, OR Manager" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" type="tel" value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} />
            <Input label="Email" type="email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          {addedFacilities.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Facility</label>
              <select value={contactForm.facility_id} onChange={(e) => setContactForm((p) => ({ ...p, facility_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800">
                <option value="">Select facility</option>
                {addedFacilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          <Button size="sm" onClick={handleAddContact} loading={saving}>Add Contact</Button>
        </div>

        {addedContacts.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{addedContacts.length} contact{addedContacts.length !== 1 ? 's' : ''} added</p>
            <div className="space-y-1.5">
              {addedContacts.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{c.full_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={() => navigate('/contacts/import')} className="mt-4 text-sm font-medium text-brand-800 dark:text-brand-400">Import from CSV</button>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        <div className="mt-6 flex flex-col gap-3 pb-6">
          <Button fullWidth onClick={() => goToStep(7)}>Continue</Button>
          <button onClick={() => setShowSkipConfirm(true)} className="text-center text-sm text-gray-400 dark:text-gray-500">Skip</button>
        </div>

        <SkipConfirmation
          isOpen={showSkipConfirm}
          onClose={() => setShowSkipConfirm(false)}
          onSkip={() => { setShowSkipConfirm(false); goToStep(7); }}
          title="Contacts make PO chasing faster"
          body={"Your billing contacts are the people you'll call and email when chasing POs. Adding them now means:\n\n• One-tap call/email when following up\n• Auto-populated contact info in chase logs\n• Never lose track of who you talked to\n\nYou can always add contacts later from the Contacts tab."}
          goBackLabel="Go Back & Add Contacts"
        />
      </StepWrapper>
    );
  }

  // ── STEP 7: MANUFACTURERS ─────────────────────────────────────────────
  function Step7() {
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [mfgForm, setMfgForm] = useState({ name: '', billing_email: '', billing_contact_name: '', billing_contact_phone: '', phone: '' });

    async function handleAddManufacturer() {
      if (!mfgForm.name.trim()) { setError('Name is required'); return; }
      setSaving(true);
      setError('');
      try {
        const mfg = await createManufacturer.mutateAsync({
          name: mfgForm.name.trim(),
          billing_email: mfgForm.billing_email || null,
          billing_contact_name: mfgForm.billing_contact_name || null,
          billing_contact_phone: mfgForm.billing_contact_phone || null,
          phone: mfgForm.phone || null,
        });
        setAddedManufacturers((p) => [...p, { id: mfg.id, name: mfg.name }]);
        setMfgForm({ name: '', billing_email: '', billing_contact_name: '', billing_contact_phone: '', phone: '' });
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }

    return (
      <StepWrapper step={7} onBack={goBack}>
        <h1 className="mb-1 mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Manufacturers</h1>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Which manufacturers make the products you sell?</p>

        <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <Input label={<>Name <span className="text-red-500">*</span></>} value={mfgForm.name} onChange={(e) => setMfgForm((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Phone" type="tel" value={mfgForm.phone} onChange={(e) => setMfgForm((p) => ({ ...p, phone: e.target.value }))} />
          <Input label="Billing Email" type="email" value={mfgForm.billing_email} onChange={(e) => setMfgForm((p) => ({ ...p, billing_email: e.target.value }))} />
          <Input label="Billing Contact Name" value={mfgForm.billing_contact_name} onChange={(e) => setMfgForm((p) => ({ ...p, billing_contact_name: e.target.value }))} />
          <Input label="Billing Contact Phone" type="tel" value={mfgForm.billing_contact_phone} onChange={(e) => setMfgForm((p) => ({ ...p, billing_contact_phone: e.target.value }))} />
          <Button size="sm" onClick={handleAddManufacturer} loading={saving}>Add Manufacturer</Button>
        </div>

        {addedManufacturers.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{addedManufacturers.length} manufacturer{addedManufacturers.length !== 1 ? 's' : ''} added</p>
            <div className="space-y-1.5">
              {addedManufacturers.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{m.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        <div className="mt-6 flex flex-col gap-3 pb-6">
          <Button fullWidth onClick={() => goToStep(8)}>Continue</Button>
          <button onClick={() => setShowSkipConfirm(true)} className="text-center text-sm text-gray-400 dark:text-gray-500">Skip</button>
        </div>

        <SkipConfirmation
          isOpen={showSkipConfirm}
          onClose={() => setShowSkipConfirm(false)}
          onSkip={() => { setShowSkipConfirm(false); goToStep(8); }}
          title="Manufacturers are where POs get sent"
          body={"When you receive a PO, MedRepDesk sends it to the manufacturer for you. Without manufacturers set up:\n\n• You'll need to manually forward POs\n• PO routing emails won't work\n• The 'Billed' step of your pipeline won't trigger\n\nYou can always add manufacturers later from the Contacts tab."}
          goBackLabel="Go Back & Add Manufacturers"
        />
      </StepWrapper>
    );
  }

  // ── STEP 8: YOUR FIRST CASE ────────────────────────────────────────────
  function Step8() {
    const [showSkipConfirm, setShowSkipConfirm] = useState(false);
    const [caseForm, setCaseForm] = useState({
      surgeon_id: '', facility_id: '', procedure_type: '',
      scheduled_date: '', scheduled_time: '', notes: '',
    });

    async function handleCreateCase() {
      if (!caseForm.surgeon_id || !caseForm.facility_id || !caseForm.scheduled_date) {
        setError('Surgeon, facility, and date are required');
        return;
      }
      setSaving(true);
      setError('');
      try {
        const c = await createCase.mutateAsync({
          surgeon_id: caseForm.surgeon_id,
          facility_id: caseForm.facility_id,
          distributor_id: distributorId || null,
          procedure_type: caseForm.procedure_type || null,
          scheduled_date: caseForm.scheduled_date,
          scheduled_time: caseForm.scheduled_time || null,
          notes: caseForm.notes || null,
        });
        setCreatedCase(c);
        await goToStep(9);
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }

    // Build procedure options from product groups
    const procedureOptions = [];
    PRODUCT_CATALOG.forEach((cat) => {
      cat.products.forEach((p) => {
        procedureOptions.push({ value: p.value, label: `${cat.label} — ${p.label}` });
      });
    });

    return (
      <StepWrapper step={8} onBack={goBack}>
        <h1 className="mb-1 mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Your First Case</h1>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Ready to add your first case?</p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Surgeon <span className="text-red-500">*</span></label>
            <select value={caseForm.surgeon_id} onChange={(e) => setCaseForm((p) => ({ ...p, surgeon_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20">
              <option value="">Select surgeon</option>
              {addedSurgeons.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Facility <span className="text-red-500">*</span></label>
            <select value={caseForm.facility_id} onChange={(e) => setCaseForm((p) => ({ ...p, facility_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20">
              <option value="">Select facility</option>
              {addedFacilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Procedure Type</label>
            <select value={caseForm.procedure_type} onChange={(e) => setCaseForm((p) => ({ ...p, procedure_type: e.target.value }))} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20">
              <option value="">Select type</option>
              {procedureOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <Input label={<>Scheduled Date <span className="text-red-500">*</span></>} name="scheduled_date" type="date" value={caseForm.scheduled_date} onChange={(e) => setCaseForm((p) => ({ ...p, scheduled_date: e.target.value }))} />
          <Input label="Scheduled Time" name="scheduled_time" type="time" value={caseForm.scheduled_time} onChange={(e) => setCaseForm((p) => ({ ...p, scheduled_time: e.target.value }))} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea value={caseForm.notes} onChange={(e) => setCaseForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Any notes..." className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20" />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        <div className="mt-6 flex flex-col gap-3 pb-6">
          <Button fullWidth loading={saving} onClick={handleCreateCase}>Create Case & Finish</Button>
          <button onClick={() => setShowSkipConfirm(true)} className="text-center text-sm text-gray-400 dark:text-gray-500">Skip</button>
        </div>

        <SkipConfirmation
          isOpen={showSkipConfirm}
          onClose={() => setShowSkipConfirm(false)}
          onSkip={() => { setShowSkipConfirm(false); goToStep(9); }}
          title="See MedRepDesk in action"
          body={"Adding your first case lets you see the full workflow — from scheduling through PO tracking to commission payment. Even a past case works!\n\nYou can add cases anytime from the Cases tab or the + button."}
          goBackLabel="Go Back & Add a Case"
        />
      </StepWrapper>
    );
  }

  // ── STEP 9: DONE! ─────────────────────────────────────────────────────
  function Step9() {
    async function handleFinish() {
      setSaving(true);
      try {
        await updateUser.mutateAsync({ onboarding_completed: true, onboarding_step: 9 });
        // Force reload to refresh user state in AuthContext
        window.location.href = '/dashboard';
      } catch (err) {
        setError(err.message);
        setSaving(false);
      }
    }

    const items = [];
    if (distributorId) items.push('1 distributor');
    if (productGroupCount > 0) items.push(`${productGroupCount} product group${productGroupCount !== 1 ? 's' : ''}`);
    if (addedFacilities.length > 0) items.push(`${addedFacilities.length} facilit${addedFacilities.length === 1 ? 'y' : 'ies'}`);
    if (addedSurgeons.length > 0) items.push(`${addedSurgeons.length} surgeon${addedSurgeons.length !== 1 ? 's' : ''}`);
    if (addedContacts.length > 0) items.push(`${addedContacts.length} contact${addedContacts.length !== 1 ? 's' : ''}`);
    if (addedManufacturers.length > 0) items.push(`${addedManufacturers.length} manufacturer${addedManufacturers.length !== 1 ? 's' : ''}`);
    if (createdCase) items.push('1 case');

    return (
      <StepWrapper step={9} onBack={goBack}>
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 animate-bounce">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">You're all set!</h1>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">Your MedRepDesk account is ready to go</p>

          {items.length > 0 && (
            <div className="mb-8 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left">
              <h2 className="mb-2 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">Setup Summary</h2>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          <div className="w-full">
            <Button fullWidth loading={saving} onClick={handleFinish}>Go to Dashboard</Button>
          </div>
        </div>
      </StepWrapper>
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────
  switch (step) {
    case 1: return <Step1 />;
    case 2: return <Step2 />;
    case 3: return <Step3 />;
    case 4: return <Step4Facilities userState={userState} addedFacilities={addedFacilities} setAddedFacilities={setAddedFacilities} importGlobalFacility={importGlobalFacility} createFacility={createFacility} goToStep={goToStep} goBack={goBack} />;
    case 5: return <Step5Surgeons userState={userState} addedSurgeons={addedSurgeons} setAddedSurgeons={setAddedSurgeons} addedFacilities={addedFacilities} importGlobalSurgeon={importGlobalSurgeon} createSurgeon={createSurgeon} goToStep={goToStep} goBack={goBack} />;
    case 6: return <Step6 />;
    case 7: return <Step7 />;
    case 8: return <Step8 />;
    case 9: return <Step9 />;
    default: return <Step1 />;
  }
}
