import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useDistributor, useDistributors, useCreateDistributor, useUpdateDistributor } from '@/hooks/useDistributors';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ContactAutocomplete from '@/components/ui/ContactAutocomplete';
import ActiveToggle from '@/components/ui/ActiveToggle';
import DuplicateBanner from '@/components/ui/DuplicateBanner';
import { findFuzzyDuplicate } from '@/utils/fuzzyMatch';

export default function DistributorForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing } = useDistributor(isEdit ? id : null);
  const { data: allDistributors = [] } = useDistributors();
  const create = useCreateDistributor();
  const update = useUpdateDistributor();

  const [form, setForm] = useState({
    name: '',
    billing_email: '',
    billing_email_cc: '',
    billing_contact_name: '',
    billing_contact_phone: '',
    default_commission_type: 'percentage',
    default_commission_rate: '',
    default_flat_amount: '',
    notes: '',
    is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        name: existing.name || '',
        billing_email: existing.billing_email || '',
        billing_email_cc: existing.billing_email_cc?.join(', ') || '',
        billing_contact_name: existing.billing_contact_name || '',
        billing_contact_phone: existing.billing_contact_phone || '',
        default_commission_type: existing.default_commission_type || 'percentage',
        default_commission_rate: existing.default_commission_rate ?? '',
        default_flat_amount: existing.default_flat_amount ?? '',
        notes: existing.notes || '',
        is_active: existing.is_active !== false,
      });
    }
  }, [existing, isEdit]);

  const duplicateMatch = useMemo(
    () => findFuzzyDuplicate(form.name, allDistributors, 'name', isEdit ? id : null),
    [form.name, allDistributors, id, isEdit]
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

    const ccArray = form.billing_email_cc
      ? form.billing_email_cc.split(',').map((e) => e.trim()).filter(Boolean)
      : null;

    const payload = {
      name: DOMPurify.sanitize(form.name.trim()),
      billing_email: form.billing_email || null,
      billing_email_cc: ccArray,
      billing_contact_name: form.billing_contact_name || null,
      billing_contact_phone: form.billing_contact_phone || null,
      default_commission_type: form.default_commission_type,
      default_commission_rate: form.default_commission_type === 'percentage' && form.default_commission_rate
        ? Number(form.default_commission_rate) : null,
      default_flat_amount: form.default_commission_type === 'flat' && form.default_flat_amount
        ? Number(form.default_flat_amount) : null,
      is_active: form.is_active,
      notes: form.notes ? DOMPurify.sanitize(form.notes) : null,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id, ...payload });
        navigate(`/distributors/${id}`, { replace: true });
      } else {
        const created = await create.mutateAsync(payload);
        navigate(`/distributors/${created.id}`, { replace: true });
      }
    } catch (err) {
      setServerError(err.message);
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={goBack} className="min-h-touch p-1"><ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" /></button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit Distributor' : 'New Distributor'}</h1>
      </div>

      {serverError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Name" name="name" value={form.name} onChange={onChange} error={errors.name} placeholder="e.g. Stryker" />
          {duplicateMatch && (
            <DuplicateBanner match={duplicateMatch} onReactivate={handleReactivate} reactivating={update.isPending} />
          )}
          <Input label="Billing Email" name="billing_email" type="email" value={form.billing_email} onChange={onChange} placeholder="billing@example.com" />
          <Input label="Billing CC (comma-separated)" name="billing_email_cc" value={form.billing_email_cc} onChange={onChange} placeholder="a@example.com, b@example.com" />
          <ContactAutocomplete
            label="Billing Contact Name"
            value={form.billing_contact_name}
            distributorId={isEdit ? id : undefined}
            placeholder="Search or type contact name"
            onSelect={(contact) =>
              setForm((p) => ({
                ...p,
                billing_contact_name: contact.full_name,
                billing_contact_phone: contact.phone || p.billing_contact_phone,
              }))
            }
            onTextChange={(text) =>
              setForm((p) => ({ ...p, billing_contact_name: text }))
            }
          />
          <Input label="Billing Contact Phone" name="billing_contact_phone" type="tel" value={form.billing_contact_phone} onChange={onChange} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Commission Type</label>
            <div className="flex gap-2">
              {['percentage', 'flat'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, default_commission_type: t }))}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    form.default_commission_type === t ? 'bg-brand-800 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t === 'percentage' ? 'Percentage' : 'Flat Rate'}
                </button>
              ))}
            </div>
          </div>

          {form.default_commission_type === 'percentage' ? (
            <Input label="Rate (%)" name="default_commission_rate" type="number" step="0.01" value={form.default_commission_rate} onChange={onChange} placeholder="25.00" />
          ) : (
            <Input label="Flat Amount ($)" name="default_flat_amount" type="number" step="0.01" value={form.default_flat_amount} onChange={onChange} placeholder="1500.00" />
          )}

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
            <Button type="submit" className="flex-1" loading={isPending} disabled={duplicateMatch?.isActive}>{isEdit ? 'Save' : 'Add Distributor'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
