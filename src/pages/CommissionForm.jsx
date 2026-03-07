import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { sanitizeText } from '@/utils/sanitize';
import { useCommission, useCreateCommission, useUpdateCommission } from '@/hooks/useCommissions';
import { useCases, useCase } from '@/hooks/useCases';
import { useDistributors } from '@/hooks/useDistributors';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';

export default function CommissionForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedCaseId = searchParams.get('caseId');
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: existingCommission } = useCommission(isEdit ? id : null);
  const { data: cases = [] } = useCases();
  const { data: selectedCaseData } = useCase(preselectedCaseId || null);
  const { data: distributors = [] } = useDistributors();
  const createCommission = useCreateCommission();
  const updateCommission = useUpdateCommission();

  const [form, setForm] = useState({
    case_id: preselectedCaseId || '',
    distributor_id: '',
    commission_type: 'percentage',
    rate: '',
    flat_amount: '',
    case_value: '',
    expected_amount: '',
    expected_date: '',
    notes: '',
  });
  const [serverError, setServerError] = useState('');

  // Pre-fill from existing commission (edit mode)
  useEffect(() => {
    if (existingCommission && isEdit) {
      setForm({
        case_id: existingCommission.case_id || '',
        distributor_id: existingCommission.distributor_id || '',
        commission_type: existingCommission.commission_type || 'percentage',
        rate: existingCommission.rate ?? '',
        flat_amount: existingCommission.flat_amount ?? '',
        case_value: existingCommission.case_value ?? '',
        expected_amount: existingCommission.expected_amount ?? '',
        expected_date: existingCommission.expected_date || '',
        notes: existingCommission.notes || '',
      });
    }
  }, [existingCommission, isEdit]);

  // Auto-fill from case data
  useEffect(() => {
    if (selectedCaseData && !isEdit) {
      const dist = distributors.find((d) => d.id === selectedCaseData.distributor_id);
      setForm((p) => ({
        ...p,
        distributor_id: selectedCaseData.distributor_id || p.distributor_id,
        case_value: selectedCaseData.case_value ?? p.case_value,
        commission_type: dist?.default_commission_type || p.commission_type,
        rate: dist?.default_commission_rate ?? p.rate,
        flat_amount: dist?.default_flat_amount ?? p.flat_amount,
      }));
    }
  }, [selectedCaseData, distributors, isEdit]);

  // Auto-calculate expected amount
  useEffect(() => {
    if (form.commission_type === 'percentage' && form.rate && form.case_value) {
      const expected = (Number(form.case_value) * Number(form.rate)) / 100;
      setForm((p) => ({ ...p, expected_amount: expected.toFixed(2) }));
    } else if (form.commission_type === 'flat' && form.flat_amount) {
      setForm((p) => ({ ...p, expected_amount: form.flat_amount }));
    }
  }, [form.commission_type, form.rate, form.flat_amount, form.case_value]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function onCaseChange(caseId) {
    const c = cases.find((cs) => cs.id === caseId);
    const dist = c ? distributors.find((d) => d.id === c.distributor_id) : null;
    setForm((p) => ({
      ...p,
      case_id: caseId,
      distributor_id: c?.distributor_id || p.distributor_id,
      case_value: c?.case_value ?? p.case_value,
      commission_type: dist?.default_commission_type || p.commission_type,
      rate: dist?.default_commission_rate ?? p.rate,
      flat_amount: dist?.default_flat_amount ?? p.flat_amount,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    const payload = {
      case_id: form.case_id || null,
      distributor_id: form.distributor_id || null,
      commission_type: form.commission_type,
      rate: form.commission_type === 'percentage' && form.rate ? Number(form.rate) : null,
      flat_amount: form.commission_type === 'flat' && form.flat_amount ? Number(form.flat_amount) : null,
      case_value: form.case_value ? Number(form.case_value) : null,
      expected_amount: form.expected_amount ? Number(form.expected_amount) : null,
      expected_date: form.expected_date || null,
      notes: sanitizeText(form.notes),
    };

    try {
      if (isEdit) {
        await updateCommission.mutateAsync({ id, ...payload });
        navigate(`/commissions/${id}`, { replace: true });
      } else {
        const created = await createCommission.mutateAsync(payload);
        navigate(`/commissions/${created.id}`, { replace: true });
      }
    } catch (err) {
      setServerError(err.message);
    }
  }

  const caseOpts = cases.map((c) => ({
    value: c.id,
    label: `${c.case_number} – ${c.surgeon?.full_name || 'No surgeon'}`,
  }));
  const distributorOpts = distributors.map((d) => ({ value: d.id, label: d.name }));
  const isPending = createCommission.isPending || updateCommission.isPending;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="page-bg-text text-lg font-bold text-gray-900 dark:text-gray-100">
          {isEdit ? 'Edit Commission' : 'New Commission'}
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
              onChange={onCaseChange}
              placeholder="Select case"
            />
          )}

          <SearchableSelect
            label="Distributor"
            options={distributorOpts}
            value={form.distributor_id}
            onChange={(v) => setForm((p) => ({ ...p, distributor_id: v }))}
            placeholder="Select distributor"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Commission Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, commission_type: 'percentage' }))}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
                  form.commission_type === 'percentage'
                    ? 'bg-brand-800 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Percentage
              </button>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, commission_type: 'flat' }))}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
                  form.commission_type === 'flat'
                    ? 'bg-brand-800 text-white'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                Flat
              </button>
            </div>
          </div>

          {form.commission_type === 'percentage' && (
            <Input
              label="Rate (%)"
              name="rate"
              type="number"
              step="0.01"
              value={form.rate}
              onChange={onChange}
              placeholder="e.g. 20"
            />
          )}

          {form.commission_type === 'flat' && (
            <Input
              label="Flat Amount ($)"
              name="flat_amount"
              type="number"
              step="0.01"
              value={form.flat_amount}
              onChange={onChange}
              placeholder="0.00"
            />
          )}

          <Input
            label="Case Value ($)"
            name="case_value"
            type="number"
            step="0.01"
            value={form.case_value}
            onChange={onChange}
            placeholder="0.00"
          />

          <Input
            label="Expected Amount ($)"
            name="expected_amount"
            type="number"
            step="0.01"
            value={form.expected_amount}
            onChange={onChange}
            placeholder="Auto-calculated"
          />

          <Input
            label="Expected Date"
            name="expected_date"
            type="date"
            value={form.expected_date}
            onChange={onChange}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              name="notes"
              rows={3}
              value={form.notes}
              onChange={onChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" loading={isPending}>
              {isEdit ? 'Save' : 'Create Commission'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
