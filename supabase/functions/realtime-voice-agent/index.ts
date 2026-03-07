import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VOICE_LIMITS: Record<string, number> = {
  solo: 0,
  assistant: 60,
  distributorship: 200,
};

const SYSTEM_PROMPT = `You are the MedRepDesk voice assistant — a smart, efficient assistant for independent orthopedic medical device sales reps.

You help reps manage their business hands-free while they're in the field, driving between hospitals, or scrubbing in.

YOUR PERSONALITY:
- Confident, concise, professional
- You know the rep's business — their cases, surgeons, facilities, distributors, and outstanding POs
- You speak in short sentences — this is a voice interface
- You confirm actions before executing them
- You never make up data — if you're unsure, you ask

WHAT YOU CAN DO:
1. CASES — Schedule new cases, update case status, mark complete
2. CHASE LOG — Log bill sheet submissions, PO follow-ups, record promised dates, log escalations
3. PURCHASE ORDERS — Mark POs as received, record amounts
4. COMMISSIONS — Mark commissions received, log disputes
5. COMMUNICATIONS — Log calls, emails, texts, visits with contacts
6. CONTACTS — Look up contact info, add new contacts
7. QUERY — Answer questions about their pipeline, cases, money owed

REQUIRED FIELDS BY ACTION:
- schedule_case: surgeon (required), facility (required), procedure_type (required), scheduled_date (required), scheduled_time (optional), distributor (optional), case_value (optional)
- log_chase: case (required), chase_type (required: bill_sheet_submitted, po_requested, follow_up_call, follow_up_email, follow_up_text, po_received, escalation, note), contact_name (optional), outcome (optional), promised_date (optional), next_follow_up (optional)
- log_po_received: case (required), amount (required), received_date (defaults today)
- log_commission_received: case (required), received_amount (required), received_date (defaults today)
- log_communication: case (optional), comm_type (required: call, email, text, in_person, voicemail, note), contact_name (optional), outcome (optional), follow_up_date (optional)
- mark_case_complete: case (required)
- add_contact: full_name (required), role (optional), facility_name (optional), phone (optional), email (optional)

MEDICAL SHORTHAND:
- THA/THR = total hip arthroplasty (procedure_type: "hip")
- TKA/TKR = total knee arthroplasty (procedure_type: "knee")
- ORIF = open reduction internal fixation (procedure_type: "trauma")
- TSA = total shoulder arthroplasty (procedure_type: "shoulder")
- ACL = ACL reconstruction (procedure_type: "knee")

COMMISSION WORKFLOW:
- Commissions are auto-created when a case is completed (status: "pending")
- There is NO "confirmed" status — commissions go pending → received
- Rep receives payment → log_commission_received
- Received amount wrong → dispute (not yet implemented via voice)

CONVERSATION RULES:
- If a required field is missing, ask for it naturally — one question at a time, not a list
- Use the rep's existing data to fill fields when possible (e.g. if they say "case 8" look it up, if they say "Dr. Clark" match to existing surgeon)
- Before executing any write operation, speak a brief confirmation: "I'll log X for case Y — confirming now"
- After success: brief confirmation + offer next action
- If a case number is ambiguous, confirm which one
- Keep responses SHORT — 1-2 sentences max during data collection, slightly longer for confirmations
- Use natural language for dates: "Friday", "tomorrow", "March 13th" — not ISO format in speech
- When the user says "done", "that's all", "goodbye", or "nothing else", end the conversation politely

THINGS YOU DO NOT DO:
- Never delete records
- Never modify billing or Stripe data
- Never access other accounts' data
- Never make up case numbers, surgeon names, or amounts
- Never skip confirmation before a write operation`;

