import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useContact, useCreateContact, useUpdateContact } from '@/hooks/useContacts';
import { useFacilities } from '@/hooks/useFacilities';
import { useDistributors } from '@/hooks/useDistributors';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { contactInsertSchema } from '@/lib/schemas';

export default function ContactForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing } = useContact(isEdit ? id : null);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const { data: facilities = [] } = useFacilities();
  const { data: distributors = [] } = useDistributors();

  const [form, setForm] = useState({
    full_name: '',
    role: '',
    facility_id: '',
    distributor_id: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (existing && isEdit) {
      setForm({
        full_name: existing.full_name || '',
        role: existing.role || '',
        facility_id: existing.facility_id || '',
        distributor_id: existing.distributor_id || '',
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

    const payload = {
      full_name: DOMPurify.sanitize(form.full_name.trim()),
      role: form.role ? DOMPurify.sanitize(form.role.trim()) : null,
      facility_id: form.facility_id || null,
      distributor_id: form.distributor_id || null,
      phone: form.phone || null,
      email: form.email || null,
      notes: form.notes ? DOMPurify.sanitize(form.notes) : null,
    };

    if (!payload.full_name) {
      setErrors({ full_name: 'Name is required' });
      return;
    }

    try {
      if (isEdit) {
        await updateContact.mutateAsync({ id, ...payload });
        navigate(`/contacts/${id}`, { replace: true });
      } else {
        const created = await createContact.mutateAsync(payload);
        navigate(`/contacts/${created.id}`, { replace: true });
      }
    } catch (err) {
      setServerError(err.message);
    }
  }

  const facilityOpts = facilities.map((f) => ({ value: f.id, label: f.name }));
  const distributorOpts = distributors.map((d) => ({ value: d.id, label: d.name }));
  const isPending = createContact.isPending || updateContact.isPending;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {isEdit ? 'Edit Contact' : 'New Contact'}
        </h1>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full Name" name="full_name" value={form.full_name} onChange={onChange} error={errors.full_name} placeholder="Jane Smith" />
          <Input label="Role" name="role" value={form.role} onChange={onChange} placeholder="OR Scheduler, Billing Manager, etc." />
          <SearchableSelect label="Facility" options={facilityOpts} value={form.facility_id} onChange={(v) => setForm((p) => ({ ...p, facility_id: v }))} placeholder="Select facility" />
          <SearchableSelect label="Distributor" options={distributorOpts} value={form.distributor_id} onChange={(v) => setForm((p) => ({ ...p, distributor_id: v }))} placeholder="Select distributor" />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} placeholder="801-555-0100" />
          <Input label="Email" name="email" type="email" value={form.email} onChange={onChange} placeholder="jane@example.com" />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea name="notes" rows={3} value={form.notes} onChange={onChange} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20" placeholder="Notes..." />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={isPending}>{isEdit ? 'Save' : 'Add Contact'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
