# CLAUDE CODE — MedRepDesk Step 4: PO Workflow + Chase Log + Commissions + Communications

## CONTEXT
MedRepDesk Steps 1-3 complete. Auth working, core CRUD done (cases, distributors, facilities, surgeons, contacts), layout with bottom nav and FAB. Now build the core differentiator: the PO chase workflow, commission tracking, and communication logging.

Read MEDREPDESK_SCHEMA.sql and src/lib/schemas.js before writing any code — match exact column names and types. Read src/utils/constants.js for status labels and colors.

## WHAT TO BUILD

### 1. React Query Hooks

**`src/hooks/usePOs.js`**
```
- usePOs(filters) — list POs for account with case/facility/distributor joins
  Query: supabase.from('purchase_orders').select('*, case:cases(case_number, surgeon:surgeons(full_name)), facility:facilities(name), distributor:distributors(name)')
  Filters: status, facility_id, distributor_id
- usePO(id) — single PO with all joins
- useCasePOs(caseId) — POs for a specific case
- useCreatePO() — mutation
- useUpdatePO() — mutation with optimistic update
- useDeletePO() — owner only
```

**`src/hooks/useChaseLog.js`**
```
- useChaseLog(caseId) — all chase entries for a case, ordered by created_at desc
  Query: supabase.from('po_chase_log').select('*, facility:facilities(name)').eq('case_id', caseId).order('created_at', { ascending: false })
- useCreateChaseEntry() — mutation, invalidates chase log AND cases (triggers may advance status)
- useUpdateChaseEntry() — mutation
- useOverdueFollowUps() — chase entries where next_follow_up <= today AND follow_up_done = false
- useOverduePromisedDates() — chase entries where promised_date < today AND follow_up_done = false
```

**`src/hooks/useCommissions.js`**
```
- useCommissions(filters) — list commissions with case/distributor joins
  Query: supabase.from('commissions').select('*, case:cases(case_number), distributor:distributors(name)')
  Filters: status, distributor_id
- useCommission(id) — single
- useCaseCommission(caseId) — commission for a specific case
- useCreateCommission() — mutation
- useUpdateCommission() — mutation
```

**`src/hooks/useCommunications.js`**
```
- useCommunications(filters) — list comms with case join
  Query: supabase.from('communications').select('*, case:cases(case_number)')
  Filters: case_id, contact_id, follow_up_done
- useCaseCommunications(caseId) — comms for a specific case
- useCreateCommunication() — mutation
- useUpdateCommunication() — mutation
- useOverdueCommunications() — where follow_up_date <= today AND follow_up_done = false
```

### 2. PO List Page — Update `src/pages/Money.jsx`
Replace the placeholder with two real tabs:

**Purchase Orders Tab:**
- Filter chips: All, Pending, Received, Paid, Disputed
- List of PO cards showing: case_number, invoice_number, po_number (if exists), amount, facility, status badge, expected_payment_date
- Overdue POs highlighted (expected_payment_date < today and status not 'paid')
- Tap → /po/:id
- Summary bar at top: total outstanding amount, count of POs by status

**Commissions Tab:**
- Filter chips: All, Pending, Confirmed, Received, Disputed
- List showing: case_number, distributor, expected_amount, received_amount, status badge
- Tap → /commissions/:id
- Summary bar: total pending, total received this month, total received YTD

### 3. PO Detail Page — `src/pages/PODetail.jsx`
Route: /po/:id
- Header: invoice_number + status badge
- Info: case_number (tappable → case detail), facility, distributor, po_number, amount, dates (invoice, issue, expected payment, received, paid)
- PO photo/document (if storage_path exists — show placeholder for now, document upload in Step 5)
- **Chase Timeline** — full history from po_chase_log for this case, shown as a vertical timeline:
  - Each entry shows: date, chase_type icon, contact_name, outcome, promised_date (highlighted if overdue)
  - Most recent at top
- Action buttons based on status:
  - not_requested → "Start Chasing" (creates first chase entry)
  - requested/pending → "Log Follow-Up" button
  - Any non-paid → "Mark Received" (with date picker)
  - received → "Mark Paid" (with date + amount)
- "Log Follow-Up" opens chase entry form (bottom sheet)
- "Send Chase Email" button (placeholder — will implement in Step 5)

### 4. PO Form — `src/pages/POForm.jsx`
Route: /po/new?caseId=xxx
- Pre-selects case if caseId provided
- Fields: Case (searchable select if not pre-selected), Invoice Number (required), PO Number (optional), Amount, Invoice Date, Issue Date, Expected Payment Date, Notes
- Auto-fills facility_id and distributor_id from the selected case
- Zod validation
- On save: creates PO and first chase entry (type: 'bill_sheet_submitted' or 'po_requested' based on case status)

### 5. Chase Entry Form — Bottom sheet in PODetail
- Chase Type: dropdown (follow_up_call, follow_up_email, follow_up_text, escalation, note)
- Contact: searchable select from contacts + free text option
- Outcome: textarea (what happened)
- Promised Date: date picker (when did they say PO would arrive?)
- Next Follow-Up: date picker (when to follow up next)
- Action Taken: radio buttons (call, email, text, in_person, note)
- On save: creates po_chase_log entry (DB triggers may advance case status)

### 6. Commission Detail Page — `src/pages/CommissionDetail.jsx`
Route: /commissions/:id
- Case number, distributor, commission type, rate or flat amount
- Expected amount vs received amount (highlight discrepancy)
- Dates: expected, received
- Status with advancement: pending → confirmed → received
- Edit button to update received_amount, received_date, status
- Notes

