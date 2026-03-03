import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Check, AlertCircle, Save, ChevronDown, ChevronUp } from 'lucide-react';
import Papa from 'papaparse';
import { z } from 'zod';
import { useContacts, useCreateContact } from '@/hooks/useContacts';
import { useFacilities } from '@/hooks/useFacilities';
import { useDistributors } from '@/hooks/useDistributors';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// Zod row schema
// ---------------------------------------------------------------------------

const contactRowSchema = z.object({
  full_name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
}).refine(
  (row) => (row.full_name && row.full_name.trim()) || (row.first_name && row.first_name.trim()),
  { message: 'Full name or first name is required' },
);

// ---------------------------------------------------------------------------
// Field definitions & auto-mapping
// ---------------------------------------------------------------------------

const CONTACT_FIELDS = [
  { value: 'skip', label: 'Skip' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'role', label: 'Role' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'facility', label: 'Facility (name match)' },
  { value: 'distributor', label: 'Distributor (name match)' },
  { value: 'notes', label: 'Notes' },
];

const MAPPING_STORAGE_KEY = 'contact-csv-mapping';

function autoMapColumn(header) {
  const h = header.toLowerCase().trim();
  // First/last name detection (must come before generic "name" check)
  if (/^(first\s*name|given\s*name|first)$/.test(h)) return 'first_name';
  if (/^(last\s*name|family\s*name|last|surname)$/.test(h)) return 'last_name';
  if (h.includes('name') && !h.includes('facility') && !h.includes('distributor'))
    return 'full_name';
  if (h.includes('role') || h.includes('title') || h.includes('position'))
    return 'role';
  if (h.includes('phone') || h.includes('mobile') || h.includes('cell'))
    return 'phone';
  if (h.includes('email') || h.includes('e-mail')) return 'email';
  if (h.includes('facility') || h.includes('hospital')) return 'facility';
  if (h.includes('distributor') || h.includes('company')) return 'distributor';
  if (h.includes('note')) return 'notes';
  return 'skip';
}

