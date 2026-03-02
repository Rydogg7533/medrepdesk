export const CASE_STATUSES = {
  scheduled: { label: 'Scheduled', color: '#6366F1', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  confirmed: { label: 'Confirmed', color: '#8B5CF6', bg: 'bg-violet-100', text: 'text-violet-700' },
  completed: { label: 'Completed', color: '#10B981', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  bill_sheet_submitted: { label: 'Bill Sheet', color: '#F59E0B', bg: 'bg-amber-100', text: 'text-amber-700' },
  po_requested: { label: 'PO Requested', color: '#F97316', bg: 'bg-orange-100', text: 'text-orange-700' },
  billed: { label: 'Billed', color: '#3B82F6', bg: 'bg-blue-100', text: 'text-blue-700' },
  po_received: { label: 'PO Received', color: '#06B6D4', bg: 'bg-cyan-100', text: 'text-cyan-700' },
  paid: { label: 'Paid', color: '#22C55E', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: 'bg-red-100', text: 'text-red-700' },
};

export const PO_STATUSES = {
  not_requested: { label: 'Not Requested', bg: 'bg-gray-100', text: 'text-gray-700' },
  requested: { label: 'Requested', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  pending: { label: 'Pending', bg: 'bg-orange-100', text: 'text-orange-700' },
  received: { label: 'Received', bg: 'bg-cyan-100', text: 'text-cyan-700' },
  processing: { label: 'Processing', bg: 'bg-blue-100', text: 'text-blue-700' },
  paid: { label: 'Paid', bg: 'bg-green-100', text: 'text-green-700' },
  disputed: { label: 'Disputed', bg: 'bg-red-100', text: 'text-red-700' },
};

export const COMMISSION_STATUSES = {
  pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  confirmed: { label: 'Confirmed', bg: 'bg-blue-100', text: 'text-blue-700' },
  received: { label: 'Received', bg: 'bg-green-100', text: 'text-green-700' },
  disputed: { label: 'Disputed', bg: 'bg-red-100', text: 'text-red-700' },
  written_off: { label: 'Written Off', bg: 'bg-gray-100', text: 'text-gray-700' },
};

export const PROCEDURE_TYPES = [
  { value: 'hip', label: 'Hip' },
  { value: 'knee', label: 'Knee' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'spine', label: 'Spine' },
  { value: 'trauma', label: 'Trauma' },
  { value: 'other', label: 'Other' },
];

export const PLAN_LIMITS = {
  solo: {
    label: 'Solo Rep',
    price: 129,
    maxUsers: 1,
    aiExtractions: 50,
    aiDigests: 4,
  },
  assistant: {
    label: 'Rep + Assistant',
    price: 199,
    maxUsers: 2,
    aiExtractions: 100,
    aiDigests: 8,
  },
  distributorship: {
    label: 'Distributorship',
    price: 299,
    maxUsers: 5,
    aiExtractions: 500,
    aiDigests: -1, // unlimited
  },
};

export const THEME = {
  primary: '#0F4C81',
  primaryLight: '#EBF2F8',
};
