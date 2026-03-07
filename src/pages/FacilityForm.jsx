import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { sanitizeText } from '@/utils/sanitize';
import { useFacility, useFacilities, useCreateFacility, useUpdateFacility } from '@/hooks/useFacilities';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ActiveToggle from '@/components/ui/ActiveToggle';
import DuplicateBanner from '@/components/ui/DuplicateBanner';
import { findFuzzyDuplicate } from '@/utils/fuzzyMatch';

const FACILITY_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'asc', label: 'ASC' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'other', label: 'Other' },
];

export default function FacilityForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing } = useFacility(isEdit ? id : null);
  const { data: allFacilities = [] } = useFacilities();
  const create = useCreateFacility();
  const update = useUpdateFacility();

  const [form, setForm] = useState({
    name: '', facility_type: '', address: '', city: '', state: '', phone: '', billing_phone: '', notes: '', is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name || '',
        facility_type: existing.facility_type || '',
        address: existing.address || '',
        city: existing.city || '',
        state: existing.state || '',
        phone: existing.phone || '',
        billing_phone: existing.billing_phone || '',
        notes: existing.notes || '',
        is_active: existing.is_active !== false,
      });
    }
  }, [existing, isEdit]);

  const duplicateMatch = useMemo(
    () => findFuzzyDuplicate(form.name, allFacilities, 'name', isEdit ? id : null),
    [form.name, allFacilities, id, isEdit]
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

    if (!form.name.trim()) { setErrors({ name: 'Name is required' }); return; }

    if (duplicateMatch?.isActive) return;

    const payload = {
      name: sanitizeText(form.name.trim()),
      facility_type: form.facility_type || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      phone: form.phone || null,
      billing_phone: form.billing_phone || null,
      is_active: form.is_active,
      notes: sanitizeText(form.notes),
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

  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={goBack} className="min-h-touch p-1"><ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" /></button>
        <h1 className="page-bg-text text-lg font-bold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit Facility' : 'New Facility'}</h1>
      </div>

      {serverError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Name" name="name" value={form.name} onChange={onChange} error={errors.name} placeholder="University Hospital" />
          {duplicateMatch && (
            <DuplicateBanner match={duplicateMatch} onReactivate={handleReactivate} reactivating={update.isPending} />
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Type</label>
            <select name="facility_type" value={form.facility_type} onChange={onChange} className="min-h-touch w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20">
              <option value="">Select type</option>
              {FACILITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <Input label="Address" name="address" value={form.address} onChange={onChange} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" name="city" value={form.city} onChange={onChange} />
            <Input label="State" name="state" value={form.state} onChange={onChange} placeholder="UT" />
          </div>
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} />
          <Input label="Billing Phone" name="billing_phone" type="tel" value={form.billing_phone} onChange={onChange} />
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
            <Button type="submit" className="flex-1" loading={isPending} disabled={duplicateMatch?.isActive}>{isEdit ? 'Save' : 'Add Facility'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
