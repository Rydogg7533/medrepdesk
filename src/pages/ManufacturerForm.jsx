import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useManufacturer, useManufacturers, useCreateManufacturer, useUpdateManufacturer } from '@/hooks/useManufacturers';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ActiveToggle from '@/components/ui/ActiveToggle';
import DuplicateBanner from '@/components/ui/DuplicateBanner';
import { findFuzzyDuplicate } from '@/utils/fuzzyMatch';

export default function ManufacturerForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing } = useManufacturer(isEdit ? id : null);
  const { data: allManufacturers = [] } = useManufacturers();
  const create = useCreateManufacturer();
  const update = useUpdateManufacturer();

  const [form, setForm] = useState({
    name: '', billing_email: '', billing_contact_name: '', billing_contact_phone: '',
    notes: '', is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name || '',
        billing_email: existing.billing_email || '',
        billing_contact_name: existing.billing_contact_name || '',
        billing_contact_phone: existing.billing_contact_phone || '',
        notes: existing.notes || '',
        is_active: existing.is_active !== false,
      });
    }
  }, [existing, isEdit]);

  const duplicateMatch = useMemo(
    () => findFuzzyDuplicate(form.name, allManufacturers, 'name', isEdit ? id : null),
    [form.name, allManufacturers, id, isEdit]
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

    if (!form.name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }

    if (duplicateMatch?.isActive) return;

    const sanitize = (v) => v ? DOMPurify.sanitize(v.trim()) : null;

    const payload = {
      name: DOMPurify.sanitize(form.name.trim()),
      billing_email: sanitize(form.billing_email),
      billing_contact_name: sanitize(form.billing_contact_name),
      billing_contact_phone: sanitize(form.billing_contact_phone),
      is_active: form.is_active,
      notes: sanitize(form.notes),
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
        <button onClick={goBack} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {isEdit ? 'Edit Manufacturer' : 'New Manufacturer'}
        </h1>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Name"
            name="name"
            value={form.name}
            onChange={onChange}
            error={errors.name}
            placeholder="e.g. Stryker, Medtronic"
          />
          {duplicateMatch && (
            <DuplicateBanner match={duplicateMatch} onReactivate={handleReactivate} reactivating={update.isPending} />
          )}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Billing & PO Contact</h3>
            <div className="flex flex-col gap-4">
              <Input label="Billing Email" name="billing_email" type="email" value={form.billing_email} onChange={onChange} placeholder="billing@manufacturer.com" />
              <Input label="Billing Contact Name" name="billing_contact_name" value={form.billing_contact_name} onChange={onChange} />
              <Input label="Billing Contact Phone" name="billing_contact_phone" type="tel" value={form.billing_contact_phone} onChange={onChange} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
            <ActiveToggle
              isActive={form.is_active}
              onToggle={(val) => setForm((p) => ({ ...p, is_active: val }))}
              size="md"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              value={form.notes}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={goBack}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isPending} disabled={duplicateMatch?.isActive}>
              {isEdit ? 'Save' : 'Add Manufacturer'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
