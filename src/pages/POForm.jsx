import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import { usePO, useCreatePO, useUpdatePO } from '@/hooks/usePOs';
import { useCreateChaseEntry } from '@/hooks/useChaseLog';
import { useCases, useCase } from '@/hooks/useCases';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function POForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedCaseId = searchParams.get('caseId');
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existingPO } = usePO(isEdit ? id : null);
  const { data: cases = [] } = useCases();
  const { data: selectedCaseData } = useCase(preselectedCaseId || null);
  const createPO = useCreatePO();
  const updatePO = useUpdatePO();
  const createChase = useCreateChaseEntry();

  const [form, setForm] = useState({
    case_id: preselectedCaseId || '',
    invoice_number: '',
    po_number: '',
    amount: '',
    invoice_date: '',
    issue_date: '',
    expected_payment_date: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (existingPO && isEdit) {
      setForm({
        case_id: existingPO.case_id || '',
        invoice_number: existingPO.invoice_number || '',
        po_number: existingPO.po_number || '',
        amount: existingPO.amount ?? '',
        invoice_date: existingPO.invoice_date || '',
        issue_date: existingPO.issue_date || '',
        expected_payment_date: existingPO.expected_payment_date || '',
        notes: existingPO.notes || '',
      });
    }
  }, [existingPO, isEdit]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  const selectedCase = cases.find((c) => c.id === form.case_id) || selectedCaseData;

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    if (!form.invoice_number.trim()) {
      setErrors({ invoice_number: 'Invoice number is required' });
      return;
    }

    const payload = {
      case_id: form.case_id || null,
      invoice_number: form.invoice_number.trim(),
      po_number: form.po_number.trim() || null,
      amount: form.amount ? Number(form.amount) : null,
      invoice_date: form.invoice_date || null,
      issue_date: form.issue_date || null,
      expected_payment_date: form.expected_payment_date || null,
      facility_id: selectedCase?.facility_id || null,
      distributor_id: selectedCase?.distributor_id || null,
      notes: form.notes ? DOMPurify.sanitize(form.notes) : null,
      status: 'not_requested',
    };

    try {
      if (isEdit) {
        await updatePO.mutateAsync({ id, ...payload });
        navigate(`/po/${id}`, { replace: true });
      } else {
        const created = await createPO.mutateAsync(payload);
        // Create initial chase entry
        const chaseType = selectedCase?.status === 'bill_sheet_submitted' ? 'po_requested' : 'bill_sheet_submitted';
        await createChase.mutateAsync({
          case_id: form.case_id,
          po_id: created.id,
          chase_type: chaseType,
          facility_id: selectedCase?.facility_id || null,
        });
        navigate(`/po/${created.id}`, { replace: true });
      }
    } catch (err) {
      setServerError(err.message);
    }
  }

  const caseOpts = cases.map((c) => ({
    value: c.id,
    label: `${c.case_number} – ${c.surgeon?.full_name || 'No surgeon'}`,
  }));

  const isPending = createPO.isPending || updatePO.isPending;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">
          {isEdit ? 'Edit PO' : 'New Purchase Order'}
        </h1>
      </div>

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!preselectedCaseId && (
            <SearchableSelect
              label="Case"
              options={caseOpts}
              value={form.case_id}
              onChange={(v) => setForm((p) => ({ ...p, case_id: v }))}
              placeholder="Select case"
            />
          )}

          {preselectedCaseId && selectedCase && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Case</label>
              <p className="text-sm text-gray-700">{selectedCase.case_number}</p>
            </div>
          )}

          <Input
            label="Invoice Number *"
            name="invoice_number"
            value={form.invoice_number}
            onChange={onChange}
            error={errors.invoice_number}
            placeholder="INV-001"
          />

          <Input
            label="PO Number"
            name="po_number"
            value={form.po_number}
            onChange={onChange}
            placeholder="Optional"
          />

          <Input
            label="Amount ($)"
            name="amount"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={onChange}
            placeholder="0.00"
          />

          <Input
            label="Invoice Date"
            name="invoice_date"
            type="date"
            value={form.invoice_date}
            onChange={onChange}
          />

          <Input
            label="Issue Date"
            name="issue_date"
            type="date"
            value={form.issue_date}
            onChange={onChange}
          />

          <Input
            label="Expected Payment Date"
            name="expected_payment_date"
            type="date"
            value={form.expected_payment_date}
            onChange={onChange}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              rows={3}
              value={form.notes}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isPending}>
              {isEdit ? 'Save' : 'Create PO'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
