// Edge Function: Voice Command Parser
// Parses voice transcripts into structured actions using Claude
// Secrets required: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
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
- log_chase: logging a PO chase attempt
- log_po_received: marking a PO as received
- log_commission: logging commission received or disputed
- log_communication: logging a call, email, text, or visit
- add_contact: adding a new contact
- status_query: asking about cases, POs, or commissions
- quick_status: one-word status updates (case done, bill sheet in, etc.)

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
- Fuzzy match surgeon names against provided surgeons list
- Fuzzy match facility names against provided facilities list
- Fuzzy match distributor names against provided distributors list
- Return matched IDs when confident, null when uncertain

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
        .or(`account_id.eq.${account_id},is_global.eq.true`),
      supabase
        .from("facilities")
        .select("id, name, facility_type, city, state")
        .or(`account_id.eq.${account_id},is_global.eq.true`),
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
    console.log("Calling Anthropic with key prefix:", anthropicKey?.substring(0, 10));
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
      console.error("Anthropic API error:", errBody);
      return new Response(
        JSON.stringify({ error: "AI parsing failed" }),
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
    console.error("Anthropic API error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
