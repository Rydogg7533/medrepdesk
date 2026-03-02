# CLAUDE CODE — MedRepDesk Step 3: Core CRUD + Layout + Navigation

## CONTEXT
MedRepDesk is a React + Vite PWA for medical device sales reps. Steps 1-2 complete — project scaffolded, Supabase connected, auth working (signup, signin, Google OAuth, role gating). Now build the core app: layout shell, bottom nav, and full CRUD for cases, distributors, facilities, surgeons, and contacts.

Read MEDREPDESK_SCHEMA.sql and src/lib/schemas.js before writing any code — match exact column names and types. Read src/utils/constants.js for status labels and colors.

## WHAT TO BUILD

### 1. Layout Shell — `src/components/layout/AppLayout.jsx`
The main authenticated layout wrapping all protected pages:
- Top header bar with "MedRepDesk" logo/text on left, notification bell icon on right (placeholder badge count)
- Main content area with padding, scrollable
- Bottom navigation bar (fixed to bottom, above safe area)
- Floating action button (FAB) — [+] circle in brand-500, positioned above bottom nav on the right
- FAB opens a bottom sheet with quick actions: New Case, Log Communication, Add Contact
- Content area should account for both header height and bottom nav height (no content hidden behind them)

### 2. Bottom Navigation — `src/components/layout/BottomNav.jsx`
5 tabs with icons (use lucide-react):
- **Home** (LayoutDashboard icon) → /
- **Cases** (Briefcase icon) → /cases
- **Money** (DollarSign icon) → /money (POs + Commissions)
- **Contacts** (Users icon) → /contacts
- **More** (Menu icon) → /more (Settings, Distributors, Facilities, Referrals)

Active tab uses brand-500 color, inactive uses gray-400. Labels below icons. Touch targets minimum 44px. Include safe-area-inset-bottom padding.

### 3. Bottom Sheet Component — `src/components/ui/BottomSheet.jsx`
Reusable bottom sheet modal:
- Slides up from bottom with backdrop overlay
- Drag handle at top
- Close on backdrop tap or swipe down
- Smooth CSS transitions (transform + opacity)
- Props: isOpen, onClose, title, children
- z-index above everything else

### 4. React Query Hooks
Create TanStack Query hooks for all entities. Each hook provides list, single, create, update, delete operations with optimistic updates.

**`src/hooks/useCases.js`**
```
- useCases(filters) — list cases for account, with optional status/date filters
  Query: supabase.from('cases').select('*, surgeon:surgeons(full_name), facility:facilities(name), distributor:distributors(name)').eq('account_id', accountId).order('scheduled_date', { ascending: false })
- useCase(id) — single case with all joins
- useCreateCase() — mutation, auto-generates case_number using src/utils/caseNumber.js
- useUpdateCase() — mutation with optimistic update
- useDeleteCase() — mutation (owner only)
```

**`src/hooks/useDistributors.js`**
```
- useDistributors() — list all for account
- useDistributor(id) — single
- useCreateDistributor() — mutation
- useUpdateDistributor() — mutation
- useDeleteDistributor() — owner only
```

**`src/hooks/useFacilities.js`**
```
- useFacilities() — list all (global + account's own)
- useFacility(id) — single
- useCreateFacility() — mutation (always sets is_global=false, account_id from auth)
- useUpdateFacility() — mutation (own only, not global)
```

**`src/hooks/useSurgeons.js`**
```
- useSurgeons() — list all (global + account's own)
- useSurgeon(id) — single
- useCreateSurgeon() — mutation (always is_global=false)
- useUpdateSurgeon() — mutation (own only)
```

**`src/hooks/useContacts.js`**
```
- useContacts() — list all for account, with facility/distributor join
  Query: supabase.from('contacts').select('*, facility:facilities(name), distributor:distributors(name)')
- useContact(id) — single
- useCreateContact() — mutation
- useUpdateContact() — mutation
- useDeleteContact() — owner only
```

**Important patterns for ALL hooks:**
- Get account_id from useAuth() context
- All mutations invalidate the relevant query cache on success
- Use .eq('account_id', accountId) on all queries
- Handle errors and expose them
- All insert mutations should include account_id in the data

### 5. Pages

