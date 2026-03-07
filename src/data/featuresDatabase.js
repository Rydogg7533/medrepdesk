// MedRepDesk — Sales Page Features Database
// src/data/featuresDatabase.js
//
// Purpose: Searchable features database for the public marketing/sales page.
// Framed as prospect questions — "Does it do X?" language.
// Separate from in-app FAQ which covers account/billing/technical support.

export const FEATURE_CATEGORIES = [
  { id: "all", label: "All Features", icon: "✦" },
  { id: "cases", label: "Case Management", icon: "📋" },
  { id: "po-chase", label: "PO Chase", icon: "🎯" },
  { id: "commissions", label: "Commissions", icon: "💰" },
  { id: "contacts", label: "Contacts & Comms", icon: "📞" },
  { id: "notifications", label: "Alerts & Digest", icon: "🔔" },
  { id: "ai", label: "AI Features", icon: "🤖" },
  { id: "voice", label: "Voice", icon: "🎙️" },
  { id: "team", label: "Team", icon: "👥" },
  { id: "mobile", label: "Mobile & Offline", icon: "📱" },
  { id: "security", label: "Security", icon: "🔒" },
  { id: "referrals", label: "Referrals", icon: "🔗" },
];

// plan: "all" | "pro" | "dist"
// plan_label shown on badge
export const FEATURES_DB = [

  // ─── CASE MANAGEMENT ──────────────────────────────────────

  {
    id: "f-001",
    category: "cases",
    plan: "all",
    headline: "Track every case from scheduled to paid",
    description: "Every surgical case moves through a defined status pipeline — scheduled, confirmed, completed, bill sheet submitted, PO requested, PO received, paid. Status advances automatically as you log activity. At a glance you always know exactly where every case stands in the money cycle.",
    tags: ["case tracking", "pipeline", "status", "workflow", "case management", "scheduled", "completed", "paid"],
  },
  {
    id: "f-002",
    category: "cases",
    plan: "all",
    headline: "Unique case numbers for every surgery",
    description: "Every case gets a globally unique MRD number (e.g. MRD-8X2K-2026-0042) tied to your account. Reference it with distributors, facilities, and surgeons without ever exposing patient info. Makes tracking across email chains and phone calls effortless.",
    tags: ["case number", "MRD", "reference number", "unique", "invoice reference", "patient privacy"],
  },
  {
    id: "f-003",
    category: "cases",
    plan: "all",
    headline: "Log cases by typing, voice, or natural language",
    description: "Create a case by filling out the form, speaking it aloud, or typing it in plain language — 'Hip replacement with Dr. Martinez at Valley ASC next Tuesday at 7am.' AI parses your description into a complete structured record. Saves 2-3 minutes of data entry per case.",
    tags: ["add case", "create case", "voice entry", "natural language", "quick entry", "AI entry", "dictate"],
  },
  {
    id: "f-004",
    category: "cases",
    plan: "all",
    headline: "Surgeon database — searchable, reusable",
    description: "Build a private database of every surgeon you work with — name, specialty, primary facility, phone, and email. Reuse them across every case with a tap. No re-typing names every time. Auto-suggested when you start typing during case entry.",
    tags: ["surgeon", "doctor", "database", "searchable", "reuse", "surgeon list", "find surgeon"],
  },
  {
    id: "f-005",
    category: "cases",
    plan: "all",
    headline: "Facility database — hospitals and ASCs",
    description: "Every hospital and ASC you work with stored and searchable. Includes facility type, address, phone, and billing contact info. New cases auto-suggest the right facility based on your history. Global suggestions help you onboard faster — confirm the ones you already know.",
    tags: ["facility", "hospital", "ASC", "ambulatory surgery center", "database", "searchable", "find facility"],
  },
  {
    id: "f-006",
    category: "cases",
    plan: "all",
    headline: "Distributor management with billing defaults",
    description: "Store every distributor you sell for — billing email, CC recipients, billing contact name and phone, and default commission rate. These defaults flow automatically into every case and commission calculation. Set it once, never re-enter it.",
    tags: ["distributor", "billing email", "billing contact", "commission default", "manufacturer", "company"],
  },
  {
    id: "f-007",
    category: "cases",
    plan: "all",
    headline: "Search and filter your entire case list",
    description: "Search by surgeon name, facility, case number, or procedure type. Filter by status, date range, or distributor. Sort by scheduled date, case value, or last updated. Find any case instantly even with hundreds in your history.",
    tags: ["search cases", "filter", "find case", "sort", "filter by status", "filter by date"],
  },
  {
    id: "f-008",
    category: "cases",
    plan: "all",
    headline: "Full case activity timeline",
    description: "Every case has a complete chronological timeline combining chase log entries, communications, PO status changes, and commission updates. Open any case and see the full history — who was contacted, what was said, what was promised, and every status change.",
    tags: ["timeline", "history", "activity log", "case history", "audit trail", "what happened"],
  },
  {
    id: "f-009",
    category: "cases",
    plan: "all",
    headline: "Bill sheet submission tracking",
    description: "Log when you've submitted your bill sheet to your distributor after surgery. This advances the case status and starts the PO clock. You'll always know which cases are pending bill sheet and which are in the PO chase phase.",
    tags: ["bill sheet", "bill of materials", "submit", "post-op", "after surgery"],
  },
  {
    id: "f-010",
    category: "cases",
    plan: "all",
    headline: "Case value and procedure type tracking",
    description: "Log the case value and procedure type (hip, knee, shoulder, spine, trauma) on every case. Case value flows directly into commission calculations. Procedure type helps you filter and analyze your book over time.",
    tags: ["case value", "procedure type", "hip", "knee", "shoulder", "spine", "trauma", "implant value"],
  },

  // ─── PO CHASE ──────────────────────────────────────────────

  {
    id: "f-011",
    category: "po-chase",
    plan: "all",
    headline: "Dedicated PO chase log for every case",
    description: "Log every call, email, text, in-person visit, and voicemail in a dedicated chase log tied to each case. Capture the contact name, role, outcome, and what was promised. Full timestamped timeline of every PO chase touchpoint — so you always know exactly what happened.",
    tags: ["chase log", "PO chase", "track calls", "follow up log", "chase PO", "billing contact", "log call"],
  },
  {
    id: "f-012",
    category: "po-chase",
    plan: "all",
    headline: "Promised date tracking with automatic alerts",
    description: "When billing says 'the PO will be sent by Thursday,' log it as a promised date. MedRepDesk sends you a push notification the morning after if the PO hasn't arrived. Never forget a broken promise or let a missed date slip by.",
    tags: ["promised date", "promise", "they said", "follow up alert", "PO due", "billing promised"],
  },
  {
    id: "f-013",
    category: "po-chase",
    plan: "all",
    headline: "Escalation detection — automatic flagging",
    description: "Set your escalation threshold (default: 3 chase attempts). When a case hits that number with no PO received, MedRepDesk automatically flags it and notifies you. Never let a case go cold because you forgot to escalate after multiple failed attempts.",
    tags: ["escalation", "escalate", "no PO", "overdue", "multiple attempts", "flag", "threshold"],
  },
  {
    id: "f-014",
    category: "po-chase",
    plan: "all",
    headline: "Photograph a PO — AI auto-fills the form",
    description: "Photograph a physical PO or screenshot an emailed one. AI reads it and extracts the PO number, invoice amount, issue date, facility name, and payment terms — then pre-fills your form. Review, confirm, done. No manual transcription, no typos. Unlimited on all plans.",
    tags: ["PO photo", "photograph PO", "scan PO", "auto fill", "AI extraction", "OCR", "PO number", "invoice amount"],
  },
  {
    id: "f-015",
    category: "po-chase",
    plan: "all",
    headline: "Auto-forward PO to your distributor",
    description: "Once a PO is received, send it to your distributor's billing team in one tap. MedRepDesk pulls the billing email and CC recipients from your distributor settings, includes the invoice details and case reference, and sends a professional email automatically. No manual forwarding.",
    tags: ["forward PO", "send PO", "email distributor", "auto email", "submit PO", "distributor billing", "one tap"],
  },
  {
    id: "f-016",
    category: "po-chase",
    plan: "all",
    headline: "See all open POs sorted by age",
    description: "The Money tab surfaces every open PO sorted by how long it's been outstanding — oldest first. Filter by status, facility, or distributor. Instantly see what needs your attention today without hunting through individual cases.",
    tags: ["open POs", "outstanding POs", "aged POs", "money tab", "overview", "all POs"],
  },
  {
    id: "f-017",
    category: "po-chase",
    plan: "all",
    headline: "Follow-up scheduling on every chase entry",
    description: "Set a follow-up date on any chase entry. 'Call back Thursday.' 'Try again next week.' MedRepDesk tracks every open follow-up and notifies you when they're due. Nothing falls through the cracks during a busy surgery week.",
    tags: ["follow up", "schedule follow up", "reminder", "call back", "next contact"],
  },
  {
    id: "f-018",
    category: "po-chase",
    plan: "pro",
    headline: "AI-generated chase email in one tap",
    description: "On AI Pro and Distributorship plans, tap 'Draft Chase Email' on any case with an outstanding PO. AI writes a complete professional follow-up email — pre-populated with the case number, invoice number, amount owed, contact name and role, reference to previous attempts, and a clear ask. Edit if you want, send in seconds.",
    tags: ["AI email", "chase email", "draft email", "follow up email", "AI write email", "professional email", "one tap"],
  },
  {
    id: "f-019",
    category: "po-chase",
    plan: "all",
    headline: "PO payment tracking — expected vs. received",
    description: "Log the expected payment date when you receive a PO. Track when payment actually arrives. MedRepDesk flags overdue payments in your morning alerts and weekly digest so nothing slips through once the PO is in hand.",
    tags: ["payment date", "expected payment", "payment tracking", "PO payment", "overdue payment"],
  },

  // ─── COMMISSIONS ───────────────────────────────────────────

  {
    id: "f-020",
    category: "commissions",
    plan: "all",
    headline: "Commissions calculated automatically",
    description: "The moment a case is marked completed and has a case value, your expected commission is calculated using the rate set for that distributor — percentage or flat dollar amount. A commission record is created and linked to the case automatically. No spreadsheet, no manual math.",
    tags: ["commission", "automatic", "calculate commission", "expected commission", "auto calculate"],
  },
  {
    id: "f-021",
    category: "commissions",
    plan: "all",
    headline: "Track what you're owed vs. what landed",
    description: "Every commission has an expected amount and a received amount. Log when payment arrives and what actually came in. Discrepancies are flagged immediately. See every underpayment and overpayment across all distributors at a glance.",
    tags: ["expected vs received", "underpaid", "commission tracking", "what I'm owed", "commission discrepancy"],
  },
  {
    id: "f-022",
    category: "commissions",
    plan: "all",
    headline: "Set commission rates per distributor",
    description: "Set your default commission rate — percentage or flat dollar — for each distributor. Rates apply automatically to every case for that distributor. Override the rate on individual cases when a specific deal is different. One place to manage all your deal structures.",
    tags: ["commission rate", "set rate", "percentage", "flat rate", "per distributor", "deal structure"],
  },
  {
    id: "f-023",
    category: "commissions",
    plan: "all",
    headline: "Dispute or write off commissions",
    description: "Mark any commission as Disputed and add notes explaining the issue. Disputed commissions surface separately so you can track what's being resolved. Write off commissions you've decided not to pursue. Full audit trail of every status change.",
    tags: ["dispute", "disputed", "write off", "underpaid", "wrong amount", "challenge commission"],
  },
  {
    id: "f-024",
    category: "commissions",
    plan: "pro",
    headline: "AI detects when distributors are shorting you",
    description: "AI monitors your commission history across all distributors and flags patterns — when a distributor consistently pays less than your agreed rate, or when certain procedure types always come in short. Catches underpayments before they become a multi-month pattern, with the data to back it up.",
    tags: ["AI commission", "underpaid", "short paid", "discrepancy detection", "pattern", "distributor shorting", "AI Pro"],
  },
  {
    id: "f-025",
    category: "commissions",
    plan: "all",
    headline: "Commission status pipeline",
    description: "Every commission moves through: Pending (calculated, not yet confirmed) → Confirmed (PO paid, commission expected) → Received (payment logged) → or Disputed/Written Off. When a PO is paid, commissions auto-advance to Confirmed. Always know where every dollar stands.",
    tags: ["commission status", "pending", "confirmed", "received", "commission pipeline"],
  },

  // ─── CONTACTS & COMMUNICATIONS ─────────────────────────────

  {
    id: "f-026",
    category: "contacts",
    plan: "all",
    headline: "Log every call, email, and visit to the case",
    description: "Log calls, emails, texts, in-person visits, and voicemails directly to the case or PO they relate to. Capture contact name, role, what was discussed, the outcome, and follow-up needed. Every case has a complete communication history so you — or your assistant — always knows what's been said.",
    tags: ["log call", "communication log", "record call", "email log", "visit log", "case history"],
  },
  {
    id: "f-027",
    category: "contacts",
    plan: "all",
    headline: "Contact database linked to facilities and distributors",
    description: "Build your rep relationship network — billing coordinators, OR schedulers, purchasing managers, distributor reps. Each contact is linked to their facility or distributor, has their phone and email stored, and shows when you last reached out. The CRM a rep actually needs.",
    tags: ["contacts", "CRM", "billing coordinator", "OR scheduler", "purchasing manager", "contact database"],
  },
  {
    id: "f-028",
    category: "contacts",
    plan: "all",
    headline: "Import contacts from your phone or spreadsheet",
    description: "Upload a CSV of your existing contacts and import them in bulk. Field mapping is handled automatically. No re-typing 200 contacts one at a time. Export from your phone's contacts app or any spreadsheet and you're done in minutes.",
    tags: ["import contacts", "CSV import", "bulk import", "upload contacts", "existing contacts"],
  },
  {
    id: "f-029",
    category: "contacts",
    plan: "all",
    headline: "See which relationships are going cold",
    description: "Every contact shows when you last reached out, updated automatically whenever you log a communication. Sort your contact list by last contacted to see which key relationships haven't heard from you recently — useful for proactive check-ins between cases.",
    tags: ["last contacted", "cold contacts", "relationship maintenance", "proactive", "check in"],
  },

  // ─── NOTIFICATIONS & DIGEST ────────────────────────────────

  {
    id: "f-030",
    category: "notifications",
    plan: "all",
    headline: "Case tomorrow alert — every evening",
    description: "Every evening, MedRepDesk checks your schedule and sends a push notification for every case you have the following day. Know your morning lineup before you go to sleep — no scrambling to remember what's on.",
    tags: ["case tomorrow", "tomorrow alert", "morning cases", "schedule reminder", "next day cases"],
  },
  {
    id: "f-031",
    category: "notifications",
    plan: "all",
    headline: "Promised date passed — automatic morning alert",
    description: "If a billing contact promised a PO by a certain date and it hasn't arrived, you get a push notification the morning after. Automatically. You don't have to remember to check — MedRepDesk checks for you, every morning.",
    tags: ["promised date alert", "broken promise", "PO not arrived", "morning alert", "automatic alert"],
  },
  {
    id: "f-032",
    category: "notifications",
    plan: "all",
    headline: "Escalation alert — when chasing isn't working",
    description: "When a case hits your configured escalation threshold (default: 3 chase attempts) with no PO received, you get an escalation notification. Tells you the case, how many attempts, and the last contact. Your signal to go above billing to a manager.",
    tags: ["escalation alert", "escalation notification", "no PO", "multiple attempts", "escalate"],
  },
  {
    id: "f-033",
    category: "notifications",
    plan: "all",
    headline: "Overdue PO and commission alerts",
    description: "When an expected payment date passes with no PO received, you're alerted every morning until it's resolved. Same for commissions — when an expected commission date passes with nothing received, daily alerts until it's logged. Your money, tracked automatically.",
    tags: ["overdue PO", "overdue commission", "payment overdue", "daily alert", "outstanding"],
  },
  {
    id: "f-034",
    category: "notifications",
    plan: "all",
    headline: "Control every notification individually",
    description: "Turn each notification type on or off independently. Choose push only, email only, or both — per type. Get escalation alerts on push AND email, keep low-priority alerts as push only. Full control over what hits your phone and what goes to your inbox.",
    tags: ["notification control", "customize alerts", "turn off notifications", "push vs email", "notification settings"],
  },
  {
    id: "f-035",
    category: "notifications",
    plan: "all",
    headline: "Weekly digest — know exactly what the week needs",
    description: "Every Monday morning (or your chosen day), you get a structured summary of your week: upcoming cases, open POs with their age, follow-ups due, overdue commissions, and escalation flags. On Solo it's a clean plain-text list. On AI Pro it's a full narrative briefing.",
    tags: ["weekly digest", "Monday morning", "weekly summary", "week ahead", "briefing"],
  },
  {
    id: "f-036",
    category: "notifications",
    plan: "pro",
    headline: "AI weekly briefing — not just a list, a real briefing",
    description: "AI writes your Monday briefing in plain English: 'You have 4 cases this week. Valley ASC's PO for case 0042 is 18 days overdue — this is your 4th attempt and warrants escalation. Two commissions totaling $3,400 are past their expected date.' Tells you what's urgent, what to prioritize, and what's at risk.",
    tags: ["AI briefing", "AI digest", "Monday briefing", "intelligent summary", "AI weekly", "AI Pro"],
  },

  // ─── AI FEATURES ───────────────────────────────────────────

  {
    id: "f-037",
    category: "ai",
    plan: "all",
    headline: "AI reads and extracts PO data from photos",
    description: "Photograph any PO — physical or digital. AI extracts the PO number, invoice amount, issue date, facility name, and payment terms and pre-fills your form. No manual entry, no transcription errors. Works on all plans, completely unlimited.",
    tags: ["AI extraction", "PO photo", "auto fill", "AI reads PO", "extract data", "photograph", "unlimited"],
  },
  {
    id: "f-038",
    category: "ai",
    plan: "all",
    headline: "AI smart case entry from natural language",
    description: "Type or say a case description in plain English and AI creates the full case record — matching surgeon, facility, and distributor from your existing database. 50 entries/month on Solo, 100 on AI Pro, 500 on Distributorship.",
    tags: ["AI case entry", "smart case", "natural language", "AI create case", "voice to case"],
  },
  {
    id: "f-039",
    category: "ai",
    plan: "pro",
    headline: "AI drafts your PO chase emails",
    description: "One tap and AI generates a complete, professional follow-up email with case number, invoice details, contact name, prior attempt history, and a clear ask. Sounds like you wrote it because it knows your full case history. Available on AI Pro and Distributorship.",
    tags: ["AI email", "AI write email", "chase email AI", "draft email", "AI Pro"],
  },
  {
    id: "f-040",
    category: "ai",
    plan: "pro",
    headline: "AI monitors for commission underpayments",
    description: "AI analyzes your commission history and flags when distributors are consistently paying less than agreed. Shows you the pattern with data — which distributor, which procedure types, and by how much. Available on AI Pro and Distributorship.",
    tags: ["AI commission", "underpayment", "commission AI", "short paid", "discrepancy", "AI Pro"],
  },
  {
    id: "f-041",
    category: "ai",
    plan: "pro",
    headline: "AI-generated Monday morning briefing",
    description: "AI writes your weekly digest as a real narrative — what's urgent, what to watch, what's at risk — in plain English. Not a list, an actual briefing from someone who's reviewed your entire book. Available on AI Pro and Distributorship.",
    tags: ["AI digest", "weekly AI", "AI briefing", "AI summary", "Monday AI"],
  },

  // ─── VOICE ─────────────────────────────────────────────────

  {
    id: "f-042",
    category: "voice",
    plan: "all",
    headline: "Voice input — log entries hands-free",
    description: "Tap the microphone and speak. Log a case, add a chase entry, record a communication — all by voice. AI parses your words into the right fields. Works in the car, in scrubs, in the parking lot. Browser-based on Solo — no internet voice minutes consumed.",
    tags: ["voice input", "hands free", "speak to log", "voice command", "microphone", "dictate"],
  },
  {
    id: "f-043",
    category: "voice",
    plan: "pro",
    headline: "Full voice agent — ask questions, get answers",
    description: "Two-way conversational voice. Ask 'What cases do I have this week?' and hear the answer spoken back. Ask 'Which POs are more than 30 days overdue?' and get a spoken summary. Full back-and-forth conversation powered by OpenAI Realtime. 60 min/month on AI Pro, 200 min on Distributorship.",
    tags: ["voice agent", "conversational voice", "ask question", "voice answer", "two way voice", "AI Pro"],
  },
  {
    id: "f-044",
    category: "voice",
    plan: "pro",
    headline: "Log a full case entry entirely by voice",
    description: "On AI Pro, you can complete an entire case entry by voice — the agent asks clarifying questions, confirms the details, and logs it. No screen interaction required. Useful when you're scrubbed in, finishing a case, or driving between facilities.",
    tags: ["voice case entry", "hands free case", "scrubbed in", "voice log", "AI Pro"],
  },

  // ─── TEAM ──────────────────────────────────────────────────

  {
    id: "f-045",
    category: "team",
    plan: "pro",
    headline: "Add an office assistant to your account",
    description: "Give your office assistant access to create cases, log POs, add chase entries, and manage communications on your behalf. They get their own login and see everything you've built. They cannot touch billing, referrals, or commission financials. Role-gated at the database level.",
    tags: ["assistant", "second user", "office help", "delegate", "team", "two users"],
  },
  {
    id: "f-046",
    category: "team",
    plan: "dist",
    headline: "Cross-rep visibility — see your whole team",
    description: "As a distributorship owner, see every rep's cases, POs, and commissions in one dashboard. Filter by rep, status, date range, or distributor. Know which reps have overdue POs, which commissions are outstanding, and where the team's book stands — without asking each rep individually.",
    tags: ["cross-rep", "all reps", "team dashboard", "rep visibility", "distributorship", "manage reps"],
  },
  {
    id: "f-047",
    category: "team",
    plan: "dist",
    headline: "Manage manufacturer relationships and margins",
    description: "Distributors sell multiple manufacturers' products. My Manufacturers stores each manufacturer relationship — contact info, product lines you carry, your margin per line, and the commission rates you pay your reps. Full financial visibility into running a distributorship.",
    tags: ["My Manufacturers", "manufacturer", "margins", "product lines", "commission rates", "distributorship"],
  },
  {
    id: "f-048",
    category: "team",
    plan: "dist",
    headline: "Lock your team's app theme to your brand",
    description: "Set a theme for your entire team and lock it. Every rep sees the same branded experience — your colors, your background, your look. Reps cannot override it. Brand your team's daily tool to match your distributorship identity.",
    tags: ["brand locking", "team theme", "brand", "distributorship branding", "locked theme"],
  },
  {
    id: "f-049",
    category: "team",
    plan: "dist",
    headline: "Up to 5 users on one account",
    description: "Owner plus up to 4 additional team members — assistants and reps. Each user has their own login, their own case data, and their own notification preferences. The owner sees everything across the account. Assistants and reps see their assigned data.",
    tags: ["5 users", "multiple users", "team accounts", "distributorship users"],
  },

  // ─── MOBILE & OFFLINE ──────────────────────────────────────

  {
    id: "f-050",
    category: "mobile",
    plan: "all",
    headline: "Install on your iPhone — no App Store needed",
    description: "MedRepDesk is a Progressive Web App. Open it in Safari on your iPhone, tap Share → Add to Home Screen, and it installs like a native app. Looks and works like an app, lives on your home screen, and updates automatically in the background. No App Store approval, no waiting for updates.",
    tags: ["iPhone", "iOS", "install", "home screen", "no App Store", "PWA", "Progressive Web App"],
  },
  {
    id: "f-051",
    category: "mobile",
    plan: "all",
    headline: "Works on Android too",
    description: "Open MedRepDesk in Chrome on Android and tap 'Install App.' Same home screen experience as iOS. Full push notifications, offline mode, and background sync all work on Android.",
    tags: ["Android", "Chrome", "install Android", "home screen", "PWA"],
  },
  {
    id: "f-052",
    category: "mobile",
    plan: "all",
    headline: "Works offline — no signal, no problem",
    description: "Core features work without an internet connection. View cases, contacts, and recent data even in areas with no signal. Actions taken offline are queued and synced automatically when you reconnect. A sync indicator shows when data is pending.",
    tags: ["offline", "no internet", "offline mode", "no signal", "sync", "OR offline"],
  },
  {
    id: "f-053",
    category: "mobile",
    plan: "all",
    headline: "Mobile-first design — built for your phone",
    description: "Every screen is designed for one-handed use on a smartphone. Large touch targets, bottom sheet modals instead of full-page navigation, a persistent + button for quick actions, and skeleton loading screens instead of spinners. Fast, fluid, and comfortable to use all day.",
    tags: ["mobile", "one handed", "touch friendly", "phone", "mobile design", "easy to use"],
  },
  {
    id: "f-054",
    category: "mobile",
    plan: "all",
    headline: "Quick actions from anywhere in the app",
    description: "A floating + button is always visible no matter where you are in the app. Tap it to instantly create a new case, log a PO, log a communication, or add a contact — without navigating away from what you're doing.",
    tags: ["quick add", "floating button", "FAB", "fast entry", "quick action"],
  },

  // ─── SECURITY ──────────────────────────────────────────────

  {
    id: "f-055",
    category: "security",
    plan: "all",
    headline: "Your data is completely isolated from other accounts",
    description: "Row Level Security (RLS) is enforced at the database level — not just the app layer. Every single query is scoped to your account. Even in the event of an application bug, the database rejects any cross-account data access. Your cases, POs, contacts, and commissions are yours alone.",
    tags: ["data isolation", "security", "RLS", "private", "account isolation", "my data only"],
  },
  {
    id: "f-056",
    category: "security",
    plan: "all",
    headline: "No patient data — ever",
    description: "MedRepDesk intentionally stores no Protected Health Information. We store invoice numbers, procedure types, case values, and scheduling info — never patient names, dates of birth, insurance data, or any PHI. You stay compliant without thinking about it.",
    tags: ["HIPAA", "patient data", "PHI", "no patient info", "compliant", "privacy"],
  },
  {
    id: "f-057",
    category: "security",
    plan: "all",
    headline: "Sign in with Google — no password to manage",
    description: "MedRepDesk supports Google OAuth. Sign in with your Google account across any device — no separate password to remember or manage. Session stays active for 30 days on mobile with silent background refresh.",
    tags: ["Google login", "Google OAuth", "sign in with Google", "SSO", "no password"],
  },

  // ─── REFERRALS ─────────────────────────────────────────────

  {
    id: "f-058",
    category: "referrals",
    plan: "all",
    headline: "Earn 25% recurring for every rep you refer",
    description: "Every MedRepDesk account gets a unique referral link. Share it with other reps. When they sign up and start paying, you earn 25% of their monthly subscription for 12 months — automatically. No invoicing, no chasing. Refer 4 Solo reps and your own subscription pays for itself.",
    tags: ["referral", "earn money", "25%", "refer a rep", "referral program", "passive income"],
  },
  {
    id: "f-059",
    category: "referrals",
    plan: "all",
    headline: "Referral earnings paid automatically via Stripe",
    description: "Referral commissions are deposited directly to your bank account on the 1st of each month via Stripe Connect. No manual requests, no waiting for a check. Set up your payout account once when you earn your first referral — takes about 5 minutes.",
    tags: ["referral payout", "automatic payment", "Stripe", "direct deposit", "bank account", "earn"],
  },

];

