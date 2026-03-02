# CLAUDE CODE — MedRepDesk Step 5: AI Features + Edge Functions

## CONTEXT
MedRepDesk Steps 1-4 complete + dark mode. Auth, CRUD, PO workflow, chase log, commissions, communications all working. Now build the AI-powered features via Supabase Edge Functions. The ANTHROPIC_API_KEY is already stored in Supabase Edge Function secrets.

Read MEDREPDESK_SCHEMA.sql and src/lib/schemas.js before writing any code.

## IMPORTANT: Supabase Edge Functions use Deno, NOT Node.js
- No npm packages — use Deno-compatible imports
- Use `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"`
- Use `import { createClient } from "https://esm.sh/@supabase/supabase-js@2"`
- Access secrets via `Deno.env.get('SECRET_NAME')`
- Each function lives in `supabase/functions/<function-name>/index.ts`
- Deploy with `supabase functions deploy <function-name>`

## WHAT TO BUILD

### 1. Edge Function: PO Document Extraction — `supabase/functions/extract-po/index.ts`

Takes a base64 image of a PO document, sends it to Claude, extracts structured data.

```typescript
// POST body: { image_base64: string, account_id: string, case_id: string }
// Returns: { po_number, amount, issue_date, facility_name, payment_terms, invoice_number, raw_text }

// Implementation:
// 1. Validate auth (check Authorization header Bearer token)
// 2. Send image to Anthropic API (claude-sonnet-4-20250514) with vision
// 3. System prompt instructs Claude to extract PO fields as JSON
// 4. Parse response
// 5. Log extraction in ai_extractions table (using service role client)
// 6. Increment account's ai_extractions_this_month
// 7. Check plan limits before processing (solo: 50/mo, assistant: 100/mo, distributorship: 500/mo)
// 8. Return extracted fields

// System prompt for Claude:
`You are a document data extraction assistant for medical device purchase orders.
Extract the following fields from this purchase order image. Return ONLY valid JSON with no other text.
{
  "po_number": "string or null",
  "amount": "number or null (total dollar amount)",
  "issue_date": "string ISO date or null",
  "facility_name": "string or null",
  "payment_terms": "string or null (e.g. 'Net 30')",
  "invoice_number": "string or null",
  "vendor_name": "string or null"
}
If a field cannot be determined, set it to null.`
```

CORS headers required:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### 2. Edge Function: Smart Case Entry — `supabase/functions/smart-case-entry/index.ts`

Takes natural language text, parses into structured case fields. Matches against account's known surgeons and facilities.

```typescript
// POST body: { text: string, account_id: string }
// Returns: { surgeon_name, facility_name, procedure_type, scheduled_date, scheduled_time, case_value, notes }

// Implementation:
// 1. Validate auth
// 2. Fetch account's surgeons and facilities for context
// 3. Send to Claude with surgeon/facility lists for matching
// 4. Parse response
// 5. Log in ai_extractions table
// 6. Return structured fields with matched surgeon_id and facility_id if found

// System prompt:
`You are a medical device sales rep assistant. Parse the following natural language case description into structured data.

Known surgeons: ${surgeonList}
Known facilities: ${facilityList}

Return ONLY valid JSON:
{
  "surgeon_name": "string - match to known surgeon if possible",
  "surgeon_id": "uuid or null - ID of matched surgeon",
  "facility_name": "string - match to known facility if possible",
  "facility_id": "uuid or null - ID of matched facility",
  "procedure_type": "hip|knee|shoulder|spine|trauma|other or null",
  "scheduled_date": "ISO date string or null",
  "scheduled_time": "HH:MM or null",
  "case_value": "number or null",
  "notes": "any remaining details as string"
}`
```

### 3. Edge Function: Chase Email Draft — `supabase/functions/draft-chase-email/index.ts`

Generates a professional follow-up email for PO chasing.

