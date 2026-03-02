import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useSurgeon, useCreateSurgeon, useUpdateSurgeon } from '@/hooks/useSurgeons';
import { useFacilities } from '@/hooks/useFacilities';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function SurgeonForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing } = useSurgeon(isEdit ? id : null);
  const create = useCreateSurgeon();
  const update = useUpdateSurgeon();
  const { data: facilities = [] } = useFacilities();

  const [form, setForm] = useState({
    full_name: '', specialty: '', primary_facility_id: '', phone: '', email: '', notes: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        full_name: existing.full_name || '',
        specialty: existing.specialty || '',
        primary_facility_id: existing.primary_facility_id || '',
        phone: existing.phone || '',
        email: existing.email || '',
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

    if (!form.full_name.trim()) { setErrors({ full_name: 'Name is required' }); return; }

    const payload = {
      full_name: DOMPurify.sanitize(form.full_name.trim()),
      specialty: form.specialty || null,
      primary_facility_id: form.primary_facility_id || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes ? DOMPurify.sanitize(form.notes) : null,
    };

    try {
      if (isEdit) {
        await update.mutateAsync({ id, ...payload });
      } else {
        await create.mutateAsync(payload);
      }
      navigate('/surgeons', { replace: true });
    } catch (err) {
      setServerError(err.message);
    }
  }

  const facilityOpts = facilities.map((f) => ({ value: f.id, label: f.name }));
  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1"><ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" /></button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{isEdit ? 'Edit Surgeon' : 'New Surgeon'}</h1>
      </div>

      {serverError && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full Name" name="full_name" value={form.full_name} onChange={onChange} error={errors.full_name} placeholder="Dr. Jane Smith" />
          <Input label="Specialty" name="specialty" value={form.specialty} onChange={onChange} placeholder="Orthopedic Surgery" />
          <SearchableSelect label="Primary Facility" options={facilityOpts} value={form.primary_facility_id} onChange={(v) => setForm((p) => ({ ...p, primary_facility_id: v }))} placeholder="Select facility" />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={onChange} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Notes</label>
            <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20" />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isPending}>{isEdit ? 'Save' : 'Add Surgeon'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
