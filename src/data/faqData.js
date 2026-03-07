// MedRepDesk — Comprehensive FAQ Database
// Drop this into src/data/faqData.js
// Used by the FAQ search component — searchable by question, answer, tags, and category

export const FAQ_CATEGORIES = [
  { id: "getting-started", label: "Getting Started", icon: "🚀" },
  { id: "cases", label: "Cases & Workflow", icon: "📋" },
  { id: "po-chase", label: "PO Chase", icon: "🎯" },
  { id: "commissions", label: "Commissions", icon: "💰" },
  { id: "communications", label: "Communications & Contacts", icon: "📞" },
  { id: "notifications", label: "Notifications & Digest", icon: "🔔" },
  { id: "ai", label: "AI Features", icon: "🤖" },
  { id: "voice", label: "Voice", icon: "🎙️" },
  { id: "team", label: "Team & Assistant", icon: "👥" },
  { id: "billing", label: "Billing & Plans", icon: "💳" },
  { id: "referrals", label: "Referral Program", icon: "🔗" },
  { id: "account", label: "Account & Settings", icon: "⚙️" },
  { id: "security", label: "Security & Privacy", icon: "🔒" },
  { id: "technical", label: "Technical & App", icon: "📱" },
  { id: "theming", label: "Theming & Personalization", icon: "🎨" },
];

