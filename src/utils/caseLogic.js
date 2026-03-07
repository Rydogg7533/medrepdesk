const BILL_SHEET_OK_STATUSES = [
  'completed', 'bill_sheet_submitted', 'po_requested',
  'billed', 'po_received', 'paid',
];

export function canMarkComplete(scheduledDate) {
  if (!scheduledDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const caseDate = new Date(scheduledDate);
  caseDate.setHours(0, 0, 0, 0);
  return caseDate <= today;
}

export function canSubmitBillSheet(caseStatus) {
  return BILL_SHEET_OK_STATUSES.includes(caseStatus);
}