// ─── Search helper ─────────────────────────────────────────────
export function searchFeatures(query, categoryFilter = "all", planFilter = "all") {
  let results = FEATURES_DB;

  // Category filter
  if (categoryFilter && categoryFilter !== "all") {
    results = results.filter(f => f.category === categoryFilter);
  }

  // Plan filter
  if (planFilter && planFilter !== "all") {
    if (planFilter === "solo") results = results.filter(f => f.plan === "all");
    if (planFilter === "pro") results = results.filter(f => f.plan === "all" || f.plan === "pro");
    if (planFilter === "dist") results = results; // dist gets everything
  }

  // Text search
  if (!query || query.trim().length < 2) return results;

  const terms = query.toLowerCase().trim().split(/\s+/);

  return results
    .map(feature => {
      let score = 0;
      const hLower = feature.headline.toLowerCase();
      const dLower = feature.description.toLowerCase();
      const tLower = feature.tags.join(" ").toLowerCase();

      for (const term of terms) {
        if (hLower.includes(term)) score += 12;
        if (tLower.includes(term)) score += 8;
        if (dLower.includes(term)) score += 3;
      }
      if (hLower.includes(query.toLowerCase())) score += 20;

      return { ...feature, score };
    })
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score);
}

export const PLAN_LABELS = {
  all: { label: "All Plans", color: "emerald" },
  pro: { label: "AI Pro & Up", color: "blue" },
  dist: { label: "Distributorship", color: "amber" },
};

export default FEATURES_DB;
