import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useCreateCommunication } from '@/hooks/useCommunications';
import { useCases } from '@/hooks/useCases';
import { useContacts } from '@/hooks/useContacts';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';

const COMM_TYPES = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'text', label: 'Text' },
  { value: 'in_person', label: 'In Person' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'note', label: 'Note' },
];

export default function CommunicationForm() {
  const [searchParams] = useSearchParams();
  const preselectedCaseId = searchParams.get('caseId');
  const navigate = useNavigate();

  const { data: cases = [] } = useCases();
  const { data: contacts = [] } = useContacts();
  const createComm = useCreateCommunication();

  const [form, setForm] = useState({
    case_id: preselectedCaseId || '',
    comm_type: 'call',
    direction: 'outbound',
    contact_id: '',
    contact_name: '',
    contact_role: '',
    subject: '',
    notes: '',
    outcome: '',
    follow_up_date: '',
  });
  const [serverError, setServerError] = useState('');

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function onContactChange(contactId) {
    const contact = contacts.find((c) => c.id === contactId);
    setForm((p) => ({
      ...p,
      contact_id: contactId,
      contact_name: contact?.full_name || '',
      contact_role: contact?.role || '',
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const payload = {
      case_id: form.case_id || null,
      comm_type: form.comm_type,
      direction: form.direction,
      contact_id: form.contact_id || null,
      contact_name: form.contact_name ? DOMPurify.sanitize(form.contact_name) : null,
      contact_role: form.contact_role ? DOMPurify.sanitize(form.contact_role) : null,
      subject: form.subject ? DOMPurify.sanitize(form.subject) : null,
      notes: form.notes ? DOMPurify.sanitize(form.notes) : null,
      outcome: form.outcome ? DOMPurify.sanitize(form.outcome) : null,
      follow_up_date: form.follow_up_date || null,
    };

    try {
      await createComm.mutateAsync(payload);
      navigate(-1);
    } catch (err) {
      setServerError(err.message);
    }
  }

  const caseOpts = cases.map((c) => ({
    value: c.id,
    label: `${c.case_number} – ${c.surgeon?.full_name || 'No surgeon'}`,
  }));
  const contactOpts = contacts.map((c) => ({
    value: c.id,
    label: `${c.full_name}${c.role ? ` (${c.role})` : ''}`,
  }));

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Log Communication</h1>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
            <select
              name="comm_type"
              value={form.comm_type}
              onChange={onChange}
              className="min-h-touch w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {COMM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Direction</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, direction: 'outbound' }))}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
                  form.direction === 'outbound'
                    ? 'bg-brand-800 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Outbound
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, direction: 'inbound' }))}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
                  form.direction === 'inbound'
                    ? 'bg-brand-800 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Inbound
              </button>
            </div>
          </div>

          <SearchableSelect
            label="Case"
            options={caseOpts}
            value={form.case_id}
            onChange={(v) => setForm((p) => ({ ...p, case_id: v }))}
            placeholder="Select case (optional)"
          />

          <SearchableSelect
            label="Contact"
            options={contactOpts}
            value={form.contact_id}
            onChange={onContactChange}
            placeholder="Select contact"
          />

          <Input
            label="Contact Name"
            name="contact_name"
            value={form.contact_name}
            onChange={onChange}
            placeholder="Or type name"
          />

          <Input
            label="Subject"
            name="subject"
            value={form.subject}
            onChange={onChange}
            placeholder="Brief subject"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              name="notes"
              rows={3}
              value={form.notes}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Details of communication..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Outcome</label>
            <textarea
              name="outcome"
              rows={2}
              value={form.outcome}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="What was the result?"
            />
          </div>

          <Input
            label="Follow-Up Date"
            name="follow_up_date"
            type="date"
            value={form.follow_up_date}
            onChange={onChange}
          />

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={createComm.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
