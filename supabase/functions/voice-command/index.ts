// Edge Function: Voice Command Parser
// Parses voice transcripts into structured actions using Claude
// Secrets required: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// NOTE: Surgeon matching requires fuzzy match against the user's account surgeon list.
// If a spoken surgeon name doesn't match any known surgeon, surgeon_id must be null
// and an ambiguity must be returned indicating the surgeon was not found.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_LIMITS: Record<string, number> = {
  solo: 50,
  assistant: 100,
  distributorship: 500,
};

const SYSTEM_PROMPT = `You are a voice command parser for MedRepDesk, a mobile app for independent orthopedic medical device sales reps. Parse the voice transcript into structured actions.

INTENT TYPES:
- schedule_case: scheduling a new surgical case
- update_case: updating existing case status or details
- log_chase: logging a PO chase attempt (chase activity is visible on the case detail page between Purchase Orders and Communications, in the bill sheet detail view in Money, and summarized on the dashboard)
- log_po_received: marking a PO as received
- log_commission: rep received a commission payment from their distributor. Extract case_id or case_reference to find the commission, received_amount (required), received_date (defaults to today), and optional notes. Maps to PATCH commission → status: "received". Example phrases: "I got paid for case 0007", "XS Medical paid me $2000 for the knee case", "log commission received for MRD-3A14-2026-0007, $2000". There is NO "confirmed" status — commissions go from "pending" directly to "received".
- dispute_commission: rep says a received commission amount was wrong or short. Extract case_id or case_reference, notes (what's wrong, required), and received_amount (what they actually got, if stated). Maps to PATCH commission → status: "disputed". Example: "dispute commission for case 0007, they shorted me $200".
- log_communication: logging a call, email, text, or visit
- add_contact: adding a new contact
- status_query: asking about cases, POs, or commissions
- quick_status: one-word status updates (case done, bill sheet in, etc.)

COMMISSION WORKFLOW:
- Commissions are auto-created when a case is completed (status: "pending")
- "Pending" = distributor owes the rep but has not paid yet
- There is NO "confirmed" status — it does not exist
- Rep receives payment → "mark as received" (log_commission intent)
- Received amount wrong → "dispute" (dispute_commission intent)
- Dispute resolved → status back to "received" with corrected amount

MEDICAL SHORTHAND:
- THA/THR = total hip arthroplasty (procedure_type: "hip")
- TKA/TKR = total knee arthroplasty (procedure_type: "knee")
- ORIF = open reduction internal fixation (procedure_type: "trauma")
- TSA = total shoulder arthroplasty (procedure_type: "shoulder")
- ACL = ACL reconstruction (procedure_type: "knee")

DATE RESOLUTION:
- Resolve all relative dates to actual ISO dates based on the current date provided
- "next Thursday" = calculate actual date
- "Monday" = next Monday if today is past Monday
- "in two weeks" = current date + 14 days
- "tomorrow" = current date + 1 day

NAME MATCHING:
- Fuzzy match surgeon names against provided surgeons list (e.g. "Dr. Smith" matches "Dr. John Smith")
- Fuzzy match facility names against provided facilities list
- Fuzzy match distributor names against provided distributors list
- Return matched IDs when confident, null when uncertain
- IMPORTANT: If a spoken surgeon name does NOT match any surgeon in the provided list, you MUST:
  1. Set surgeon_id to null
  2. Set surgeon_name to the spoken name
  3. Add an ambiguity: "Surgeon '[spoken name]' not found in your surgeon list. Would you like to add them?"
- Apply the same rule for facilities: if not matched, set facility_id to null and add an ambiguity

Return ONLY valid JSON (no markdown, no code fences):
{
  "intent": "string",
  "confidence": 0.0,
  "fields": {
    "surgeon_id": null,
    "surgeon_name": null,
    "facility_id": null,
    "facility_name": null,
    "distributor_id": null,
    "procedure_type": null,
    "scheduled_date": null,
    "scheduled_time": null,
    "case_value": null,
    "case_id": null,
    "case_reference": null,
    "chase_type": null,
    "contact_name": null,
    "contact_role": null,
    "outcome": null,
    "promised_date": null,
    "next_follow_up": null,
    "action_taken": null,
    "amount": null,
    "received_amount": null,
    "received_date": null,
    "status": null,
    "comm_type": null,
    "direction": null,
    "subject": null,
    "follow_up_date": null,
    "notes": null
  },
  "ambiguities": [],
  "confirmation_message": "string"
}`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { transcript, account_id, context } = await req.json();

    if (!transcript || !account_id) {
      return new Response(
        JSON.stringify({ error: "transcript and account_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify account exists
    const { data: account } = await supabase
      .from("accounts")
      .select("plan, ai_extractions_this_month")
      .eq("id", account_id)
      .single();

    if (!account) {
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = PLAN_LIMITS[account.plan] || 50;
    if (account.ai_extractions_this_month >= limit) {
      return new Response(
        JSON.stringify({ error: "AI extraction limit reached", limit, used: account.ai_extractions_this_month }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch context data for matching
    const [surgeonRes, facilityRes, distributorRes] = await Promise.all([
      supabase
        .from("surgeons")
        .select("id, full_name, specialty")
        .eq("account_id", account_id),
      supabase
        .from("facilities")
        .select("id, name, facility_type, city, state")
        .eq("account_id", account_id),
      supabase
        .from("distributors")
        .select("id, name")
        .eq("account_id", account_id),
    ]);

    const surgeons = surgeonRes.data || [];
    const facilities = facilityRes.data || [];
    const distributors = distributorRes.data || [];

    const surgeonList = surgeons
      .map((s) => `${s.full_name} (ID: ${s.id}${s.specialty ? ", " + s.specialty : ""})`)
      .join("\n");
    const facilityList = facilities
      .map((f) => `${f.name} (ID: ${f.id}${f.city ? ", " + f.city : ""}${f.state ? " " + f.state : ""})`)
      .join("\n");
    const distributorList = distributors
      .map((d) => `${d.name} (ID: ${d.id})`)
      .join("\n");

    const currentDate = context?.currentDate || new Date().toISOString().split("T")[0];

    const userMessage = `Current date: ${currentDate}

Known surgeons:
${surgeonList || "None registered yet"}

Known facilities:
${facilityList || "None registered yet"}

Known distributors:
${distributorList || "None registered yet"}

Voice transcript: "${transcript}"`;

    // Call Claude
    console.log("voice-command: calling Anthropic, key prefix:", anthropicKey?.substring(0, 10), "transcript length:", transcript.length, "account_id:", account_id);
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text();
      console.error("voice-command: Anthropic API error, status:", anthropicResponse.status, "body:", errBody);
      return new Response(
        JSON.stringify({ error: "AI parsing failed", detail: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = anthropicData.content?.[0]?.text || "";

    let extracted;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      extracted = { error: "Failed to parse AI response", raw: rawText };
    }

    // Log extraction
    await supabase.from("ai_extractions").insert({
      account_id,
      extraction_type: "case_entry",
      input_type: "text",
      raw_response: anthropicData,
      extracted_fields: extracted,
    });

    // Increment usage
    await supabase
      .from("accounts")
      .update({ ai_extractions_this_month: account.ai_extractions_this_month + 1 })
      .eq("id", account_id);

    return new Response(
      JSON.stringify(extracted),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("voice-command: uncaught error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
