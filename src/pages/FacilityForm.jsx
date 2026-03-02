import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useFacility, useCreateFacility, useUpdateFacility } from '@/hooks/useFacilities';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const FACILITY_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'asc', label: 'ASC' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'other', label: 'Other' },
];

export default function FacilityForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing } = useFacility(isEdit ? id : null);
  const create = useCreateFacility();
  const update = useUpdateFacility();

  const [form, setForm] = useState({
    name: '', facility_type: '', address: '', city: '', state: '', phone: '', billing_phone: '', notes: '',
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
      });
    }
  }, [existing, isEdit]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    if (!form.name.trim()) { setErrors({ name: 'Name is required' }); return; }

    const payload = {
      name: DOMPurify.sanitize(form.name.trim()),
      facility_type: form.facility_type || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      phone: form.phone || null,
      billing_phone: form.billing_phone || null,
      notes: form.notes ? DOMPurify.sanitize(form.notes) : null,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      navigate('/facilities', { replace: true });
    } catch (err) {
      setServerError(err.message);
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1"><ArrowLeft className="h-5 w-5 text-gray-600" /></button>
        <h1 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Facility' : 'New Facility'}</h1>
      </div>

      {serverError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Name" name="name" value={form.name} onChange={onChange} error={errors.name} placeholder="University Hospital" />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
            <select name="facility_type" value={form.facility_type} onChange={onChange} className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20">
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
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20" />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isPending}>{isEdit ? 'Save' : 'Add Facility'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