```typescript
// POST body: { case_id: string, po_id: string, account_id: string, tone: 'polite' | 'firm' | 'urgent' }
// Returns: { subject: string, body: string }

// Implementation:
// 1. Validate auth
// 2. Fetch case details (case_number, surgeon, facility, distributor, case_value)
// 3. Fetch PO details (invoice_number, po_number, amount, dates)
// 4. Fetch chase history (number of attempts, last contact, promised dates)
// 5. Send to Claude to generate email
// 6. Return subject + body

// System prompt:
`You are a professional medical device sales rep writing a follow-up email to a hospital billing department about a purchase order.

Case details:
- Case: ${caseNumber}
- Invoice: ${invoiceNumber}
- Amount: ${amount}
- Facility: ${facilityName}
- Surgeon: ${surgeonName}

Chase history:
- Number of follow-ups: ${chaseCount}
- Last contact: ${lastContactDate}
- Promised date: ${promisedDate}

Tone: ${tone}

Write a professional email. For 'polite' tone, be friendly and courteous. For 'firm' tone, be direct and reference previous commitments. For 'urgent' tone, emphasize overdue status and escalation.

Return ONLY valid JSON:
{
  "subject": "email subject line",
  "body": "email body text (plain text, include greeting and sign-off placeholder)"
}`
```

### 4. Edge Function: Commission Check — `supabase/functions/commission-check/index.ts`

Analyzes commission patterns for discrepancies.

```typescript
// POST body: { account_id: string, distributor_id: string }
// Returns: { analysis: string, discrepancies: Array<{case_number, expected, received, difference}> }

// Implementation:
// 1. Validate auth
// 2. Fetch all commissions for this distributor where received_amount exists
// 3. Compare expected vs received amounts
// 4. Send to Claude for analysis
// 5. Return analysis + flagged discrepancies
```

### 5. React Hook: useAI — `src/hooks/useAI.js`

```javascript
// Wraps all AI Edge Function calls
// - useExtractPO() — mutation, takes image file, returns extracted fields
// - useSmartCaseEntry() — mutation, takes text, returns parsed fields
// - useDraftChaseEmail() — mutation, takes case_id + po_id + tone, returns email draft
// - useCommissionCheck() — mutation, takes distributor_id, returns analysis

// All calls go through: supabase.functions.invoke('function-name', { body: {...} })
// Handle loading states and errors
// Check plan limits before calling (show upgrade prompt if exceeded)
```

### 6. PO Photo Capture + Extraction UI — Update `src/pages/PODetail.jsx` and `src/pages/POForm.jsx`

Add to POForm and PODetail:
- "Scan PO" button with camera icon
- Opens device camera (input type="file" accept="image/*" capture="environment")
- On photo capture:
  1. Compress image client-side (max 2000x2000, quality 0.85)
  2. Convert to base64
  3. Call useExtractPO mutation
  4. Show loading state: "Extracting PO data..."
  5. Pre-fill form fields with extracted data
  6. Show confidence indicators (fields that were extracted vs null)
  7. User confirms/edits and saves
- Upload photo to Supabase Storage (case-documents bucket)
- Save storage_path to purchase_orders record

Create image compression utility — `src/utils/imageCompression.js`:
```javascript
export async function compressImage(file, maxWidth = 2000, maxHeight = 2000, quality = 0.85) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

export function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
}
```

### 7. Smart Case Entry UI — Update `src/pages/CaseForm.jsx`

Add a "Quick Entry" toggle/button at the top of the case form:
- Textarea: "Describe the case in plain English..."
- Example placeholder: "Dr. Chen, hip replacement at IMC next Tuesday 7:30am, Stryker, $18k"
- "Parse" button → calls useSmartCaseEntry
- Loading state while AI processes
- Auto-fills form fields with parsed data
- User reviews, edits if needed, and saves normally
- Toggle back to manual form at any time

### 8. Chase Email Draft UI — Update `src/pages/PODetail.jsx`

Add "Draft Email" button to PO detail page:
- Opens bottom sheet with tone selector: Polite / Firm / Urgent
- "Generate" button → calls useDraftChaseEmail
- Shows generated email in editable textarea
- "Copy" button to copy to clipboard
- "Send via Email" button (opens mailto: with pre-filled subject and body)
- "Save as Note" button (creates communication record with the email content)

