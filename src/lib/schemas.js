import { z } from 'zod';

// ============================================================
// ACCOUNTS
// ============================================================
export const accountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  plan: z.enum(['solo', 'assistant', 'distributorship']),
  sub_status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'incomplete']),
  stripe_customer_id: z.string().nullable().optional(),
  stripe_sub_id: z.string().nullable().optional(),
  stripe_connect_id: z.string().nullable().optional(),
  referral_code: z.string(),
  referred_by: z.string().uuid().nullable().optional(),
  escalation_threshold: z.number().int().default(3),
  digest_enabled: z.boolean().default(true),
  digest_days: z.array(z.number().int()).default([1]),
  digest_time: z.string().default('07:00'),
  ai_extractions_this_month: z.number().int().default(0),
  ai_digest_this_month: z.number().int().default(0),
  tos_agreed_at: z.string().nullable().optional(),
  tos_ip_address: z.string().nullable().optional(),
  privacy_agreed_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// ============================================================
// USERS
// ============================================================
export const userSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  role: z.enum(['owner', 'assistant', 'admin']),
  full_name: z.string().nullable().optional(),
  email: z.string().email(),
  timezone: z.string().default('America/Denver'),
  notification_preferences: z.record(z.boolean()).default({}),
  notification_delivery: z.record(z.string()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
});

// ============================================================
// DISTRIBUTORS
// ============================================================
export const distributorSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  name: z.string().min(1),
  billing_email: z.string().email().nullable().optional(),
  billing_email_cc: z.array(z.string().email()).nullable().optional(),
  billing_contact_name: z.string().nullable().optional(),
  billing_contact_phone: z.string().nullable().optional(),
  default_commission_type: z.enum(['percentage', 'flat']).default('percentage'),
  default_commission_rate: z.coerce.number().nullable().optional(),
  default_flat_amount: z.coerce.number().nullable().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const distributorInsertSchema = distributorSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// FACILITIES
// ============================================================
export const facilitySchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid().nullable().optional(),
  is_global: z.boolean().default(false),
  name: z.string().min(1),
  facility_type: z.enum(['hospital', 'asc', 'clinic', 'other']).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  billing_phone: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const facilityInsertSchema = facilitySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// SURGEONS
// ============================================================
export const surgeonSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid().nullable().optional(),
  is_global: z.boolean().default(false),
  full_name: z.string().min(1),
  specialty: z.string().nullable().optional(),
  primary_facility_id: z.string().uuid().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const surgeonInsertSchema = surgeonSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// CASES
// ============================================================
export const caseSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  assigned_to: z.string().uuid().nullable().optional(),
  case_number: z.string(),
  surgeon_id: z.string().uuid().nullable().optional(),
  facility_id: z.string().uuid().nullable().optional(),
  distributor_id: z.string().uuid().nullable().optional(),
  procedure_type: z.enum(['hip', 'knee', 'shoulder', 'spine', 'trauma', 'other']).nullable().optional(),
  scheduled_date: z.string().nullable().optional(),
  scheduled_time: z.string().nullable().optional(),
  status: z.enum([
    'scheduled', 'confirmed', 'completed',
    'bill_sheet_submitted', 'po_requested',
    'po_received', 'billed', 'paid', 'cancelled',
  ]).default('scheduled'),
  case_value: z.coerce.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const caseInsertSchema = caseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// PURCHASE ORDERS
// ============================================================
export const purchaseOrderSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  case_id: z.string().uuid(),
  facility_id: z.string().uuid().nullable().optional(),
  distributor_id: z.string().uuid().nullable().optional(),
  po_number: z.string().nullable().optional(),
  invoice_number: z.string(),
  invoice_date: z.string().nullable().optional(),
  amount: z.coerce.number().nullable().optional(),
  issue_date: z.string().nullable().optional(),
  expected_payment_date: z.string().nullable().optional(),
  received_date: z.string().nullable().optional(),
  paid_date: z.string().nullable().optional(),
  status: z.enum([
    'not_requested', 'requested', 'pending',
    'received', 'processing', 'paid', 'disputed',
  ]).default('not_requested'),
  photo_url: z.string().nullable().optional(),
  storage_path: z.string().nullable().optional(),
  po_email_sent: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const purchaseOrderInsertSchema = purchaseOrderSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// PO CHASE LOG
// ============================================================
export const poChaseLogSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  case_id: z.string().uuid(),
  po_id: z.string().uuid().nullable().optional(),
  chase_type: z.enum([
    'bill_sheet_submitted', 'po_requested',
    'follow_up_call', 'follow_up_email', 'follow_up_text',
    'po_received', 'escalation', 'note',
  ]),
  contact_name: z.string().nullable().optional(),
  contact_role: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  facility_id: z.string().uuid().nullable().optional(),
  outcome: z.string().nullable().optional(),
  promised_date: z.string().nullable().optional(),
  action_taken: z.enum(['call', 'email', 'text', 'in_person', 'note']).nullable().optional(),
  next_follow_up: z.string().nullable().optional(),
  follow_up_done: z.boolean().default(false),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const poChaseLogInsertSchema = poChaseLogSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// COMMUNICATIONS
// ============================================================
export const communicationSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  case_id: z.string().uuid().nullable().optional(),
  po_id: z.string().uuid().nullable().optional(),
  contact_id: z.string().uuid().nullable().optional(),
  comm_type: z.enum(['call', 'email', 'text', 'in_person', 'voicemail', 'note']),
  direction: z.enum(['inbound', 'outbound']).nullable().optional(),
  contact_name: z.string().nullable().optional(),
  contact_role: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  outcome: z.string().nullable().optional(),
  follow_up_date: z.string().nullable().optional(),
  follow_up_done: z.boolean().default(false),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const communicationInsertSchema = communicationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// MANUFACTURERS