function loadSavedMapping(headers) {
  try {
    const saved = JSON.parse(localStorage.getItem(MAPPING_STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return null;
    // Only use saved mapping if all current headers exist in it
    const mapped = {};
    let usedAny = false;
    headers.forEach((h) => {
      if (saved[h]) {
        mapped[h] = saved[h];
        usedAny = true;
      } else {
        mapped[h] = autoMapColumn(h);
      }
    });
    return usedAny ? mapped : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContactImport() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const { account } = useAuth();

  // Data hooks
  const { data: existingContacts = [] } = useContacts();
  const { data: facilities = [] } = useFacilities();
  const { data: distributors = [] } = useDistributors();

  // Step state: 'upload' | 'map' | 'results'
  const [step, setStep] = useState('upload');

  // CSV data
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});

  // Import state
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null); // { imported, skipped, errors }
  const [guideOpen, setGuideOpen] = useState(
    () => localStorage.getItem('contact-csv-guide-collapsed') !== 'true',
  );

  // -----------------------------------------------------------------------
  // Step 1 - File upload
  // -----------------------------------------------------------------------

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const headers = parsed.meta.fields || [];
      const rows = parsed.data;

      setCsvHeaders(headers);
      setCsvRows(rows);

      // Try saved mapping first, fall back to auto-detect
      const savedMapping = loadSavedMapping(headers);
      if (savedMapping) {
        setMapping(savedMapping);
      } else {
        const initialMapping = {};
        headers.forEach((h) => {
          initialMapping[h] = autoMapColumn(h);
        });
        setMapping(initialMapping);
      }
      setStep('map');
    };
    reader.readAsText(file);
  }

  // -----------------------------------------------------------------------
  // Step 2 helpers
  // -----------------------------------------------------------------------

  function handleMappingChange(header, value) {
    setMapping((prev) => ({ ...prev, [header]: value }));
  }

  function handleSaveMapping() {
    localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mapping));
  }

  /** Build a mapped row object from raw CSV row using current mapping. */
  function applyMapping(row) {
    const mapped = {};
    Object.entries(mapping).forEach(([csvCol, field]) => {
      if (field !== 'skip') {
        mapped[field] = row[csvCol]?.trim() || '';
      }
    });
    return mapped;
  }

  const previewRows = csvRows.slice(0, 5);
  const activeMappedFields = Object.values(mapping).filter((v) => v !== 'skip');

  // -----------------------------------------------------------------------
  // Step 3 - Import
  // -----------------------------------------------------------------------

  async function handleImport() {
    setImporting(true);
    let importedCount = 0;
    let skippedCount = 0;
    const errorList = [];

    // Map facility / distributor names to IDs (case-insensitive)
    const facilityMap = {};
    facilities.forEach((f) => {
      facilityMap[f.name.toLowerCase()] = f.id;
    });
    const distributorMap = {};
    distributors.forEach((d) => {
      distributorMap[d.name.toLowerCase()] = d.id;
    });

    // Build set of existing contacts for duplicate detection
    const existingSet = new Set();
    existingContacts.forEach((c) => {
      if (c.full_name && c.phone)
        existingSet.add(`${c.full_name.toLowerCase()}|phone|${c.phone.toLowerCase()}`);
      if (c.full_name && c.email)
        existingSet.add(`${c.full_name.toLowerCase()}|email|${c.email.toLowerCase()}`);
    });

    const validRows = [];

    csvRows.forEach((row, idx) => {
      const mapped = applyMapping(row);

      // Combine first_name + last_name into full_name when both are mapped
      if (!mapped.full_name && mapped.first_name) {
        mapped.full_name = [mapped.first_name, mapped.last_name].filter(Boolean).join(' ');
      }

      // Zod validation
      const result = contactRowSchema.safeParse(mapped);
      if (!result.success) {
        const issues = result.error.issues.map((i) => i.message).join('; ');
        errorList.push(`Row ${idx + 2}: ${issues}`);
        return;
      }

      // Duplicate check
      const nameKey = mapped.full_name.toLowerCase();
      if (mapped.phone && existingSet.has(`${nameKey}|phone|${mapped.phone.toLowerCase()}`)) {
        skippedCount++;
        return;
      }
      if (mapped.email && existingSet.has(`${nameKey}|email|${mapped.email.toLowerCase()}`)) {
        skippedCount++;
        return;
      }

      // Build insert payload
      const payload = {
        account_id: account?.id,
        full_name: mapped.full_name,
        role: mapped.role || null,
        phone: mapped.phone || null,
        email: mapped.email || null,
        notes: mapped.notes || null,
        facility_id: null,
        distributor_id: null,
      };

      // Match facility name
      if (mapped.facility) {
        const fid = facilityMap[mapped.facility.toLowerCase()];
        if (fid) payload.facility_id = fid;
      }

      // Match distributor name
      if (mapped.distributor) {
        const did = distributorMap[mapped.distributor.toLowerCase()];
        if (did) payload.distributor_id = did;
      }

      // Also add to existingSet so we don't import duplicates within the same file
      if (mapped.phone) existingSet.add(`${nameKey}|phone|${mapped.phone.toLowerCase()}`);
      if (mapped.email) existingSet.add(`${nameKey}|email|${mapped.email.toLowerCase()}`);

      validRows.push(payload);
    });

    if (validRows.length > 0) {
      const { data: imported, error } = await supabase
        .from('contacts')
        .insert(validRows)
        .select();

      if (error) {
        errorList.push(error.message);
      } else {
        importedCount = imported.length;
      }
    }

    setResults({
      imported: importedCount,
      skipped: skippedCount,
      errors: errorList,
    });
    setImporting(false);
    setStep('results');
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="min-h-touch p-1">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Import Contacts
        </h1>
      </div>

      {/* CSV Format Guide */}
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <button
          type="button"
          onClick={() => {
            setGuideOpen((prev) => {
              const next = !prev;
              localStorage.setItem('contact-csv-guide-collapsed', next ? 'false' : 'true');
              return next;
            });
          }}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <span className="text-sm font-semibold text-red-700 dark:text-red-300">
            CSV Format Guide — Organize your CSV like this for easiest import
          </span>
          {guideOpen ? (
            <ChevronUp className="h-4 w-4 text-red-500 dark:text-red-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-red-500 dark:text-red-400" />
          )}
        </button>
        {guideOpen && (
          <div className="border-t border-red-200 px-4 pb-4 pt-3 dark:border-red-800">
            <div className="overflow-x-auto rounded-lg border border-red-200 dark:border-red-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-red-100 dark:bg-red-900/40">
                    {['First Name', 'Last Name', 'Title/Role', 'Phone', 'Email', 'Organization', 'Notes'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold text-red-700 dark:text-red-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white dark:bg-gray-800">
                    {['John', 'Smith', 'Billing Manager', '(555) 123-4567', 'john.smith@hospital.com', "St. Mary's Hospital", 'Primary billing contact'].map((v, i) => (
                      <td key={i} className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-300">{v}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">
              Your CSV doesn&apos;t have to match this exactly — you can map any columns during import. But organizing your file like this will make mapping automatic.
            </p>
          </div>
        )}
      </div>

      {/* Step 1 - Upload */}
      {step === 'upload' && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-8">
            <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a CSV file to import contacts
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button onClick={() => fileRef.current?.click()}>Choose CSV File</Button>
          </div>
        </Card>
      )}

      {/* Step 2 - Map columns + preview */}
      {step === 'map' && (
        <>
          <Card className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Column Mapping
              </h2>
              <button
                type="button"
                onClick={handleSaveMapping}
                className="flex items-center gap-1 text-xs font-medium text-brand-800 dark:text-brand-400"
              >
                <Save className="h-3.5 w-3.5" /> Save mapping
              </button>
            </div>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Map each CSV column to a contact field, or skip columns you don&apos;t need.
            </p>
            <div className="flex flex-col gap-3">
              {csvHeaders.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="w-1/2 truncate text-sm text-gray-700 dark:text-gray-300">
                    {header}
                  </span>
                  <select
                    value={mapping[header] || 'skip'}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    className="w-1/2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-800/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {CONTACT_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>

          {/* Preview table */}
          {activeMappedFields.length > 0 && (
            <Card className="mb-4 overflow-x-auto">
              <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Preview (first 5 rows)
              </h2>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {CONTACT_FIELDS.filter(
                      (f) => f.value !== 'skip' && activeMappedFields.includes(f.value)
                    ).map((f) => (
                      <th
                        key={f.value}
                        className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400"
                      >
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => {
                    const mapped = applyMapping(row);
                    return (
                      <tr key={i}>
                        {CONTACT_FIELDS.filter(
                          (f) => f.value !== 'skip' && activeMappedFields.includes(f.value)
                        ).map((f) => (
                          <td
                            key={f.value}
                            className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-300"
                          >
                            {mapped[f.value] || ''}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setStep('upload');
                setCsvHeaders([]);
                setCsvRows([]);
                setMapping({});
              }}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              loading={importing}
              onClick={handleImport}
              disabled={!activeMappedFields.includes('full_name') && !activeMappedFields.includes('first_name')}
            >
              Import {csvRows.length} Contacts
            </Button>
          </div>
        </>
      )}

      {/* Step 3 - Results */}
      {step === 'results' && results && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-6">
            {results.errors.length === 0 ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            )}

            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Import Complete
            </h2>

            <div className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
              <p>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {results.imported}
                </span>{' '}
                imported
              </p>
              <p>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  {results.skipped}
                </span>{' '}
                skipped (duplicates)
              </p>
              {results.errors.length > 0 && (
                <p>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {results.errors.length}
                  </span>{' '}
                  errors
                </p>
              )}
            </div>

            {results.errors.length > 0 && (
              <div className="w-full rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <ul className="list-inside list-disc space-y-1">
                  {results.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button className="mt-2" onClick={() => navigate('/contacts')}>
              Done
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