### 9. Plan Limit Checking — `src/utils/planLimits.js`

```javascript
import { PLAN_LIMITS } from './constants';

export function canUseAIExtraction(account) {
  const limits = PLAN_LIMITS[account.plan];
  return account.ai_extractions_this_month < limits.aiExtractions;
}

export function canUseAIDigest(account) {
  const limits = PLAN_LIMITS[account.plan];
  if (limits.aiDigests === -1) return true; // unlimited
  return account.ai_digest_this_month < limits.aiDigests;
}

export function getRemainingExtractions(account) {
  const limits = PLAN_LIMITS[account.plan];
  return Math.max(0, limits.aiExtractions - account.ai_extractions_this_month);
}
```

### 10. Storage Setup
The Edge Functions need to create the storage bucket. Add to extract-po function:
- After extraction, upload original image to Supabase Storage
- Path: `{account_id}/{case_id}/{document_id}/po_photo.jpg`
- Save storage_path on the purchase_orders record
- Also create a case_documents record with document_type = 'po_photo'

### 11. CSV Contact Import — `src/pages/ContactImport.jsx`

Route: /contacts/import (add to router)

- File picker: accepts .csv files
- Parse CSV with first row as headers
- Column mapping UI:
  - Show detected CSV columns on left
  - Dropdown on right to map to contact fields: full_name, role, phone, email, facility (name match), distributor (name match), notes, skip
  - Auto-map obvious columns (name→full_name, phone→phone, email→email)
- Preview first 5 rows with mapped data
- "Import" button:
  - Validates each row
  - Matches facility/distributor names to existing records
  - Skips duplicates (same name + phone or name + email)
  - Creates contact records
  - Shows results: X imported, X skipped, X errors
- Add "Import CSV" button to Contacts page header

Use Papaparse pattern (but implement manually since we can't add packages — just split on commas handling quoted fields):
```javascript
function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim() || ''; });
    return row;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += char; }
  }
  result.push(current);
  return result;
}
```

### 12. Deploy Edge Functions
After creating all Edge Functions, deploy them:
```bash
supabase functions deploy extract-po
supabase functions deploy smart-case-entry
supabase functions deploy draft-chase-email
supabase functions deploy commission-check
```

Also set the required secrets (ANTHROPIC_API_KEY is already set, but also need):
```bash
supabase secrets set SUPABASE_URL=https://stlifwaolzpblhyqzahc.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<get from dashboard>
```

NOTE: Do NOT deploy the functions — I will deploy manually. Just create the files and verify they compile. For the secrets, just add comments noting what needs to be set.

## IMPORTANT RULES
- Edge Functions are Deno/TypeScript — NOT Node.js
- Use `https://esm.sh/` for any npm package imports in Edge Functions
- All AI calls include the account_id for billing/tracking
- Always check plan limits before making AI API calls
- Log every AI call in ai_extractions table
- Increment ai_extractions_this_month on the account after each extraction
- The Anthropic API key is accessed via Deno.env.get('ANTHROPIC_API_KEY')
- Create Supabase client in Edge Functions using service role key for DB operations
- Client-side calls use supabase.functions.invoke() — NOT direct fetch to Edge Functions
- Image compression happens client-side before sending to Edge Function
- All Edge Functions must handle CORS (OPTIONS preflight + response headers)
- Error handling: return proper HTTP status codes and error messages
- DOMPurify on all user-generated text before sending to AI
- Dark mode support on all new UI elements

## VERIFICATION
When done:
1. `npm run build` succeeds with no errors
2. All 4 Edge Function files created in supabase/functions/
3. PO Form has "Scan PO" camera button
4. Case Form has "Quick Entry" AI parser
5. PO Detail has "Draft Email" with tone selector
6. CSV import page works with column mapping
7. Plan limit checks are in place
8. Image compression utility works
9. All new UI supports dark mode