// ============================================================
export const manufacturerSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  name: z.string().min(1),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const manufacturerInsertSchema = manufacturerSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// CONTACTS
// ============================================================
export const contactSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  full_name: z.string().min(1),
  role: z.string().nullable().optional(),
  contact_type: z.enum(['facility', 'distributor', 'manufacturer', 'surgeon_office']).nullable().optional(),
  facility_id: z.string().uuid().nullable().optional(),
  distributor_id: z.string().uuid().nullable().optional(),
  manufacturer_id: z.string().uuid().nullable().optional(),
  surgeon_id: z.string().uuid().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().optional(),
  last_contacted_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const contactInsertSchema = contactSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// COMMISSIONS
// ============================================================
export const commissionSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  case_id: z.string().uuid(),
  distributor_id: z.string().uuid().nullable().optional(),
  commission_type: z.enum(['percentage', 'flat']),
  rate: z.coerce.number().nullable().optional(),
  flat_amount: z.coerce.number().nullable().optional(),
  case_value: z.coerce.number().nullable().optional(),
  expected_amount: z.coerce.number().nullable().optional(),
  received_amount: z.coerce.number().nullable().optional(),
  expected_date: z.string().nullable().optional(),
  received_date: z.string().nullable().optional(),
  status: z.enum(['pending', 'confirmed', 'received', 'disputed', 'written_off']).default('pending'),
  notes: z.string().nullable().optional(),
  dispute_resolution_note: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const commissionInsertSchema = commissionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// REFERRALS
// ============================================================
export const referralSchema = z.object({
  id: z.string().uuid(),
  referrer_account_id: z.string().uuid(),
  referred_account_id: z.string().uuid().nullable().optional(),
  referral_code_used: z.string(),
  status: z.enum(['active', 'expired', 'cancelled']).default('active'),
  commission_rate: z.coerce.number().default(0.25),
  commission_months: z.number().int().default(12),
  months_paid: z.number().int().default(0),
  total_earned: z.coerce.number().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export const referralInsertSchema = referralSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// REFERRAL PAYOUTS
// ============================================================
export const referralPayoutSchema = z.object({
  id: z.string().uuid(),
  referral_id: z.string().uuid(),
  referrer_account_id: z.string().uuid(),
  period_month: z.number().int().min(1).max(12),
  period_year: z.number().int(),
  subscription_amount: z.coerce.number(),
  commission_amount: z.coerce.number(),
  status: z.enum(['pending', 'paid', 'failed']).default('pending'),
  stripe_transfer_id: z.string().nullable().optional(),
  paid_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const referralPayoutInsertSchema = referralPayoutSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  type: z.enum([
    'case_tomorrow', 'follow_up_due', 'promised_date_passed',
    'escalation_recommended', 'po_overdue', 'commission_overdue',
    'referral_signup', 'payout_sent', 'weekly_digest', 'payment_failed',
  ]),
  title: z.string(),
  body: z.string(),
  related_id: z.string().uuid().nullable().optional(),
  related_type: z.string().nullable().optional(),
  is_read: z.boolean().default(false),
  sent_at: z.string(),
  created_at: z.string(),
});

// ============================================================
// PO EMAIL LOGS
// ============================================================
export const poEmailLogSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  po_id: z.string().uuid().nullable().optional(),
  case_id: z.string().uuid().nullable().optional(),
  sent_by: z.string(),
  sent_to: z.array(z.string()),
  sent_cc: z.array(z.string()).nullable().optional(),
  subject: z.string(),
  body_snapshot: z.string().nullable().optional(),
  resend_email_id: z.string().nullable().optional(),
  status: z.enum(['sent', 'failed', 'bounced']).default('sent'),
  created_at: z.string(),
});

export const poEmailLogInsertSchema = poEmailLogSchema.omit({
  id: true,
  created_at: true,
});

// ============================================================
// CASE DOCUMENTS
// ============================================================
export const caseDocumentSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  case_id: z.string().uuid(),
  po_id: z.string().uuid().nullable().optional(),
  document_type: z.enum(['po_photo', 'bill_sheet', 'invoice', 'contract', 'other']),
  file_name: z.string(),
  storage_path: z.string(),
  ai_extracted: z.boolean().default(false),
  extracted_data: z.record(z.unknown()).nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string(),
});

export const caseDocumentInsertSchema = caseDocumentSchema.omit({
  id: true,
  created_at: true,
});

// ============================================================
// AI EXTRACTIONS
// ============================================================
export const aiExtractionSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  extraction_type: z.enum(['po_document', 'case_entry', 'commission_check']),
  input_type: z.enum(['image', 'text', 'pdf']).nullable().optional(),
  storage_path: z.string().nullable().optional(),
  raw_response: z.record(z.unknown()).nullable().optional(),
  extracted_fields: z.record(z.unknown()).nullable().optional(),
  was_corrected: z.boolean().default(false),
  correction_notes: z.string().nullable().optional(),
  created_at: z.string(),
});

export const aiExtractionInsertSchema = aiExtractionSchema.omit({
  id: true,
  created_at: true,
});

// ============================================================
// PUSH SUBSCRIPTIONS
// ============================================================
export const pushSubscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  subscription: z.record(z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
});

export const pushSubscriptionInsertSchema = pushSubscriptionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// ============================================================
// AUDIT LOGS
// ============================================================
export const auditLogSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
  action: z.string(),
  table_name: z.string(),
  record_id: z.string().uuid(),
  old_values: z.record(z.unknown()).nullable().optional(),
  new_values: z.record(z.unknown()).nullable().optional(),
  ip_address: z.string().nullable().optional(),
  created_at: z.string(),
});
