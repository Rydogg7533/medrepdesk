import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Sparkles, Wand2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { caseInsertSchema } from '@/lib/schemas';
import { useCase, useCreateCase, useUpdateCase } from '@/hooks/useCases';
import { useSurgeons } from '@/hooks/useSurgeons';
import { useFacilities } from '@/hooks/useFacilities';
import { useDistributors } from '@/hooks/useDistributors';
import { useSmartCaseEntry } from '@/hooks/useAI';
import { useAuth } from '@/context/AuthContext';
import { canUseAIExtraction, getRemainingExtractions } from '@/utils/planLimits';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { PROCEDURE_TYPES } from '@/utils/constants';

export default function CaseForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existingCase } = useCase(isEdit ? id : null);
  const createCase = useCreateCase();
  const updateCase = useUpdateCase();
  const { data: surgeons = [] } = useSurgeons({ activeOnly: true });
  const { data: facilities = [] } = useFacilities({ activeOnly: true });
  const { data: distributors = [] } = useDistributors({ activeOnly: true });

  const [form, setForm] = useState({
    surgeon_id: '',
    facility_id: '',
    distributor_id: '',
    procedure_type: '',
    scheduled_date: '',
    time_hour: '',
    time_minute: '',
    time_period: 'AM',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [entryMode, setEntryMode] = useState('quick');
  const [quickText, setQuickText] = useState('');
  const [parseBanner, setParseBanner] = useState('');

  const { account } = useAuth();
  const smartEntry = useSmartCaseEntry();
  const aiLimitReached = !canUseAIExtraction(account);
  const remainingExtractions = getRemainingExtractions(account);

  function convertScheduledTime(time24) {
    if (!time24) return {};
    const [h, m] = time24.split(':');
    const h24 = parseInt(h);
    const period = h24 >= 12 ? 'PM' : 'AM';
    const hour = String(h24 % 12 || 12);
    const minute = m?.slice(0, 2) || '00';
    return { time_hour: hour, time_minute: minute, time_period: period };
  }

  async function handleParse() {
    if (!quickText.trim()) return;
    setParseBanner('');
    try {
      const result = await smartEntry.mutateAsync(quickText);
      const timeFields = convertScheduledTime(result.scheduled_time);
      setForm((prev) => ({
        ...prev,
        surgeon_id: result.surgeon_id || prev.surgeon_id,
        facility_id: result.facility_id || prev.facility_id,
        distributor_id: result.distributor_id || prev.distributor_id,
        procedure_type: result.procedure_type || prev.procedure_type,
        scheduled_date: result.scheduled_date || prev.scheduled_date,
        notes: result.notes || prev.notes,
        ...timeFields,
      }));
      setEntryMode('manual');
      setParseBanner('Case parsed successfully - review fields below');
    } catch (err) {
      setServerError(err.message);
    }
  }

  useEffect(() => {
    if (existingCase && isEdit) {
      let hour = '', minute = '', period = 'AM';
      if (existingCase.scheduled_time) {
        const [h, m] = existingCase.scheduled_time.split(':');
        const h24 = parseInt(h);
        period = h24 >= 12 ? 'PM' : 'AM';
        hour = String(h24 % 12 || 12);
        minute = m?.slice(0, 2) || '00';
      }
      setForm({
        surgeon_id: existingCase.surgeon_id || '',
        facility_id: existingCase.facility_id || '',
        distributor_id: existingCase.distributor_id || '',
        procedure_type: existingCase.procedure_type || '',
        scheduled_date: existingCase.scheduled_date || '',
        time_hour: hour,
        time_minute: minute,
        time_period: period,
        notes: existingCase.notes || '',
      });
    }
  }, [existingCase, isEdit]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    let scheduled_time = null;
    if (form.time_hour && form.time_minute) {
      let h = parseInt(form.time_hour);
      if (form.time_period === 'PM' && h !== 12) h += 12;
      if (form.time_period === 'AM' && h === 12) h = 0;
      scheduled_time = `${String(h).padStart(2, '0')}:${form.time_minute}`;
    }

    const payload = {
      surgeon_id: form.surgeon_id || null,
      facility_id: form.facility_id || null,
      distributor_id: form.distributor_id || null,
      procedure_type: form.procedure_type || null,
      scheduled_date: form.scheduled_date || null,
      scheduled_time,
      notes: form.notes ? DOMPurify.sanitize(form.notes) : null,
    };

    try {
      if (isEdit) {
        await updateCase.mutateAsync({ id, ...payload });
        navigate(`/cases/${id}`, { replace: true });
      } else {
        const created = await createCase.mutateAsync(payload);
        navigate(`/cases/${created.id}`, { replace: true });
      }
    } catch (err) {
      setServerError(err.message);
    }
  }

  const surgeonOpts = surgeons.map((s) => ({ value: s.id, label: s.full_name }));
  const facilityOpts = facilities.map((f) => ({ value: f.id, label: f.name }));
  const distributorOpts = distributors.map((d) => ({ value: d.id, label: d.name }));

  const isPending = createCase.isPending || updateCase.isPending;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {isEdit ? 'Edit Case' : 'New Case'}
        </h1>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-400">{serverError}</div>
      )}

      {parseBanner && (
        <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">
          {parseBanner}
        </div>
      )}

      {!isEdit && (
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setEntryMode('quick')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              entryMode === 'quick'
                ? 'bg-brand-800 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            <Sparkles className="h-4 w-4" /> Quick Entry
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('manual')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              entryMode === 'manual'
                ? 'bg-brand-800 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Manual
          </button>
        </div>
      )}

      {!isEdit && entryMode === 'quick' && (
        <Card className="mb-4">
          <div className="flex flex-col gap-3">
            <textarea
              rows={3}
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              placeholder="Describe the case in plain English... e.g. Dr. Chen, hip replacement at IMC next Tuesday 7:30am, Stryker, $18k"
            />
            {aiLimitReached ? (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 p-3 text-sm text-amber-700 dark:text-amber-400">
                AI limit reached — upgrade your plan for more extractions.
              </div>
            ) : (
              <>
                {smartEntry.isPending ? (
                  <div className="flex items-center justify-center gap-2 py-3">
                    <div className="h-5 w-5 animate-pulse rounded-full bg-brand-800" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">Parsing with AI...</span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={handleParse}
                    disabled={!quickText.trim()}
                    className="flex items-center justify-center gap-2"
                  >
                    <Wand2 className="h-4 w-4" /> Parse with AI
                  </Button>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {remainingExtractions} AI extraction{remainingExtractions !== 1 ? 's' : ''} remaining this month
                </p>
              </>
            )}
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SearchableSelect
            label="Surgeon"
            options={surgeonOpts}
            value={form.surgeon_id}
            onChange={(v) => { setForm((p) => ({ ...p, surgeon_id: v })); }}
            placeholder="Select surgeon"
            onAddNew={() => navigate('/surgeons/new')}
            allRecords={surgeons}
            allRecordsNameField="full_name"
          />
          <SearchableSelect
            label="Facility"
            options={facilityOpts}
            value={form.facility_id}
            onChange={(v) => { setForm((p) => ({ ...p, facility_id: v })); }}
            placeholder="Select facility"
            onAddNew={() => navigate('/facilities/new')}
            allRecords={facilities}
            allRecordsNameField="name"
          />
          <SearchableSelect
            label="Distributor"
            options={distributorOpts}
            value={form.distributor_id}
            onChange={(v) => { setForm((p) => ({ ...p, distributor_id: v })); }}
            placeholder="Select distributor"
            onAddNew={() => navigate('/distributors/new')}
            allRecords={distributors}
            allRecordsNameField="name"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Procedure Type
            </label>
            <select
              name="procedure_type"
              value={form.procedure_type}
              onChange={onChange}
              className="min-h-touch w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            >
              <option value="">Select type</option>
              {PROCEDURE_TYPES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Date"
            name="scheduled_date"
            type="date"
            value={form.scheduled_date}
            onChange={onChange}
            error={errors.scheduled_date}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Time</label>
            <div className="flex gap-2">
              <select
                value={form.time_hour}
                onChange={(e) => setForm((p) => ({ ...p, time_hour: e.target.value }))}
                className="min-h-touch flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              >
                <option value="">Hr</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <select
                value={form.time_minute}
                onChange={(e) => setForm((p) => ({ ...p, time_minute: e.target.value }))}
                className="min-h-touch flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2.5 text-sm dark:text-white outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              >
                <option value="">Min</option>
                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={form.time_period}
                onChange={(e) => setForm((p) => ({ ...p, time_period: e.target.value }))}
                className="min-h-touch rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2.5 text-sm dark:text-white font-medium outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              name="notes"
              rows={3}
              value={form.notes}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isPending}>
              {isEdit ? 'Save' : 'Create Case'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
