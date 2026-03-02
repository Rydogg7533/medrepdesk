import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Check, AlertCircle } from 'lucide-react';
import { useContacts, useCreateContact } from '@/hooks/useContacts';
import { useFacilities } from '@/hooks/useFacilities';
import { useDistributors } from '@/hooks/useDistributors';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// CSV parsing helpers
// ---------------------------------------------------------------------------

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  const headers = parseCSVLine(lines[0]);
  return {
    headers: headers.map((h) => h.trim()),
    rows: lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      const row = {};
      headers.forEach((h, i) => {
        row[h.trim()] = values[i]?.trim() || '';
      });
      return row;
    }),
  };
}

// ---------------------------------------------------------------------------
// Field definitions & auto-mapping
// ---------------------------------------------------------------------------

const CONTACT_FIELDS = [
  { value: 'skip', label: 'Skip' },
  { value: 'full_name', label: 'Full Name' },
  { value: 'role', label: 'Role' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'facility', label: 'Facility (name match)' },
  { value: 'distributor', label: 'Distributor (name match)' },
  { value: 'notes', label: 'Notes' },
];

function autoMapColumn(header) {
  const h = header.toLowerCase().trim();
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

  // -----------------------------------------------------------------------
  // Step 1 – File upload
  // -----------------------------------------------------------------------

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvRows(rows);

      // Build initial mapping via auto-detect
      const initialMapping = {};
      headers.forEach((h) => {
        initialMapping[h] = autoMapColumn(h);
      });
      setMapping(initialMapping);
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

  /** Build a mapped row object from raw CSV row using current mapping. */
  function applyMapping(row) {
    const mapped = {};
    Object.entries(mapping).forEach(([csvCol, field]) => {
      if (field !== 'skip') {
        mapped[field] = row[csvCol] || '';
      }
    });
    return mapped;
  }

  const previewRows = csvRows.slice(0, 5);
  const activeMappedFields = Object.values(mapping).filter((v) => v !== 'skip');

  // -----------------------------------------------------------------------
  // Step 3 – Import
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

      // Validate – must have full_name
      if (!mapped.full_name) {
        errorList.push(`Row ${idx + 2}: missing full_name`);
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

      {/* Step 1 – Upload */}
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

      {/* Step 2 – Map columns + preview */}
      {step === 'map' && (
        <>
          <Card className="mb-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Column Mapping
            </h2>
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
              disabled={!activeMappedFields.includes('full_name')}
            >
              Import {csvRows.length} Contacts
            </Button>
          </div>
        </>
      )}

      {/* Step 3 – Results */}
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