### 7. Commission Form — `src/pages/CommissionForm.jsx`
Route: /commissions/new?caseId=xxx or edit mode
- Case (searchable select), Distributor (auto-filled from case)
- Commission Type: toggle (percentage/flat)
- Rate (if percentage) / Flat Amount (if flat)
- Case Value (auto-filled from case, editable)
- Expected Amount (auto-calculated: case_value * rate/100 or flat_amount)
- Expected Date
- Notes
- Zod validation

### 8. Communication Log Form — `src/pages/CommunicationForm.jsx`
Route: /communications/new?caseId=xxx
- Comm Type: select (call, email, text, in_person, voicemail, note)
- Direction: toggle (inbound/outbound)
- Case: searchable select (optional, pre-filled if from case)
- Contact Name: searchable from contacts or free text
- Subject: text
- Notes: textarea
- Outcome: textarea
- Follow-Up Date: date picker
- On save: creates communication record

### 9. Update Case Detail Page — `src/pages/CaseDetail.jsx`
Add these sections to the existing case detail:

**PO Section:**
- List POs for this case (using useCasePOs hook)
- Each shows invoice_number, amount, status badge
- "Add PO" button → /po/new?caseId=xxx
- Tap PO → /po/:id

**Commission Section:**
- Show commission for this case (using useCaseCommission hook)
- If no commission and case status >= completed: "Add Commission" button
- Auto-calculate button: uses distributor's default commission type/rate + case_value

**Communication Section:**
- List recent communications for this case
- "Log Communication" button → /communications/new?caseId=xxx
- Each shows: type icon, date, contact_name, brief outcome

**Chase Summary (if PO exists):**
- Number of chase attempts
- Last promised date (highlight if overdue)
- Days since last follow-up
- Next follow-up date

### 10. Status Advancement Actions on Case Detail
Update the action buttons to trigger the full workflow:

- **"Mark Completed"** (from confirmed): Updates case status, prompts "Add commission?" if distributor has defaults
- **"Log Bill Sheet"** (from completed): Creates chase log entry with type 'bill_sheet_submitted', navigates to PO form
- **"Chase PO"** (from bill_sheet_submitted/po_requested): Opens chase entry bottom sheet
- **"Mark PO Received"** (after POs exist): Updates PO status to 'received' (trigger advances case)
- **"Mark Paid"** (from po_received): Updates PO to 'paid' (trigger advances case + confirms commission)

### 11. Quick Actions Update
Update the FAB bottom sheet to include:
- New Case → /cases/new
- Log PO → /po/new
- Log Communication → /communications/new
- Add Contact → /contacts/new

### 12. Dashboard Updates
Update dashboard to show real action items:
- Overdue follow-ups (from useOverdueFollowUps)
- Overdue promised dates (from useOverduePromisedDates)
- Cases needing bill sheets (status = 'completed')
- POs being chased (status = 'requested' or 'pending')
- Overdue POs (expected_payment_date < today, not paid)
- Overdue commissions (expected_date < today, status = 'pending')

### 13. Update App Router
Add new routes:
```
/po/:id → PODetail (protected)
/po/new → POForm (protected)
/po/:id/edit → POForm edit mode (protected)
/commissions/:id → CommissionDetail (protected)
/commissions/new → CommissionForm (protected)
/commissions/:id/edit → CommissionForm edit mode (protected)
/communications/new → CommunicationForm (protected)
```

### 14. Chase Timeline Component — `src/components/features/ChaseTimeline.jsx`
Vertical timeline component showing chase log entries:
- Left side: date + time
- Center: colored dot (green for po_received, blue for follow-ups, orange for escalation, gray for notes)
- Right side: chase_type label, contact_name, outcome text, promised_date badge (red if overdue)
- Connecting line between dots
- Most recent at top

### 15. One-Tap Actions on PO Detail
Add quick action buttons for common chase actions:
- **Call** button: tel: link to facility billing_phone or contact phone
- **Email** button: mailto: link to facility billing_email (placeholder — real email sending in Step 5)
- **Text** button: sms: link to contact phone
- Each creates a chase log entry automatically with the action type

## IMPORTANT RULES
- Database triggers handle status advancement — do NOT manually update case status when PO status changes. Just update the PO and let triggers fire.
- Chase log entries may advance case status via triggers (bill_sheet_submitted → po_requested). After creating a chase entry, invalidate BOTH chase log AND cases query caches.
- Commission auto-calculation: if distributor has default_commission_type = 'percentage', expected_amount = case_value * default_commission_rate / 100. If 'flat', expected_amount = default_flat_amount.
- All currency displays use formatCurrency from utils/formatters.js
- All date displays use formatDate
- Overdue items (date < today) should be highlighted in red/warning colors
- DOMPurify on all text fields (outcome, notes, subject)
- Zod validation on all forms using schemas from schemas.js
- Mobile-first — all forms and lists must work well on 375px screens
- Touch targets minimum 44px
- Skeleton loading on all list/detail pages

## VERIFICATION
When done:
1. `npm run build` succeeds with no errors
2. Can create a PO from case detail, see it in PO list
3. Can log chase follow-ups with promised dates and next follow-up dates
4. Chase timeline shows full history on PO detail
5. Status triggers work: marking PO received advances case to po_received
6. Marking PO paid advances case to paid and confirms commission
7. Commission auto-calculates from distributor defaults
8. Money tab shows PO and Commission lists with filters
9. Dashboard action items show real overdue counts
10. One-tap call/email/text buttons create chase entries
11. Communication form works and shows on case detail