**`src/pages/Dashboard.jsx`** — Replace the placeholder with a real dashboard:
- Greeting: "Good [morning/afternoon/evening], {first_name}"
- Today's cases card (cases where scheduled_date = today) — show time, surgeon, facility, procedure
- Upcoming cases (next 7 days) — compact list
- Action items card: overdue follow-ups count, cases needing bill sheets, POs being chased
- Quick stats: total cases this month, total case value this month
- Each card is tappable and navigates to the relevant list
- Use skeleton loading states (not spinners) while data loads

**`src/pages/Cases.jsx`** — Case list page:
- Filter tabs at top: All, Scheduled, In Progress (confirmed+completed+bill_sheet), Chasing (po_requested), Money (billed+po_received+paid)
- Search bar (searches case_number, surgeon name, facility name)
- List of case cards showing: case_number, surgeon, facility, date, procedure badge, status badge
- Status badges use colors from constants.js
- Tap card → navigate to /cases/:id
- FAB adds new case
- Empty state when no cases
- Skeleton loading

**`src/pages/CaseDetail.jsx`** — Single case view:
- Route: /cases/:id
- Header with case_number and status badge
- Info sections: Surgeon, Facility, Distributor, Procedure, Date/Time, Case Value
- Status timeline showing progression through the pipeline (visual steps)
- Notes section (editable)
- Action buttons based on current status:
  - scheduled → "Confirm Case" button
  - confirmed → "Mark Completed" button
  - completed → "Log Bill Sheet" (navigates to PO chase flow — placeholder for now)
- Edit button (opens edit form in bottom sheet)
- Related POs section (placeholder — will build in Step 4)
- Related Communications section (placeholder)
- Delete button (owner only, with confirmation)

**`src/pages/CaseForm.jsx`** — Create/Edit case form:
- Route: /cases/new and used as bottom sheet for editing
- Fields: Surgeon (searchable dropdown from useSurgeons), Facility (searchable dropdown), Distributor (dropdown), Procedure Type (select from constants), Scheduled Date (date picker), Scheduled Time (time picker), Case Value (currency input), Notes (textarea)
- Zod validation using caseInsertSchema
- DOMPurify on notes field
- On create: auto-generates case_number, sets status='scheduled'
- On edit: updates existing case
- Save/Cancel buttons

**`src/pages/Contacts.jsx`** — Contact list:
- Search bar (name, role, facility)
- List showing: name, role, facility or distributor, phone (tap to call), last contacted date
- Tap → /contacts/:id
- FAB adds new contact
- Skeleton loading, empty state

**`src/pages/ContactDetail.jsx`** — Single contact:
- Route: /contacts/:id
- Name, role, facility/distributor, phone (tap to call), email (tap to email)
- Last contacted date
- Notes
- Edit/Delete buttons
- Communication history for this contact (placeholder)

**`src/pages/ContactForm.jsx`** — Create/Edit contact:
- Fields: Full Name, Role (free text), Facility (dropdown), Distributor (dropdown), Phone, Email, Notes
- Zod validation
- DOMPurify on notes

**`src/pages/Money.jsx`** — PO + Commission overview (placeholder for Step 4):
- Two tabs: Purchase Orders, Commissions
- For now, show "Coming soon" with icon
- Will be fully built in Step 4

**`src/pages/More.jsx`** — Settings menu:
- List of navigation items:
  - Distributors → /distributors
  - Facilities → /facilities
  - Surgeons → /surgeons
  - Referrals → /referrals (owner only via RoleGate)
  - Settings → /settings
  - Sign Out
- Each item shows icon + label + chevron right

**`src/pages/Distributors.jsx`** — Distributor list:
- List showing: name, billing email, commission type + rate
- Tap → /distributors/:id
- Add button in header

**`src/pages/DistributorDetail.jsx`** — Single distributor:
- All fields displayed
- Edit/Delete buttons (owner only for delete)

**`src/pages/DistributorForm.jsx`** — Create/Edit distributor:
- Fields: Name, Billing Email, Billing Email CC (comma-separated → array), Billing Contact Name, Billing Contact Phone, Commission Type (percentage/flat toggle), Commission Rate (if percentage), Flat Amount (if flat), Notes
- Zod validation

**`src/pages/Facilities.jsx`** — Facility list:
- Shows global facilities (labeled) + own facilities
- Global facilities are read-only
- Add button for own facilities

