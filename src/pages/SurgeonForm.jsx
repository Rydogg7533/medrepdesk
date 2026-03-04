import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useSurgeon, useSurgeons, useCreateSurgeon, useUpdateSurgeon } from '@/hooks/useSurgeons';
import { useSearchFacilities } from '@/hooks/useFacilities';
import { useRepStates } from '@/hooks/useRepStates';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import ActiveToggle from '@/components/ui/ActiveToggle';
import DuplicateBanner from '@/components/ui/DuplicateBanner';
import { findFuzzyDuplicate } from '@/utils/fuzzyMatch';
import { SURGEON_SPECIALTIES, SURGEON_PREFIXES } from '@/utils/constants';

export default function SurgeonForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing } = useSurgeon(isEdit ? id : null);
  const { data: allSurgeons = [] } = useSurgeons();
  const create = useCreateSurgeon();
  const update = useUpdateSurgeon();
  const { data: repStates = [] } = useRepStates();
  const facilitySearch = useSearchFacilities({ filterStates: repStates });

  const [form, setForm] = useState({
    prefix: '', first_name: '', last_name: '', specialty: '', primary_facility_id: '',
    phone: '', email: '', notes: '', is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const facilityInitialLabel = existing?.primary_facility?.name || '';

  useEffect(() => {
    if (existing && isEdit) {
      // Parse full_name back into prefix/first/last
      let prefix = '';
      let first_name = '';
      let last_name = '';
      const fullName = existing.full_name || '';
      const prefixMatch = fullName.match(/^(Dr\.)\s+/i);
      if (prefixMatch) {
        prefix = 'Dr.';
        const rest = fullName.slice(prefixMatch[0].length).trim();
        const parts = rest.split(/\s+/);
        last_name = parts.pop() || '';
        first_name = parts.join(' ');
      } else {
        const parts = fullName.split(/\s+/);
        last_name = parts.pop() || '';
        first_name = parts.join(' ');
      }

      setForm({
        prefix,
        first_name,
        last_name,
        specialty: existing.specialty || '',
        primary_facility_id: existing.primary_facility_id || '',
        phone: existing.phone || '',
        email: existing.email || '',
        notes: existing.notes || '',
        is_active: existing.is_active !== false,
      });
    }
  }, [existing, isEdit]);

  const computedFullName = [form.prefix, form.first_name, form.last_name].filter(Boolean).join(' ').trim();

  const duplicateMatch = useMemo(
    () => findFuzzyDuplicate(computedFullName, allSurgeons, 'full_name', isEdit ? id : null),
    [computedFullName, allSurgeons, id, isEdit]
  );

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function goBack() {
    const returnTab = searchParams.get('returnTab');
    if (returnTab) {
      navigate(`/contacts?tab=${returnTab}`, { replace: true });
    } else {
      navigate(-1);
    }
  }

  async function handleReactivate(record) {
    try {
      await update.mutateAsync({ id: record.id, is_active: true });
      goBack();
    } catch (err) {
      setServerError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    if (!form.last_name.trim()) {
      setErrors({ last_name: 'Last name is required' });
      return;
    }

    if (duplicateMatch?.isActive) return;

    const full_name = computedFullName;

    const payload = {
      full_name: DOMPurify.sanitize(full_name),
      specialty: form.specialty || null,
      primary_facility_id: form.primary_facility_id || null,
      phone: form.phone || null,
      email: form.email || null,
      is_active: form.is_active,
      notes: form.notes ? DOMPurify.sanitize(form.notes) : null,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      goBack();
    } catch (err) {
      setServerError(err.message);
    }
  }

  const specialtyOpts = SURGEON_SPECIALTIES.map((s) => ({ value: s.value, label: s.label }));
  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={goBack} className="min-h-touch p-1"><ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" /></button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit Surgeon' : 'New Surgeon'}</h1>
      </div>

      {serverError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Prefix</label>
            <select
              name="prefix"
              value={form.prefix}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            >
              {SURGEON_PREFIXES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <Input label="First Name" name="first_name" value={form.first_name} onChange={onChange} placeholder="Jane" />
          <Input label="Last Name" name="last_name" value={form.last_name} onChange={onChange} error={errors.last_name} placeholder="Smith" />
          {computedFullName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Full name: {computedFullName}</p>
          )}
          {duplicateMatch && (
            <DuplicateBanner match={duplicateMatch} onReactivate={handleReactivate} reactivating={update.isPending} />
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Specialty</label>
            <select
              name="specialty"
              value={form.specialty}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            >
              <option value="">Select specialty</option>
              {specialtyOpts.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <SearchableSelect
            label="Primary Facility"
            options={facilitySearch.results}
            value={form.primary_facility_id}
            onChange={(v) => setForm((p) => ({ ...p, primary_facility_id: v }))}
            placeholder="Search facilities..."
            onSearch={facilitySearch.search}
            isSearching={facilitySearch.isSearching}
            minChars={3}
            initialLabel={facilityInitialLabel}
          />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={onChange} />
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
            <ActiveToggle isActive={form.is_active} onToggle={(val) => setForm((p) => ({ ...p, is_active: val }))} size="md" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
            <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20" />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={goBack}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isPending} disabled={duplicateMatch?.isActive}>{isEdit ? 'Save' : 'Add Surgeon'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
