import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { sanitizeText } from '@/utils/sanitize';
import { useContact, useCreateContact, useUpdateContact } from '@/hooks/useContacts';
import { useSearchFacilities } from '@/hooks/useFacilities';
import { useManufacturers } from '@/hooks/useManufacturers';
import { useSearchSurgeons } from '@/hooks/useSurgeons';
import { useRepStates } from '@/hooks/useRepStates';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import ActiveToggle from '@/components/ui/ActiveToggle';
import { contactInsertSchema } from '@/lib/schemas';

const PREFIXES = ['', 'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'PA', 'NP', 'RN'];

const PREFIX_SET = new Set(PREFIXES.filter(Boolean).map((p) => p.toLowerCase()));

function parseFullName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/);
  if (parts.length === 0 || (parts.length === 1 && !parts[0])) {
    return { prefix: '', firstName: '', lastName: '' };
  }
  if (PREFIX_SET.has(parts[0].toLowerCase())) {
    return {
      prefix: PREFIXES.find((p) => p.toLowerCase() === parts[0].toLowerCase()) || parts[0],
      firstName: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
      lastName: parts.length > 1 ? parts[parts.length - 1] : '',
    };
  }
  if (parts.length === 1) {
    return { prefix: '', firstName: '', lastName: parts[0] };
  }
  return {
    prefix: '',
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

export default function ContactForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existing } = useContact(isEdit ? id : null);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const { data: repStates = [] } = useRepStates();
  const facilitySearch = useSearchFacilities({ filterStates: repStates });
  const { data: manufacturers = [] } = useManufacturers({ activeOnly: true });
  const surgeonSearch = useSearchSurgeons({ filterStates: repStates });

  const [contactType, setContactType] = useState(''); // 'facility' | 'distributor' | 'manufacturer' | 'surgeon_office'
  const [form, setForm] = useState({
    prefix: '',
    first_name: '',
    last_name: '',
    role: '',
    facility_id: '',
    distributor_id: '',
    manufacturer_id: '',
    surgeon_id: '',
    phone: '',
    email: '',
    notes: '',
    is_active: true,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const facilityInitialLabel = existing?.facility?.name || '';
  const surgeonInitialLabel = existing?.surgeon?.full_name || '';

  useEffect(() => {
    if (existing && isEdit) {
      const { prefix, firstName, lastName } = parseFullName(existing.full_name);
      setContactType(
        existing.contact_type || (existing.surgeon_id ? 'surgeon_office' : existing.facility_id ? 'facility' : existing.distributor_id ? 'distributor' : existing.manufacturer_id ? 'manufacturer' : '')
      );
      setForm({
        prefix,
        first_name: firstName,
        last_name: lastName,
        role: existing.role || '',
        facility_id: existing.facility_id || '',
        distributor_id: existing.distributor_id || '',
        manufacturer_id: existing.manufacturer_id || '',
        surgeon_id: existing.surgeon_id || '',
        phone: existing.phone || '',
        email: existing.email || '',
        notes: existing.notes || '',
        is_active: existing.is_active !== false,
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

    const prefix = form.prefix.trim();
    const first = form.first_name.trim();
    const last = form.last_name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();

    const newErrors = {};
    if (!last) newErrors.last_name = 'Last name is required';
    if (!phone && !email) newErrors.phone = 'Please add a phone number or email address';
    if (!contactType) newErrors.contact_type = 'Please select a contact type';
    else if (contactType === 'facility' && !form.facility_id) newErrors.facility_id = 'Please select a facility';
    else if (contactType === 'manufacturer' && !form.manufacturer_id) newErrors.manufacturer_id = 'Please select a manufacturer';
    else if (contactType === 'surgeon_office' && !form.surgeon_id) newErrors.surgeon_id = 'Please select a surgeon';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const fullName = [prefix, first, last].filter(Boolean).join(' ');

    const payload = {
      full_name: sanitizeText(fullName),
      role: sanitizeText(form.role?.trim()),
      contact_type: contactType || null,
      facility_id: contactType === 'facility' ? form.facility_id || null : null,
      distributor_id: contactType === 'distributor' ? form.distributor_id || null : null,
      manufacturer_id: contactType === 'manufacturer' ? form.manufacturer_id || null : null,
      surgeon_id: contactType === 'surgeon_office' ? form.surgeon_id || null : null,
      phone: phone || null,
      email: email || null,
      is_active: form.is_active,
      notes: sanitizeText(form.notes),
    };

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

  const manufacturerOpts = manufacturers.map((m) => ({ value: m.id, label: m.name }));
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
          <div className="grid grid-cols-[5.5rem_1fr_1fr] gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Prefix</label>
              <select
                name="prefix"
                value={form.prefix}
                onChange={onChange}
                className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-2 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {PREFIXES.map((p) => (
                  <option key={p} value={p}>{p || '—'}</option>
                ))}
              </select>
            </div>
            <Input label="First Name" name="first_name" value={form.first_name} onChange={onChange} placeholder="Jane" />
            <Input label={<>Last Name <span className="text-red-500">*</span></>} name="last_name" value={form.last_name} onChange={onChange} error={errors.last_name} placeholder="Smith" />
          </div>
          <Input label="Role" name="role" value={form.role} onChange={onChange} placeholder="OR Scheduler, Billing Manager, etc." />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Contact Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {[{ value: 'facility', label: 'Facility' }, { value: 'manufacturer', label: 'Mfg' }, { value: 'surgeon_office', label: "Surgeon" }].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setContactType(t.value);
                    setErrors((p) => ({ ...p, contact_type: undefined, facility_id: undefined, distributor_id: undefined, manufacturer_id: undefined, surgeon_id: undefined }));
                    setForm((p) => ({
                      ...p,
                      facility_id: t.value === 'facility' ? p.facility_id : '',
                      distributor_id: t.value === 'distributor' ? p.distributor_id : '',
                      manufacturer_id: t.value === 'manufacturer' ? p.manufacturer_id : '',
                      surgeon_id: t.value === 'surgeon_office' ? p.surgeon_id : '',
                    }));
                  }}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                    contactType === t.value
                      ? 'bg-brand-800 text-white'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {errors.contact_type && <p className="mt-1 text-xs text-red-500">{errors.contact_type}</p>}
          </div>
          {contactType === 'facility' && (
            <SearchableSelect
              label={<>Facility <span className="text-red-500">*</span></>}
              options={facilitySearch.results}
              value={form.facility_id}
              onChange={(v) => { setForm((p) => ({ ...p, facility_id: v })); setErrors((p) => ({ ...p, facility_id: undefined })); }}
              placeholder="Search facilities..."
              error={errors.facility_id}
              onSearch={facilitySearch.search}
              isSearching={facilitySearch.isSearching}
              minChars={3}
              initialLabel={facilityInitialLabel}
              onAddNew={() => navigate('/facilities/new')}
            />
          )}
          {contactType === 'manufacturer' && (
            <SearchableSelect label={<>Manufacturer <span className="text-red-500">*</span></>} options={manufacturerOpts} value={form.manufacturer_id} onChange={(v) => { setForm((p) => ({ ...p, manufacturer_id: v })); setErrors((p) => ({ ...p, manufacturer_id: undefined })); }} placeholder="Select manufacturer" error={errors.manufacturer_id} onAddNew={() => navigate('/manufacturers/new')} allRecords={manufacturers} allRecordsNameField="name" />
          )}
          {contactType === 'surgeon_office' && (
            <SearchableSelect
              label={<>Surgeon <span className="text-red-500">*</span></>}
              options={surgeonSearch.results}
              value={form.surgeon_id}
              onChange={(v) => { setForm((p) => ({ ...p, surgeon_id: v })); setErrors((p) => ({ ...p, surgeon_id: undefined })); }}
              placeholder="Search surgeons..."
              error={errors.surgeon_id}
              onSearch={surgeonSearch.search}
              isSearching={surgeonSearch.isSearching}
              minChars={3}
              initialLabel={surgeonInitialLabel}
              onAddNew={() => navigate('/surgeons/new')}
            />
          )}
          <div>
            <Input label={<>Phone <span className="text-red-500">*</span></>} name="phone" type="tel" value={form.phone} onChange={onChange} error={errors.phone} placeholder="801-555-0100" />
            <div className="mt-3">
              <Input label={<>Email <span className="text-red-500">*</span></>} name="email" type="email" value={form.email} onChange={onChange} placeholder="jane@example.com" />
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500"><span className="text-red-500">*</span> at least one required</p>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</label>
            <ActiveToggle isActive={form.is_active} onToggle={(val) => setForm((p) => ({ ...p, is_active: val }))} size="md" />
          </div>
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