const TOOLS = [
  {
    type: "function",
    name: "get_context",
    description: "Fetch the rep's data. IMPORTANT: When scheduling a case, call with data_type='surgeons' and filters.name_search='[surname]' to find surgeon ID, then call with data_type='facilities' and filters.name_search='[partial name]' to find facility ID. Always resolve names to IDs before calling schedule_case.",
    parameters: {
      type: "object",
      properties: {
        data_type: {
          type: "string",
          enum: ["cases", "purchase_orders", "commissions", "contacts", "surgeons", "facilities", "distributors", "chase_log"],
          description: "Which type of data to fetch",
        },
        filters: {
          type: "object",
          properties: {
            status: { type: "string", description: "Filter by status" },
            case_id: { type: "string", description: "Filter by specific case ID" },
            case_number_search: { type: "string", description: "Partial case number to search for (e.g. '0008' or '8')" },
            name_search: { type: "string", description: "Partial name to search for when looking up surgeons or facilities (e.g. 'Clark' or 'Garfield')" },
            limit: { type: "number", description: "Max records to return (default 20)" },
          },
        },
      },
      required: ["data_type"],
    },
  },
  {
    type: "function",
    name: "schedule_case",
    description: "Create a new surgical case. Requires surgeon, facility, procedure type, and date. Call get_context first to match surgeon/facility names to their IDs.",
    parameters: {
      type: "object",
      properties: {
        surgeon_id: { type: "string", description: "UUID of the surgeon" },
        surgeon_name: { type: "string", description: "Name of surgeon (for confirmation)" },
        facility_id: { type: "string", description: "UUID of the facility" },
        facility_name: { type: "string", description: "Name of facility (for confirmation)" },
        procedure_type: { type: "string", description: "Type of procedure (hip, knee, shoulder, etc.)" },
        scheduled_date: { type: "string", description: "ISO date (YYYY-MM-DD)" },
        scheduled_time: { type: "string", description: "Time in HH:MM format (optional)" },
        distributor_id: { type: "string", description: "UUID of distributor (optional)" },
        case_value: { type: "number", description: "Dollar value of the case (optional)" },
        notes: { type: "string", description: "Additional notes (optional)" },
      },
      required: ["surgeon_id", "facility_id", "procedure_type", "scheduled_date"],
    },
  },
  {
    type: "function",
    name: "mark_case_complete",
    description: "Mark a case as completed. This triggers auto-creation of a commission record.",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "UUID of the case to mark complete" },
      },
      required: ["case_id"],
    },
  },
  {
    type: "function",
    name: "log_chase",
    description: "Log a chase entry for a case — tracking bill sheet submissions, PO follow-ups, promised dates, escalations.",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "UUID of the case" },
        chase_type: {
          type: "string",
          enum: ["bill_sheet_submitted", "po_requested", "follow_up_call", "follow_up_email", "follow_up_text", "po_received", "escalation", "note"],
          description: "Type of chase activity",
        },
        contact_name: { type: "string", description: "Name of person contacted (optional)" },
        contact_role: { type: "string", description: "Role of person contacted (optional)" },
        action_taken: {
          type: "string",
          enum: ["call", "email", "text", "in_person", "note"],
          description: "How the follow-up was done",
        },
        outcome: { type: "string", description: "What happened / what they said" },
        promised_date: { type: "string", description: "Date they promised (ISO YYYY-MM-DD)" },
        next_follow_up: { type: "string", description: "When to follow up next (ISO YYYY-MM-DD)" },
        notes: { type: "string", description: "Additional notes" },
      },
      required: ["case_id", "chase_type"],
    },
  },
  {
    type: "function",
    name: "log_po_received",
    description: "Mark a purchase order as received for a case.",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "UUID of the case" },
        amount: { type: "number", description: "PO amount in dollars" },
        po_number: { type: "string", description: "PO number (optional)" },
        received_date: { type: "string", description: "Date received (ISO, defaults to today)" },
      },
      required: ["case_id", "amount"],
    },
  },
  {
    type: "function",
    name: "log_commission_received",
    description: "Mark a commission as received for a case.",
    parameters: {
      type: "object",
      properties: {
        case_id: { type: "string", description: "UUID of the case" },
        received_amount: { type: "number", description: "Amount received in dollars" },
        received_date: { type: "string", description: "Date received (ISO, defaults to today)" },
        notes: { type: "string", description: "Additional notes" },
      },
      required: ["case_id", "received_amount"],
    },
  },
  {
    type: "function",
    name: "log_communication",
    description: "Log a communication (call, email, text, visit) with a contact.",
    parameters: {
      type: "object",
      properties: {
        comm_type: {
          type: "string",
          enum: ["call", "email", "text", "in_person", "voicemail", "note"],
          description: "Type of communication",
        },
        direction: {
          type: "string",
          enum: ["inbound", "outbound"],
          description: "Direction (default outbound)",
        },
        case_id: { type: "string", description: "UUID of related case (optional)" },
        contact_name: { type: "string", description: "Name of the contact" },
        contact_role: { type: "string", description: "Role of the contact" },
        subject: { type: "string", description: "Subject or topic" },
        notes: { type: "string", description: "Details of the communication" },
        outcome: { type: "string", description: "Outcome or result" },
        follow_up_date: { type: "string", description: "Follow-up date (ISO YYYY-MM-DD)" },
      },
      required: ["comm_type"],
    },
  },
  {
    type: "function",
    name: "add_contact",
    description: "Add a new contact to the rep's contact list.",
    parameters: {
      type: "object",
      properties: {
        full_name: { type: "string", description: "Full name of the contact" },
        role: { type: "string", description: "Job role/title" },
        facility_id: { type: "string", description: "UUID of associated facility (optional)" },
        phone: { type: "string", description: "Phone number" },
        email: { type: "string", description: "Email address" },
        notes: { type: "string", description: "Notes about the contact" },
      },
      required: ["full_name"],
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's account and plan
    const { data: userData } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", user.id)
      .single();

    if (!userData?.account_id) {
      return new Response(
        JSON.stringify({ error: "No account found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: account } = await supabase
      .from("accounts")
      .select("plan, sub_status, voice_minutes_this_month")
      .eq("id", userData.account_id)
      .single();

    if (!account) {
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const plan = account.plan || "solo";
    const subStatus = account.sub_status || "trialing";
    const isActive = ["active", "trialing"].includes(subStatus);

    if (!isActive || !["assistant", "distributorship"].includes(plan)) {
      return new Response(
        JSON.stringify({ error: "upgrade_required", plan }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = VOICE_LIMITS[plan] || 0;
    const used = Number(account.voice_minutes_this_month) || 0;

    if (used >= limit) {
      return new Response(
        JSON.stringify({ error: "limit_reached", minutes_used: used, limit }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse optional voice from request body
    let voice = "alloy";
    try {
      const body = await req.json();
      if (body?.voice) voice = body.voice;
    } catch {
      // No body — use default
    }

    // Create OpenAI Realtime session with tools
    const openaiRes = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice,
        instructions: SYSTEM_PROMPT,
        tools: TOOLS,
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: { type: "server_vad", silence_duration_ms: 800 },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI session error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to create voice session", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionData = await openaiRes.json();

    return new Response(
      JSON.stringify({
        ...sessionData,
        minutes_used: used,
        minutes_limit: limit,
        account_id: userData.account_id,
        user_id: user.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("realtime-voice-agent error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
