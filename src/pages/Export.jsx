import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, Loader2, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { useAuth } from '@/context/AuthContext';

function downloadCsv(filename, csvString) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const body = rows.map((row) =>
    columns.map((c) => {
      const val = c.accessor(row);
      if (val == null) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    }).join(',')
  ).join('\n');
  return header + '\n' + body;
}

const EXPORTS = [
  {
    id: 'contacts',
    label: 'Contacts',
    description: 'Export all contacts with name, role, facility, phone, email',
    table: TABLES.CONTACTS,
    select: '*, facility:facilities(name), surgeon:surgeons(full_name), distributor:distributors(name), manufacturer:manufacturers(name)',
    columns: [
      { label: 'Name', accessor: (r) => r.full_name },
      { label: 'Role', accessor: (r) => r.role },
      { label: 'Facility', accessor: (r) => r.facility?.name },
      { label: 'Surgeon', accessor: (r) => r.surgeon?.full_name },
      { label: 'Distributor', accessor: (r) => r.distributor?.name },
      { label: 'Manufacturer', accessor: (r) => r.manufacturer?.name },
      { label: 'Phone', accessor: (r) => r.phone },
      { label: 'Email', accessor: (r) => r.email },
    ],
    filename: 'contacts.csv',
  },
  {
    id: 'cases',
    label: 'Cases',
    description: 'Export all cases with case number, surgeon, facility, date, status, value',
    table: TABLES.CASES,
    select: '*, surgeon:surgeons(full_name), facility:facilities(name)',
    columns: [
      { label: 'Case Number', accessor: (r) => r.case_number },
      { label: 'Surgeon', accessor: (r) => r.surgeon?.full_name },
      { label: 'Facility', accessor: (r) => r.facility?.name },
      { label: 'Date', accessor: (r) => r.surgery_date },
      { label: 'Status', accessor: (r) => r.status },
      { label: 'Value', accessor: (r) => r.total_value },
    ],
    filename: 'cases.csv',
  },
  {
    id: 'commissions',
    label: 'Commissions',
    description: 'Export all commissions with case number, distributor, amount, status, date',
    table: TABLES.COMMISSIONS,
    select: '*, case:cases(case_number), distributor:distributors(name)',
    columns: [
      { label: 'Case Number', accessor: (r) => r.case?.case_number },
      { label: 'Distributor', accessor: (r) => r.distributor?.name },
      { label: 'Amount', accessor: (r) => r.amount },
      { label: 'Status', accessor: (r) => r.status },
      { label: 'Date', accessor: (r) => r.date || r.created_at },
    ],
    filename: 'commissions.csv',
  },
  {
    id: 'purchase_orders',
    label: 'Purchase Orders',
    description: 'Export all POs with PO number, invoice number, case, amount, status, dates',
    table: TABLES.PURCHASE_ORDERS,
    select: '*, case:cases(case_number)',
    columns: [
      { label: 'PO Number', accessor: (r) => r.po_number },
      { label: 'Invoice Number', accessor: (r) => r.invoice_number },
      { label: 'Case Number', accessor: (r) => r.case?.case_number },
      { label: 'Amount', accessor: (r) => r.amount },
      { label: 'Status', accessor: (r) => r.status },
      { label: 'Date', accessor: (r) => r.po_date || r.created_at },
      { label: 'Due Date', accessor: (r) => r.due_date },
    ],
    filename: 'purchase_orders.csv',
  },
];

export default function Export() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);

  async function handleExport(exp) {
    if (!user) return;
    setLoading(exp.id);
    try {
      const { data, error } = await supabase
        .from(exp.table)
        .select(exp.select)
        .eq('account_id', user.account_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const csv = toCsv(data || [], exp.columns);
      downloadCsv(exp.filename, csv);
    } catch (err) {
      console.error(`Export ${exp.id} error:`, err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-4">
      <h1 className="page-bg-text mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Export Data</h1>

      <div className="themed-card divide-y divide-gray-100 dark:divide-gray-700 rounded-xl bg-white shadow-sm dark:bg-gray-800">
        {EXPORTS.map((exp) => (
          <div key={exp.id} className="flex items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{exp.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{exp.description}</p>
            </div>
            <button
              onClick={() => handleExport(exp)}
              disabled={loading === exp.id}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-800 px-3 py-2 text-xs font-medium text-white active:bg-brand-900 disabled:opacity-50"
            >
              {loading === exp.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export CSV
            </button>
          </div>
        ))}

        {/* QuickBooks — coming soon */}
        <div className="flex items-center gap-3 px-4 py-3.5 opacity-50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">QuickBooks Export</p>
              <span className="rounded-full bg-gray-200 dark:bg-gray-600 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sync commissions and payments to QuickBooks</p>
          </div>
          <button
            disabled
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-300 dark:bg-gray-600 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 cursor-not-allowed"
          >
            <Lock className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Import section */}
      <h2 className="page-bg-text mt-6 mb-3 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">Import</h2>
      <div className="themed-card rounded-xl bg-white shadow-sm dark:bg-gray-800">
        <button
          onClick={() => navigate('/contacts/import')}
          className="flex min-h-touch w-full items-center gap-3 rounded-lg px-4 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700"
        >
          <Upload className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Import Contacts</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Upload a CSV file to bulk-import contacts</p>
          </div>
        </button>
      </div>
    </div>
  );
}