**`src/pages/FacilityForm.jsx`** — Create/Edit facility:
- Fields: Name, Type (hospital/asc/clinic/other), Address, City, State, Phone, Billing Phone, Notes

**`src/pages/Surgeons.jsx`** — Surgeon list:
- Shows global + own surgeons
- Name, specialty, primary facility

**`src/pages/SurgeonForm.jsx`** — Create/Edit surgeon:
- Fields: Full Name, Specialty, Primary Facility (dropdown), Phone, Email, Notes

### 6. Searchable Select Component — `src/components/ui/SearchableSelect.jsx`
Used for surgeon/facility/distributor dropdowns in forms:
- Text input that filters options as you type
- Dropdown list below input
- Shows "No results" when empty
- "Add new" option at bottom of list
- Props: options, value, onChange, placeholder, onAddNew
- Mobile-friendly (large touch targets)

### 7. Status Badge Component — `src/components/ui/StatusBadge.jsx`
- Props: status, type ('case' | 'po' | 'commission')
- Looks up label and colors from constants.js
- Small rounded pill with background color and text

### 8. Skeleton Loading Component — `src/components/ui/Skeleton.jsx`
- Animated pulse placeholder
- Variants: text (single line), card (rounded rectangle), list (multiple lines)
- Props: variant, count (for list)

### 9. Empty State Component — `src/components/ui/EmptyState.jsx`
- Centered icon + title + description + optional action button
- Props: icon, title, description, actionLabel, onAction

### 10. Confirm Dialog Component — `src/components/ui/ConfirmDialog.jsx`
- Modal overlay with title, message, confirm/cancel buttons
- Confirm button can be danger variant
- Props: isOpen, onClose, onConfirm, title, message, confirmLabel, variant

### 11. Update App Router — `src/App.jsx`
Add all new routes:
```
/ → Dashboard (protected)
/cases → Cases (protected)
/cases/new → CaseForm (protected)
/cases/:id → CaseDetail (protected)
/contacts → Contacts (protected)
/contacts/new → ContactForm (protected)
/contacts/:id → ContactDetail (protected)
/money → Money (protected)
/more → More (protected)
/distributors → Distributors (protected)
/distributors/new → DistributorForm (protected)
/distributors/:id → DistributorDetail (protected)
/facilities → Facilities (protected)
/facilities/new → FacilityForm (protected)
/surgeons → Surgeons (protected)
/surgeons/new → SurgeonForm (protected)
/settings → Settings placeholder (protected)
/referrals → Referrals placeholder (protected, owner only)
```
All protected routes wrapped in AppLayout (with bottom nav).
Auth routes (signin, signup, etc.) do NOT get AppLayout.

### 12. Currency Formatter Utility — `src/utils/formatters.js`
```javascript
export function formatCurrency(amount) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(time) {
  if (!time) return '—';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
```

## IMPORTANT RULES
- Mobile-first design — everything should look great on a 375px wide screen
- All list pages must have skeleton loading (not spinners)
- All forms must use Zod validation with inline error messages
- DOMPurify.sanitize() on ALL text/notes fields before sending to Supabase
- Touch targets minimum 44px
- Use Tailwind classes only — no inline styles, no CSS modules
- Import useAuth from context for account_id in all hooks
- All Supabase queries include .eq('account_id', accountId) where applicable
- Status badges use the exact colors from src/utils/constants.js
- Phone numbers should be tappable (tel: links)
- Email addresses should be tappable (mailto: links)
- Back navigation: use react-router-dom useNavigate(-1) or explicit back buttons
- Do NOT build PO workflow, chase log, or commission tracking yet — those are Step 4
- Do NOT build any Edge Functions — those come later
- The case_number is auto-generated on creation — never shown as an input field

## VERIFICATION
When done:
1. `npm run build` succeeds with no errors
2. Bottom nav renders on all protected pages with 5 tabs
3. Dashboard shows greeting, today's cases, upcoming cases
4. Can create a new case with surgeon/facility/distributor selection
5. Case list shows with status badges and filters
6. Case detail shows all info with status timeline
7. Can create/view/edit distributors, facilities, surgeons, contacts
8. All forms validate with Zod and show inline errors
9. Empty states show when no data exists
10. Navigation between all pages works correctly
11. FAB opens bottom sheet with quick actions
