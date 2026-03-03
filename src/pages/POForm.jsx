import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Minus, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { usePO, useCreatePO, useUpdatePO } from '@/hooks/usePOs';
import { useCreateChaseEntry } from '@/hooks/useChaseLog';
import { useCases, useCase } from '@/hooks/useCases';
import { useExtractPO } from '@/hooks/useAI';
import { useAuth } from '@/context/AuthContext';
import { canUseAIExtraction, getRemainingExtractions } from '@/utils/planLimits';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SearchableSelect from '@/components/ui/SearchableSelect';
import InfoTooltip from '@/components/ui/InfoTooltip';

export default function POForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const preselectedCaseId = searchParams.get('caseId');
  const isEdit = !!id;
  const navigate = useNavigate();

  const { account } = useAuth();
  const { data: existingPO } = usePO(isEdit ? id : null);
  const { data: cases = [] } = useCases();
  const { data: selectedCaseData } = useCase(preselectedCaseId || null);
  const createPO = useCreatePO();
  const updatePO = useUpdatePO();
  const createChase = useCreateChaseEntry();
  const extractPO = useExtractPO();

  const fileInputRef = useRef(null);

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
  const [extractedFields, setExtractedFields] = useState({});
  const [storagePath, setStoragePath] = useState(null);
  const [extractionBanner, setExtractionBanner] = useState(null);

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

  // Auto-populate amount from case value when creating a new PO
  useEffect(() => {
    if (!isEdit && selectedCase?.case_value && !form.amount && !Object.keys(extractedFields).length) {
      setForm((prev) => ({ ...prev, amount: String(selectedCase.case_value) }));
    }
  }, [selectedCase?.case_value, isEdit]);

  async function handleScanPO(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be re-selected
    e.target.value = '';

    try {
      const data = await extractPO.mutateAsync({
        file,
        caseId: form.case_id || preselectedCaseId || null,
      });

      const extracted = {};
      const fieldsToExtract = ['po_number', 'amount', 'invoice_number', 'issue_date'];

      fieldsToExtract.forEach((field) => {
        if (data[field] != null && data[field] !== '') {
          extracted[field] = true;
          setForm((prev) => ({
            ...prev,
            [field]: String(data[field]),
          }));
        } else {
          extracted[field] = false;
        }
      });

      setExtractedFields(extracted);

      if (data.storage_path) {
        setStoragePath(data.storage_path);
      }

      const count = Object.values(extracted).filter(Boolean).length;
      setExtractionBanner(`${count} field${count !== 1 ? 's' : ''} extracted`);

      // Auto-dismiss banner after 5 seconds
      setTimeout(() => setExtractionBanner(null), 5000);
    } catch {
      // Error is available via extractPO.error
    }
  }

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

    if (storagePath) {
      payload.storage_path = storagePath;
    }

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
  const remaining = getRemainingExtractions(account);
  const canExtract = canUseAIExtraction(account);

  function FieldIndicator({ field }) {
    if (!(field in extractedFields)) return null;
    if (extractedFields[field]) {
      return <Check className="inline h-3.5 w-3.5 text-green-600 dark:text-green-400 ml-1" />;
    }
    return <Minus className="inline h-3.5 w-3.5 text-gray-400 dark:text-gray-500 ml-1" />;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {isEdit ? 'Edit PO' : 'New Purchase Order'}
        </h1>
      </div>

      {!isEdit && (
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canExtract || extractPO.isPending}
              className="flex items-center gap-2 rounded-lg bg-brand-50 dark:bg-brand-800/20 px-4 py-3 text-sm font-medium text-brand-800 dark:text-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="h-5 w-5" />
              Scan PO Document
            </button>
            <InfoTooltip text="Take a photo of the PO document. AI reads it and extracts PO number, amount, date, and payment terms. You confirm before saving." />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {remaining} extraction{remaining !== 1 ? 's' : ''} remaining
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleScanPO}
          />
        </div>
      )}

      {extractPO.isPending && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-brand-50 dark:bg-brand-800/20 p-3 text-sm text-brand-800 dark:text-brand-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Extracting PO data...
        </div>
      )}

      {extractPO.isError && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
          {extractPO.error?.message || 'Extraction failed'}
        </div>
      )}

      {extractionBanner && (
        <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm font-medium text-green-700 dark:text-green-400">
          {extractionBanner}
        </div>
      )}

      {serverError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{serverError}</div>
      )}

      {extractPO.isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-brand-800 dark:text-brand-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Extracting PO data...</p>
          </div>
        </div>
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
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Case</label>
              <p className="text-sm text-gray-700 dark:text-gray-300">{selectedCase.case_number}</p>
            </div>
          )}

          <div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Number *</span>
              <FieldIndicator field="invoice_number" />
            </div>
            <Input
              name="invoice_number"
              value={form.invoice_number}
              onChange={onChange}
              error={errors.invoice_number}
              placeholder="INV-001"
            />
          </div>

          <div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PO Number</span>
              <FieldIndicator field="po_number" />
            </div>
            <Input
              name="po_number"
              value={form.po_number}
              onChange={onChange}
              placeholder="Optional"
            />
          </div>

          <div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount ($)</span>
              <FieldIndicator field="amount" />
            </div>
            <Input
              name="amount"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={onChange}
              placeholder="0.00"
            />
          </div>

          <Input
            label="Invoice Date"
            name="invoice_date"
            type="date"
            value={form.invoice_date}
            onChange={onChange}
          />

          <div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Issue Date</span>
              <FieldIndicator field="issue_date" />
            </div>
            <Input
              name="issue_date"
              type="date"
              value={form.issue_date}
              onChange={onChange}
            />
          </div>

          <Input
            label="Expected Payment Date"
            name="expected_payment_date"
            type="date"
            value={form.expected_payment_date}
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
              {isEdit ? 'Save' : 'Create PO'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