export const FAQS = [

  // ─── GETTING STARTED ───────────────────────────────────────

  {
    id: "gs-001",
    category: "getting-started",
    question: "What is MedRepDesk?",
    answer: "MedRepDesk is a mobile-first app built specifically for independent medical device sales reps. It manages your entire workflow from case scheduling through commission payment — cases, PO chasing, commission tracking, communications, and contacts — all from your phone. The core differentiator is a dedicated PO chase workflow that no other tool has.",
    tags: ["overview", "what is", "intro", "about"],
  },
  {
    id: "gs-002",
    category: "getting-started",
    question: "Who is MedRepDesk built for?",
    answer: "Independent orthopedic and broader medical device sales reps who need to manage their own book of business. If you're chasing POs from hospitals and ASCs, tracking commissions from distributors, and managing cases across multiple surgeons and facilities — MedRepDesk is built for exactly your workflow.",
    tags: ["who", "target", "reps", "orthopedic", "medical device"],
  },
  {
    id: "gs-003",
    category: "getting-started",
    question: "How do I get started?",
    answer: "Sign up for a free 14-day trial — no credit card required. You'll go through a short onboarding flow to set up your account, add your distributors, and optionally import your contacts. Your first case can be logged in under 2 minutes.",
    tags: ["start", "signup", "trial", "onboarding", "setup"],
  },
  {
    id: "gs-004",
    category: "getting-started",
    question: "How long is the free trial?",
    answer: "14 days. Full access to all features on your chosen plan — no credit card required to start. You'll see a banner in the app showing how many days are left in your trial.",
    tags: ["trial", "free", "14 days", "no credit card"],
  },
  {
    id: "gs-005",
    category: "getting-started",
    question: "Do I need to install anything?",
    answer: "No app store required. MedRepDesk is a Progressive Web App (PWA). On iPhone, open the site in Safari and tap 'Add to Home Screen.' On Android, Chrome will prompt you to install. It installs like a native app, works offline, and gets updates automatically.",
    tags: ["install", "download", "app store", "PWA", "iPhone", "Android"],
  },
  {
    id: "gs-006",
    category: "getting-started",
    question: "How do I add my surgeons and facilities?",
    answer: "Go to the More tab → Surgeons or Facilities. You can add them manually one at a time, or they'll be suggested automatically when you start typing during case entry. If you already have them in a spreadsheet, you can import contacts via CSV from the Contacts section.",
    tags: ["surgeons", "facilities", "add", "setup", "import"],
  },
  {
    id: "gs-007",
    category: "getting-started",
    question: "How do I add my distributors?",
    answer: "Go to More → Distributors → Add Distributor. Enter the distributor name, billing email and CC recipients, billing contact name and phone, and set your default commission rate (percentage or flat dollar amount). These defaults apply automatically to every case you create for that distributor.",
    tags: ["distributor", "add", "setup", "commission rate", "billing email"],
  },
  {
    id: "gs-008",
    category: "getting-started",
    question: "Can I import my existing contacts?",
    answer: "Yes. Go to Contacts → Import CSV. Export your contacts from your phone or a spreadsheet as a CSV file, upload it, and MedRepDesk will map the fields automatically. Name, role, phone, email, and facility associations are all supported.",
    tags: ["import", "CSV", "contacts", "bulk", "upload"],
  },

  // ─── CASES ──────────────────────────────────────────────────

  {
    id: "cs-001",
    category: "cases",
    question: "What is a 'case' in MedRepDesk?",
    answer: "A case represents a single surgical procedure you're involved in as a rep — the implant sale tied to a specific surgery at a specific facility with a specific surgeon on a specific date. Everything else in MedRepDesk — POs, commissions, communications, chase log entries — flows through a case.",
    tags: ["case", "what is", "definition", "surgery", "procedure"],
  },
  {
    id: "cs-002",
    category: "cases",
    question: "What do the case statuses mean?",
    answer: "Cases move through: Scheduled (booked, not yet happened) → Confirmed (instruments confirmed, rep is going) → Completed (surgery done) → Bill Sheet Submitted (you've submitted the bill sheet to your distributor) → PO Requested (you've started chasing the PO) → PO Received (the PO came in) → Paid (commission received) → Cancelled. Status advances automatically as you log activity — you don't manually update most transitions.",
    tags: ["status", "pipeline", "scheduled", "completed", "paid", "bill sheet", "PO received"],
  },
  {
    id: "cs-003",
    category: "cases",
    question: "How does the case number work?",
    answer: "Every case gets a unique number in the format MRD-XXXX-YEAR-0001. The XXXX is a 4-character prefix tied to your account — so your case numbers are globally unique across all MedRepDesk users. The sequence resets each year. You can use this number when referencing cases with your distributor or facility without ever exposing patient information.",
    tags: ["case number", "MRD", "format", "unique", "reference"],
  },
  {
    id: "cs-004",
    category: "cases",
    question: "How do I create a new case?",
    answer: "Tap the + FAB button (floating action button) on any screen → New Case. You can fill out the form manually or use AI Smart Case Entry to describe the case in plain language. The form includes surgeon, facility, distributor, procedure type, scheduled date and time, and case value.",
    tags: ["create case", "new case", "add case", "FAB", "plus button"],
  },
  {
    id: "cs-005",
    category: "cases",
    question: "What is AI Smart Case Entry?",
    answer: "Instead of filling out a form, you describe the case the way you'd say it: 'Hip replacement with Dr. Martinez at Valley ASC next Tuesday at 7am through Acumed.' AI parses your description into structured fields — surgeon, facility, distributor, procedure type, date and time — and matches against your existing database. You review and confirm. Saves 2-3 minutes per case.",
    tags: ["AI", "smart case entry", "voice", "natural language", "AI entry", "quick add"],
  },
  {
    id: "cs-006",
    category: "cases",
    question: "Can I assign a case to my assistant?",
    answer: "Yes. When creating or editing a case, use the 'Assigned To' field to assign it to any user on your account. On AI Pro and Distributorship plans, your assistant can be assigned cases and will see them in their own dashboard.",
    tags: ["assign", "assistant", "delegate", "assigned to"],
  },
  {
    id: "cs-007",
    category: "cases",
    question: "How do I mark a case as completed?",
    answer: "Open the case → tap 'Update Status' → select Completed. Or log a communication/chase entry that advances the status automatically. Once a case is marked Completed and has a case value, a commission record is created automatically.",
    tags: ["complete", "mark completed", "status update", "finish case"],
  },
  {
    id: "cs-008",
    category: "cases",
    question: "Can I cancel a case?",
    answer: "Yes. Open the case → Update Status → Cancelled. Cancelled cases are kept in your history but removed from active tracking. Any open follow-ups or chase log entries tied to the case are marked done automatically.",
    tags: ["cancel", "cancelled", "remove case", "delete case"],
  },
  {
    id: "cs-009",
    category: "cases",
    question: "What is a bill sheet and when do I submit it?",
    answer: "A bill sheet (or bill of materials) is the document you submit to your distributor after surgery listing the implants and instruments used. You submit it to initiate the billing process — the distributor then invoices the hospital and issues you a PO. Log 'Bill Sheet Submitted' in the chase log to advance the case status and start the PO clock.",
    tags: ["bill sheet", "bill of materials", "submit", "distributor", "billing"],
  },
  {
    id: "cs-010",
    category: "cases",
    question: "How do I search or filter my cases?",
    answer: "On the Cases tab, use the search bar to search by surgeon name, facility, case number, or procedure type. Filter buttons let you filter by status, date range, or distributor. Cases are sorted by scheduled date by default.",
    tags: ["search", "filter", "find case", "sort"],
  },

  // ─── PO CHASE ───────────────────────────────────────────────

  {
    id: "po-001",
    category: "po-chase",
    question: "What is the PO chase workflow?",
    answer: "After a case is completed and a bill sheet is submitted, you need to chase the hospital or ASC for the purchase order. The chase workflow is a dedicated log of every attempt — calls, emails, texts, visits — with promised dates, follow-up scheduling, and escalation detection. It's the core of MedRepDesk and what no other tool has.",
    tags: ["PO chase", "chase workflow", "purchase order", "follow up", "chase log"],
  },
  {
    id: "po-002",
    category: "po-chase",
    question: "How do I log a chase attempt?",
    answer: "Open a case → Chase Log tab → Add Entry. Select the chase type (call, email, text, in-person, note), enter the contact name and role, note the outcome, and optionally set a promised date and next follow-up date. The entry timestamps automatically and the case status updates if appropriate.",
    tags: ["log chase", "chase entry", "add chase", "record call"],
  },
  {
    id: "po-003",
    category: "po-chase",
    question: "What is a promised date?",
    answer: "When a billing contact tells you 'the PO will be sent by Thursday,' you log that date as a Promised Date on the chase entry. MedRepDesk tracks it and sends you a push notification the morning after the promised date if the PO hasn't arrived. Never forget a broken promise again.",
    tags: ["promised date", "promise", "they said", "billing said", "alert", "notification"],
  },
  {
    id: "po-004",
    category: "po-chase",
    question: "What is escalation detection?",
    answer: "You set an escalation threshold in your account settings (default: 3 chase attempts). When any case hits that threshold with no PO received, MedRepDesk automatically flags it and sends you an escalation alert. It tells you the case, how many attempts were made, and the last contact. You decide when to go above billing to a manager — MedRepDesk makes sure you don't let it slide.",
    tags: ["escalation", "escalate", "threshold", "no PO", "overdue", "manager"],
  },
  {
    id: "po-005",
    category: "po-chase",
    question: "How does PO photo extraction work?",
    answer: "When a PO arrives physically or as an email attachment, photograph it or screenshot it and upload it in MedRepDesk. AI reads the document and extracts the PO number, invoice amount, issue date, facility name, and payment terms. It pre-fills your PO form. You review, confirm, and the PO is logged. Works on all plans, unlimited.",
    tags: ["photo", "PO photo", "AI extraction", "scan PO", "photograph", "auto-fill", "OCR"],
  },
  {
    id: "po-006",
    category: "po-chase",
    question: "How do I forward a PO to my distributor?",
    answer: "Open a PO → tap 'Send to Distributor.' MedRepDesk uses the billing email and CC recipients stored in your distributor settings to compose the email automatically. It includes the invoice details, case reference number, and a professional note. You review the draft and send with one tap. No manual forwarding from your email client.",
    tags: ["forward PO", "send PO", "email distributor", "auto email", "billing email", "submit PO"],
  },
  {
    id: "po-007",
    category: "po-chase",
    question: "What is AI chase email drafting?",
    answer: "On AI Pro and Distributorship plans, open any case with an outstanding PO → tap 'Draft Chase Email.' AI generates a complete, professional follow-up email populated with the case number, invoice number, the amount owed, the contact's name and role, a reference to previous attempts, and a clear ask. Sounds like you wrote it because it knows your history. Edit if you want, send in seconds.",
    tags: ["AI email", "chase email", "draft email", "follow up email", "AI Pro"],
  },
  {
    id: "po-008",
    category: "po-chase",
    question: "Can I see all open POs across all cases?",
    answer: "Yes. The Money tab shows all open POs sorted by age — the oldest first. You can filter by status (requested, pending, overdue), by facility, or by distributor. Cases with no PO and a bill sheet submitted also surface here so nothing gets missed.",
    tags: ["all POs", "open POs", "money tab", "PO list", "overview"],
  },
  {
    id: "po-009",
    category: "po-chase",
    question: "What happens when a PO is received?",
    answer: "When you mark a PO as received, the case status automatically advances to 'PO Received,' all open chase log follow-ups for that case are marked done, and any open communication follow-ups tied to the case are also closed out. You can then log the payment date when the distributor pays.",
    tags: ["PO received", "received", "auto close", "follow up done", "case status"],
  },
  {
    id: "po-010",
    category: "po-chase",
    question: "How do I record a PO number and invoice number?",
    answer: "Open the case → PO tab → Add PO or edit existing. Enter the PO number (from the hospital), invoice number (from your distributor), amount, issue date, and expected payment date. If you photographed the PO, these fields are pre-filled by AI extraction.",
    tags: ["PO number", "invoice number", "enter PO", "record PO", "add PO"],
  },
  {
    id: "po-011",
    category: "po-chase",
    question: "Can I see a timeline of all activity on a case?",
    answer: "Yes. Every case has a full activity timeline that combines chase log entries, communications, PO status changes, and commission updates in chronological order. Open a case and scroll down to see the complete history of everything that's happened — who was contacted, what was said, what was promised, and when.",
    tags: ["timeline", "history", "activity", "case log", "audit trail"],
  },

  // ─── COMMISSIONS ────────────────────────────────────────────

  {
    id: "cm-001",
    category: "commissions",
    question: "How does commission tracking work?",
    answer: "When a case is marked completed and has a case value, MedRepDesk automatically creates a commission record using the default commission rate set for that distributor. It calculates your expected amount. You then track when it arrives, how much actually landed, and flag anything that's off.",
    tags: ["commission", "tracking", "auto", "calculate", "expected"],
  },
  {
    id: "cm-002",
    category: "commissions",
    question: "How do I set my commission rate?",
    answer: "Commission rates are set per distributor. Go to More → Distributors → edit the distributor → set Default Commission Type (percentage or flat dollar) and the rate. This applies to all cases for that distributor automatically. You can override the rate on individual cases if a specific deal is different.",
    tags: ["commission rate", "set rate", "percentage", "flat rate", "distributor rate"],
  },
  {
    id: "cm-003",
    category: "commissions",
    question: "Can I have different commission rates for different procedure types?",
    answer: "Currently commission rates are set at the distributor level with a per-case override option. If you have different rates for different product lines or procedures, use the per-case override to set the correct rate when creating or editing a case.",
    tags: ["commission rate", "procedure type", "product line", "different rates", "override"],
  },
  {
    id: "cm-004",
    category: "commissions",
    question: "What does 'expected vs. received' mean?",
    answer: "Expected is what you calculated you should earn based on the case value and commission rate. Received is what the distributor actually paid you. MedRepDesk tracks both so you can immediately see if there's a discrepancy — and flag or dispute it.",
    tags: ["expected", "received", "discrepancy", "difference", "underpaid"],
  },
  {
    id: "cm-005",
    category: "commissions",
    question: "How do I record when a commission is paid?",
    answer: "Open the commission record → tap 'Mark Received' → enter the amount received and the date. The commission status updates to 'received.' If the amount differs from expected, MedRepDesk will flag the discrepancy.",
    tags: ["mark paid", "received", "record payment", "commission paid"],
  },
  {
    id: "cm-006",
    category: "commissions",
    question: "What is AI commission discrepancy detection?",
    answer: "Available on AI Pro and Distributorship plans. AI monitors your commission history across all distributors and flags patterns — if a distributor consistently pays 10-15% less than your agreed rate, or if certain procedure types always come in short. It surfaces the data so you can address it with your distributor before it becomes a multi-month loss.",
    tags: ["AI", "discrepancy", "underpaid", "short paid", "pattern", "AI Pro"],
  },
  {
    id: "cm-007",
    category: "commissions",
    question: "Can I dispute a commission?",
    answer: "Yes. Open the commission record → set status to 'Disputed' → add a note explaining the discrepancy. Disputed commissions surface separately in your Money tab so you can track what's being resolved. You can also mark commissions as 'Written Off' if you've decided not to pursue them.",
    tags: ["dispute", "disputed", "wrong amount", "write off", "challenge"],
  },
  {
    id: "cm-008",
    category: "commissions",
    question: "How do I see all my commissions in one view?",
    answer: "The Money tab shows both POs and commissions. Tap the Commissions filter to see all commission records — sortable by status, distributor, date, or expected amount. Overdue commissions (past expected date with nothing received) are highlighted.",
    tags: ["all commissions", "money tab", "overview", "commission list", "filter"],
  },
  {
    id: "cm-009",
    category: "commissions",
    question: "What commission statuses are there?",
    answer: "Pending (calculated but not yet confirmed), Confirmed (PO has been paid so commission should follow), Received (you've logged the payment), Disputed (amount is being challenged), Written Off (you've decided not to pursue it).",
    tags: ["commission status", "pending", "confirmed", "received", "disputed", "written off"],
  },

  // ─── COMMUNICATIONS ──────────────────────────────────────────

  {
    id: "cc-001",
    category: "communications",
    question: "What's the difference between the Chase Log and Communications?",
    answer: "The Chase Log is specifically for PO-chasing activity — calls and emails specifically about getting a PO issued. Communications is the broader log for all other case-related contact — confirming instruments, discussing surgeon preferences, coordinating with the OR, general relationship maintenance. Both are linked to cases.",
    tags: ["chase log", "communications", "difference", "log", "contact"],
  },
  {
    id: "cc-002",
    category: "communications",
    question: "How do I log a phone call?",
    answer: "Tap + FAB → Log Communication, or open a case → Communications tab → Add. Select 'Call' as the type, enter the contact name and role, direction (inbound or outbound), what was discussed, the outcome, and set a follow-up date if needed. Everything timestamps automatically.",
    tags: ["log call", "phone call", "record call", "communication"],
  },
  {
    id: "cc-003",
    category: "communications",
    question: "How do I build my contact database?",
    answer: "Contacts are added when you log communications (you can save a contact inline), via the Contacts tab directly, or via CSV import. Each contact is linked to a facility or distributor. Store their name, role, phone, email, and notes. The app tracks the last time you contacted each person automatically.",
    tags: ["contacts", "build database", "add contact", "network", "relationship"],
  },
  {
    id: "cc-004",
    category: "communications",
    question: "Can I search my contacts?",
    answer: "Yes. The Contacts tab has a search bar that searches by name, role, facility, and phone number. You can also filter by facility or distributor to see all your contacts at a specific location.",
    tags: ["search contacts", "find contact", "filter contacts"],
  },
  {
    id: "cc-005",
    category: "communications",
    question: "What is 'last contacted' tracking?",
    answer: "Every time you log a communication linked to a contact, their last contacted date updates automatically. In your contact list, you can sort by last contacted to see which relationships are going cold — useful for proactive check-ins between cases.",
    tags: ["last contacted", "relationship", "cold contacts", "check in", "frequency"],
  },
  {
    id: "cc-006",
    category: "communications",
    question: "How do follow-up dates work on communications?",
    answer: "When logging any communication, you can set a follow-up date — 'Call back Thursday,' 'Check in next week.' MedRepDesk tracks every open follow-up and sends you a push notification on the due date. Open follow-ups also appear in your weekly digest.",
    tags: ["follow up", "reminder", "call back", "due date", "notification"],
  },

  // ─── NOTIFICATIONS ────────────────────────────────────────────

  {
    id: "nt-001",
    category: "notifications",
    question: "What kinds of notifications does MedRepDesk send?",
    answer: "Case Tomorrow (evening alert for next-day cases), Follow-Up Due (when a scheduled follow-up arrives), Promised Date Passed (morning alert when a promised PO date passes without delivery), Escalation Recommended (when a case hits your chase threshold), PO Overdue (expected payment date passed), Commission Overdue (expected commission date passed), Referral Signup (someone used your referral link), Payout Sent (referral commission paid to you).",
    tags: ["notifications", "alerts", "types", "push", "what notifications"],
  },
  {
    id: "nt-002",
    category: "notifications",
    question: "How do I turn notifications on or off?",
    answer: "Go to More → Notification Settings. Each notification type can be toggled on or off individually. You can also choose delivery method per type — push only, email only, or both. This lets you get urgent alerts (like promised date passed) on push AND email, while keeping less urgent ones (like referral signup) as push only.",
    tags: ["turn off", "disable", "notification settings", "toggle", "customize"],
  },
  {
    id: "nt-003",
    category: "notifications",
    question: "How do I allow push notifications on iPhone?",
    answer: "When prompted during onboarding or when first using the app, tap 'Allow' on the system permission dialog. If you accidentally denied it, go to iPhone Settings → MedRepDesk (or your browser/Safari) → Notifications → Allow. You must have MedRepDesk installed to your home screen for push notifications to work on iOS.",
    tags: ["iPhone", "iOS", "push permission", "allow notifications", "Safari"],
  },
  {
    id: "nt-004",
    category: "notifications",
    question: "What is the weekly digest?",
    answer: "A weekly summary delivered every Monday morning (or your chosen day) covering: cases scheduled this week, open POs with their age, follow-ups due, overdue commissions, and any escalation flags. On Solo it's a clean plain-text list. On AI Pro and Distributorship it's a full AI-written briefing that explains what's urgent and what to prioritize.",
    tags: ["digest", "weekly", "summary", "Monday", "briefing"],
  },
  {
    id: "nt-005",
    category: "notifications",
    question: "Can I change which day I get the weekly digest?",
    answer: "Yes. Go to More → Notification Settings → Digest. You can choose which days of the week to receive it and what time. The digest checks your account's timezone so the delivery time is always local to you.",
    tags: ["digest day", "digest time", "change day", "schedule digest"],
  },
  {
    id: "nt-006",
    category: "notifications",
    question: "What is the AI weekly briefing?",
    answer: "Available on AI Pro and Distributorship. Instead of a plain list, AI writes a real briefing in plain English — 'You have 4 cases this week. Valley ASC's PO for case MRD-8X2K-0042 is 18 days overdue and you've made 4 chase attempts — this warrants escalation. Two commissions totaling $3,400 are past their expected payment date.' Tells you what matters and why.",
    tags: ["AI briefing", "AI digest", "intelligent summary", "AI Pro", "weekly AI"],
  },
  {
    id: "nt-007",
    category: "notifications",
    question: "Can I set my escalation threshold?",
    answer: "Yes. Go to More → Account Settings → Escalation Threshold. Default is 3 chase attempts. Set it to whatever makes sense for your territory — some reps escalate after 2 attempts, others after 5. The threshold applies to the escalation alert notification.",
    tags: ["escalation threshold", "set escalation", "configure", "3 attempts"],
  },

  // ─── AI FEATURES ─────────────────────────────────────────────

  {
    id: "ai-001",
    category: "ai",
    question: "What AI features does MedRepDesk have?",
    answer: "PO Photo Extraction (all plans, unlimited) — AI reads a photographed PO and auto-fills fields. AI Smart Case Entry (all plans, metered) — describe a case in plain language. AI Chase Email Drafting (AI Pro+) — one-tap professional follow-up email. AI Commission Discrepancy Detection (AI Pro+) — monitors for underpayment patterns. AI Weekly Briefing (AI Pro+) — written narrative digest.",
    tags: ["AI", "features", "list", "what AI", "overview"],
  },
  {
    id: "ai-002",
    category: "ai",
    question: "What counts as an AI extraction?",
    answer: "AI Smart Case Entry uses your monthly extraction count — 50 on Solo, 100 on AI Pro, 500 on Distributorship. PO Photo Extraction does NOT count against your limit — it's unlimited on all plans. The count resets on the 1st of each month.",
    tags: ["extraction", "limit", "count", "monthly", "reset", "PO photo", "smart case"],
  },
  {
    id: "ai-003",
    category: "ai",
    question: "What happens if I hit my AI extraction limit?",
    answer: "You'll see a warning in the app as you approach your limit. Once you hit it, AI Smart Case Entry is disabled for the rest of the month — you can still create cases manually. PO photo extraction is never limited. You can upgrade your plan to get a higher limit.",
    tags: ["hit limit", "extraction limit", "exceeded", "upgrade", "disabled"],
  },
  {
    id: "ai-004",
    category: "ai",
    question: "Is the AI secure? Does it see patient data?",
    answer: "MedRepDesk never stores patient names, dates of birth, or identifying information — so the AI never sees it either. AI processes case descriptions, invoice numbers, amounts, and procedure types only. All AI calls run server-side through Supabase Edge Functions — your data never goes directly to a third-party AI from your device.",
    tags: ["AI security", "patient data", "HIPAA", "privacy", "secure"],
  },
  {
    id: "ai-005",
    category: "ai",
    question: "Which AI model powers MedRepDesk?",
    answer: "MedRepDesk uses Claude by Anthropic (claude-sonnet) for all AI features — case entry parsing, commission analysis, email drafting, and weekly briefings. The full voice agent uses OpenAI Realtime API for the voice layer with Claude handling intent and field parsing.",
    tags: ["Claude", "Anthropic", "OpenAI", "model", "which AI", "GPT"],
  },

  // ─── VOICE ────────────────────────────────────────────────────

  {
    id: "vc-001",
    category: "voice",
    question: "What voice features are available on Solo?",
    answer: "Voice Input (command mode) — tap the mic and speak to log entries. The app uses your browser's built-in speech recognition to transcribe, then AI parses your words into the right fields. Text-to-speech readback uses your browser's built-in TTS — basic but functional. No internet voice minutes are consumed.",
    tags: ["Solo voice", "browser TTS", "voice input", "command mode", "free voice"],
  },
  {
    id: "vc-002",
    category: "voice",
    question: "What is the full voice agent on AI Pro?",
    answer: "Two-way conversational voice powered by OpenAI Realtime API. You speak, the app speaks back with a natural AI voice. You can ask questions ('What cases do I have this week?'), give commands ('Log a follow-up call on my Valley ASC case'), and have a back-and-forth conversation. 60 voice minutes per month included, $0.10/min after that.",
    tags: ["voice agent", "AI Pro", "conversational", "two-way", "OpenAI", "Realtime"],
  },
  {
    id: "vc-003",
    category: "voice",
    question: "How do I start a voice session?",
    answer: "Tap the microphone button in the app (always visible on the main screens). On Solo, the mic captures your voice and transcribes it. On AI Pro and Distributorship, it initiates a full voice agent session — you'll hear a tone and the agent is live.",
    tags: ["start voice", "microphone", "mic button", "how to use voice"],
  },
  {
    id: "vc-004",
    category: "voice",
    question: "How many voice minutes do I get?",
    answer: "Solo: browser TTS only, no cloud voice minutes consumed. AI Pro: 60 minutes per month included. Distributorship: 200 minutes per month included. Overage on both paid plans is $0.10/minute. Your current usage is visible in More → Account → Voice Usage.",
    tags: ["voice minutes", "60 minutes", "200 minutes", "overage", "how much"],
  },
  {
    id: "vc-005",
    category: "voice",
    question: "What can I say to the voice agent?",
    answer: "Log a new case, add a chase entry, record a communication, check upcoming cases, ask about overdue POs, ask about commission status, set a follow-up, and more. The agent understands natural language — you don't have to use specific commands. Say it how you'd say it to a person.",
    tags: ["voice commands", "what to say", "examples", "natural language", "agent"],
  },
  {
    id: "vc-006",
    category: "voice",
    question: "Does voice work in noisy environments like hospital hallways?",
    answer: "The voice input uses your device's native microphone. In noisy environments, move closer to your phone or use earbuds with a mic. The AI is designed to parse imperfect or incomplete speech — it fills in context from your existing case data. It won't log the wrong case just because background noise cut off part of the case number.",
    tags: ["noisy", "hospital", "background noise", "accuracy", "earbuds"],
  },

  // ─── TEAM ─────────────────────────────────────────────────────

  {
    id: "tm-001",
    category: "team",
    question: "Can I add an assistant to my account?",
    answer: "Yes, on AI Pro and Distributorship plans. Go to More → Team → Invite User → enter their email and assign the 'Assistant' role. They'll receive an invite email, create their login, and have access to cases, POs, chase log, and communications. They cannot access billing, referrals, commission financials, or account settings.",
    tags: ["assistant", "add user", "invite", "second user", "team"],
  },
  {
    id: "tm-002",
    category: "team",
    question: "What can an assistant do?",
    answer: "An assistant can create and edit cases, log POs, add chase log entries, log communications, view and add contacts, and see the full case and PO list. They cannot view commission details, access billing or subscription settings, see referral earnings, or delete records. Role restrictions are enforced at the database level.",
    tags: ["assistant permissions", "what assistant can do", "role", "access", "restrictions"],
  },
  {
    id: "tm-003",
    category: "team",
    question: "Can I remove an assistant?",
    answer: "Yes. Go to More → Team → tap the user → Remove User. Their access is revoked immediately. Any cases or entries they created remain in your account.",
    tags: ["remove assistant", "revoke access", "remove user", "delete user"],
  },
  {
    id: "tm-004",
    category: "team",
    question: "How does cross-rep visibility work on Distributorship?",
    answer: "As a Distributorship account owner, you see all cases, POs, and commissions across all users on your account in a unified dashboard. You can filter by rep, status, date range, or distributor. Each rep still only sees their own data in their personal view — the cross-rep view is an owner-only layer.",
    tags: ["cross-rep", "all reps", "distributorship", "owner view", "visibility"],
  },
  {
    id: "tm-005",
    category: "team",
    question: "What is 'My Manufacturers' on Distributorship?",
    answer: "Distributors have agreements with multiple manufacturers to sell their product lines. My Manufacturers lets you store each manufacturer relationship — contact info, product lines you carry, your margin on each line, and the commission rates you pay your reps for each product. It's the financial operations layer for running a distributorship.",
    tags: ["My Manufacturers", "manufacturer", "distributorship", "margins", "product lines"],
  },

  // ─── BILLING ──────────────────────────────────────────────────

  {
    id: "bl-001",
    category: "billing",
    question: "What are the plan options and prices?",
    answer: "Solo — $129/month (1 user, full core workflow, 50 AI smart case entries/mo). AI Pro — $199/month (2 users, 100 AI entries, full voice agent, full theming, AI email drafting, AI commission detection, AI weekly briefing). Distributorship — $299/month (5 users, 500 AI entries, 200 voice min, cross-rep visibility, My Manufacturers).",
    tags: ["plans", "pricing", "cost", "how much", "$129", "$199", "$299"],
  },
  {
    id: "bl-002",
    category: "billing",
    question: "Can I change my plan?",
    answer: "Yes. Upgrade or downgrade at any time from More → Billing → Manage Subscription. Changes take effect at the next billing cycle. Upgrading gives you immediate access to new features. No long-term contracts.",
    tags: ["change plan", "upgrade", "downgrade", "switch plan", "billing cycle"],
  },
  {
    id: "bl-003",
    category: "billing",
    question: "How do I cancel?",
    answer: "Go to More → Billing → Manage Subscription → Cancel Plan. Your access continues until the end of your current billing period. Your data is retained for 90 days after cancellation in case you want to reactivate.",
    tags: ["cancel", "cancellation", "stop", "end subscription"],
  },
  {
    id: "bl-004",
    category: "billing",
    question: "What payment methods are accepted?",
    answer: "All major credit and debit cards via Stripe — Visa, Mastercard, American Express, Discover. Apple Pay and Google Pay are supported on compatible devices.",
    tags: ["payment", "credit card", "Apple Pay", "Google Pay", "Stripe"],
  },
  {
    id: "bl-005",
    category: "billing",
    question: "Is there a discount for annual billing?",
    answer: "Annual billing options are coming soon. If you're interested, contact us — we're offering early annual pricing to beta users.",
    tags: ["annual", "discount", "yearly", "save money"],
  },
  {
    id: "bl-006",
    category: "billing",
    question: "What happens if my payment fails?",
    answer: "Stripe retries failed payments automatically. You'll receive an email notification and a banner in the app. You have a grace period before access is restricted. Update your payment method in More → Billing → Manage Subscription.",
    tags: ["payment failed", "declined", "billing issue", "update payment"],
  },
  {
    id: "bl-007",
    category: "billing",
    question: "Do unused AI extractions roll over?",
    answer: "No. AI smart case entry extractions reset to zero on the 1st of each month. They don't roll over. Plan accordingly — if you consistently hit your limit, upgrading to AI Pro gives you double the monthly allowance.",
    tags: ["rollover", "unused", "reset", "monthly reset", "extractions"],
  },

  // ─── REFERRALS ────────────────────────────────────────────────

  {
    id: "rf-001",
    category: "referrals",
    question: "How does the referral program work?",
    answer: "Every MedRepDesk account has a unique referral code and link. Share it with other reps. When they sign up and start paying, you earn 25% of their monthly subscription for 12 months — automatically deposited to your bank account via Stripe on the 1st of each month.",
    tags: ["referral", "how it works", "earn", "25%", "refer a rep"],
  },
  {
    id: "rf-002",
    category: "referrals",
    question: "How much can I earn from referrals?",
    answer: "25% of the referred rep's monthly plan for 12 months. Solo referral: $32.25/month × 12 = $387. AI Pro referral: $49.75/month × 12 = $597. Distributorship referral: $74.75/month × 12 = $897. No cap on number of referrals. Refer 4 Solo reps and your own subscription is essentially free.",
    tags: ["referral earnings", "how much", "25%", "monthly", "calculate"],
  },
  {
    id: "rf-003",
    category: "referrals",
    question: "Where is my referral link?",
    answer: "Go to More → Referrals. Your unique link is shown there — tap to copy or share directly. The format is medrepdesk.io/join?ref=YOURCODE. You can see how many reps have used it, active referrals, and your total earnings.",
    tags: ["referral link", "find link", "referral code", "share", "copy link"],
  },
  {
    id: "rf-004",
    category: "referrals",
    question: "How do referral payouts work?",
    answer: "Payouts are processed on the 1st of each month via Stripe Connect. You'll receive a direct deposit to the bank account linked to your Stripe profile. Stripe Connect onboarding is triggered the first time you earn a referral — takes about 5 minutes to set up.",
    tags: ["payout", "payment", "Stripe", "direct deposit", "bank account", "1st of month"],
  },
  {
    id: "rf-005",
    category: "referrals",
    question: "How long do I earn from a referral?",
    answer: "12 months from the date the referred rep starts paying. After 12 months the referral expires and earnings stop for that rep. There's no limit on how many reps you can refer — each one starts a fresh 12-month earning window.",
    tags: ["12 months", "how long", "duration", "expire", "referral period"],
  },
  {
    id: "rf-006",
    category: "referrals",
    question: "What if a referred rep cancels?",
    answer: "If a referred rep cancels their subscription, earnings from that referral stop at their last payment. You'll still receive the commission for any months they paid. Referrals that cancel early just stop generating payments — you keep everything earned up to that point.",
    tags: ["referral cancels", "cancelled rep", "stop earning", "refund"],
  },

  // ─── ACCOUNT & SETTINGS ───────────────────────────────────────

  {
    id: "ac-001",
    category: "account",
    question: "How do I change my timezone?",
    answer: "Go to More → Account Settings → Timezone. Choosing the correct timezone ensures your case tomorrow alerts, morning checks, and digest delivery are all based on your local time.",
    tags: ["timezone", "time zone", "settings", "local time"],
  },
  {
    id: "ac-002",
    category: "account",
    question: "Can I use Google to sign in?",
    answer: "Yes. MedRepDesk supports Google OAuth — tap 'Sign in with Google' on the login screen. Your Google account email is linked to your MedRepDesk account. You can sign in with Google on any device without a password.",
    tags: ["Google", "OAuth", "sign in with Google", "SSO", "Google login"],
  },
  {
    id: "ac-003",
    category: "account",
    question: "How do I reset my password?",
    answer: "On the sign-in screen, tap 'Forgot Password' and enter your email. You'll receive a reset link. If you signed up with Google, you don't have a separate MedRepDesk password — use 'Sign in with Google.'",
    tags: ["password", "reset", "forgot password", "change password"],
  },
  {
    id: "ac-004",
    category: "account",
    question: "Can I delete my account?",
    answer: "Yes. Go to More → Account Settings → Delete Account. This permanently deletes your account and all associated data after a 30-day grace period. This action cannot be undone. Export your data before deleting if you need a record.",
    tags: ["delete account", "close account", "remove account", "permanent"],
  },
  {
    id: "ac-005",
    category: "account",
    question: "How do I export my data?",
    answer: "Go to More → Account Settings → Export Data. You can export your cases, POs, commissions, contacts, and chase log as a CSV file. Useful before cancellation or for your own records.",
    tags: ["export", "download data", "CSV export", "backup", "data export"],
  },

  // ─── SECURITY & PRIVACY ───────────────────────────────────────

  {
    id: "sc-001",
    category: "security",
    question: "Is MedRepDesk HIPAA compliant?",
    answer: "MedRepDesk is intentionally designed to not be a covered entity under HIPAA. We store invoice numbers, procedure types, case values, and scheduling info — never patient names, dates of birth, insurance information, or any Protected Health Information (PHI). You should not enter patient names anywhere in MedRepDesk.",
    tags: ["HIPAA", "compliant", "patient data", "PHI", "covered entity"],
  },
  {
    id: "sc-002",
    category: "security",
    question: "Is my data secure?",
    answer: "Yes. MedRepDesk uses Supabase (PostgreSQL) with Row Level Security — every query is scoped to your account at the database level, not just the application layer. Your data is never accessible by other accounts. We use Supabase's enterprise-grade infrastructure hosted on AWS with SOC 2 compliance.",
    tags: ["security", "data security", "RLS", "Supabase", "AWS", "secure"],
  },
  {
    id: "sc-003",
    category: "security",
    question: "Can other reps see my data?",
    answer: "No. Row Level Security enforces account isolation at the database level. Even if there were an application bug, the database would reject any query that crosses account boundaries. Your cases, POs, contacts, and commissions are only accessible to users on your account.",
    tags: ["data isolation", "other reps", "privacy", "my data", "account isolation"],
  },
  {
    id: "sc-004",
    category: "security",
    question: "Where is my data stored?",
    answer: "On Supabase's hosted PostgreSQL infrastructure, backed by AWS. Files and PO photos are stored in Supabase Storage. All data is encrypted at rest and in transit. Signed URLs with 1-hour expiry are used for file access — no permanent public file URLs.",
    tags: ["data storage", "where stored", "AWS", "encrypted", "cloud"],
  },
  {
    id: "sc-005",
    category: "security",
    question: "Do you sell my data?",
    answer: "No. Never. MedRepDesk does not sell, share, or monetize your data in any way. Your case data, contact list, and commission records are yours. See our Privacy Policy for the full details.",
    tags: ["sell data", "data sharing", "privacy policy", "data monetization"],
  },

  // ─── TECHNICAL & APP ──────────────────────────────────────────

  {
    id: "tc-001",
    category: "technical",
    question: "Does MedRepDesk work offline?",
    answer: "Yes. Core features work offline — you can view cases, contacts, and recent data without a connection. Actions taken offline (logging a communication, adding a chase entry) are queued and synced automatically when you reconnect. A sync indicator in the app shows when data is pending sync.",
    tags: ["offline", "no internet", "offline mode", "sync", "airplane mode"],
  },
  {
    id: "tc-002",
    category: "technical",
    question: "How do I install MedRepDesk on my iPhone?",
    answer: "Open medrepdesk.io in Safari on your iPhone. Tap the Share button (box with arrow pointing up) → tap 'Add to Home Screen' → tap 'Add.' MedRepDesk will appear on your home screen like a native app. You must use Safari — Chrome on iOS does not support PWA installation.",
    tags: ["iPhone install", "iOS", "home screen", "Safari", "Add to Home Screen", "PWA"],
  },
  {
    id: "tc-003",
    category: "technical",
    question: "How do I install MedRepDesk on Android?",
    answer: "Open medrepdesk.io in Chrome on Android. Chrome will show an 'Install App' banner at the bottom — tap Install. Or tap the three-dot menu → 'Add to Home Screen.' The app installs to your home screen and works like a native app.",
    tags: ["Android install", "Chrome", "home screen", "install", "PWA", "Android"],
  },
  {
    id: "tc-004",
    category: "technical",
    question: "How do I get updates?",
    answer: "MedRepDesk updates automatically in the background — no app store approval required. When a new version is available, you'll see a banner prompting you to refresh. Tap it and you're on the latest version instantly.",
    tags: ["updates", "new version", "upgrade app", "latest"],
  },
  {
    id: "tc-005",
    category: "technical",
    question: "What browsers are supported?",
    answer: "Safari on iOS (required for PWA installation on iPhone), Chrome on Android, Chrome and Edge on desktop. Firefox is supported for general use but PWA installation is limited. For the best mobile experience, use Safari (iOS) or Chrome (Android).",
    tags: ["browser", "Safari", "Chrome", "Firefox", "supported browsers"],
  },
  {
    id: "tc-006",
    category: "technical",
    question: "I'm having trouble with push notifications on iOS. What do I do?",
    answer: "Push notifications on iOS require MedRepDesk to be installed to your home screen via Safari. If you're running it in a browser tab, push won't work. After installing, go to iPhone Settings → Notifications → MedRepDesk and ensure notifications are allowed. iOS 16.4+ is required for PWA push notifications.",
    tags: ["push notifications iOS", "iPhone push", "not receiving notifications", "iOS 16", "troubleshoot"],
  },
  {
    id: "tc-007",
    category: "technical",
    question: "My data isn't syncing. What should I do?",
    answer: "Check your internet connection first. If you're online and still seeing stale data, try a hard refresh (pull down on the app screen). If the issue persists, go to More → Settings → Sync Data to force a full sync. Contact support if the problem continues.",
    tags: ["sync", "not syncing", "stale data", "refresh", "troubleshoot"],
  },

  // ─── THEMING ─────────────────────────────────────────────────

  {
    id: "th-001",
    category: "theming",
    question: "How do I change the app's appearance?",
    answer: "Go to More → Appearance. All plans get a solid color background picker and light/dark/system mode toggle. AI Pro and Distributorship unlock background images, gradients, card opacity, header opacity, and accent color customization.",
    tags: ["appearance", "theme", "change look", "customize", "colors"],
  },
  {
    id: "th-002",
    category: "theming",
    question: "Can I use my own photo as the background?",
    answer: "Yes, on AI Pro and Distributorship plans. Go to More → Appearance → Background → Upload Image. You can upload your own photo or choose from preloaded iOS-style presets. An overlay dimness slider lets you make the background subtle so it doesn't interfere with readability.",
    tags: ["background image", "custom photo", "upload photo", "wallpaper", "AI Pro"],
  },
  {
    id: "th-003",
    category: "theming",
    question: "What is card opacity?",
    answer: "On AI Pro and Distributorship, you can make the white cards in the app translucent — sliding the opacity down lets the background image or color show through the cards. Combined with a dark background image, this creates a beautiful layered look. The header and nav bar opacity can be adjusted separately or linked to match the cards.",
    tags: ["card opacity", "transparent", "translucent", "glass", "opacity slider"],
  },
  {
    id: "th-004",
    category: "theming",
    question: "Can a distributorship owner force a theme on all reps?",
    answer: "Yes. On Distributorship plans, go to More → Appearance → Lock Theme for Team. Set your desired theme and enable the lock. All users on your account will see your chosen theme and cannot override it. Useful for distributor branding or a consistent team appearance.",
    tags: ["theme lock", "brand", "force theme", "distributorship", "team theme"],
  },
  {
    id: "th-005",
    category: "theming",
    question: "Does theming sync across devices?",
    answer: "Yes. Your theme preferences are stored in your user profile and sync across any device you sign into. If you set a dark background with custom card opacity on your iPhone, it'll look the same when you open MedRepDesk on another device.",
    tags: ["sync theme", "multiple devices", "theme settings", "cross device"],
  },

];

// ─── Search helper ────────────────────────────────────────────
// Usage: searchFAQs("push notifications iPhone")
// Returns array of FAQs sorted by relevance score

export function searchFAQs(query, categoryFilter = null) {
  if (!query || query.trim().length < 2) {
    return categoryFilter
      ? FAQS.filter(f => f.category === categoryFilter)
      : FAQS;
  }

  const terms = query.toLowerCase().trim().split(/\s+/);

  const scored = FAQS
    .filter(f => !categoryFilter || f.category === categoryFilter)
    .map(faq => {
      let score = 0;
      const qLower = faq.question.toLowerCase();
      const aLower = faq.answer.toLowerCase();
      const tagsStr = faq.tags.join(" ").toLowerCase();

      for (const term of terms) {
        if (qLower.includes(term)) score += 10;
        if (tagsStr.includes(term)) score += 6;
        if (aLower.includes(term)) score += 3;
      }

      // Bonus for exact phrase match in question
      if (qLower.includes(query.toLowerCase())) score += 15;

      return { ...faq, score };
    })
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored;
}

export default FAQS;
