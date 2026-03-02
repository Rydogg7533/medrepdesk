// Edge Function: Chase Email Draft
// Generates a professional follow-up email for PO chasing
// Secrets required: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { case_id, po_id, account_id, tone = "polite" } = await req.json();

    if (!case_id || !po_id || !account_id) {
      return new Response(
        JSON.stringify({ error: "case_id, po_id, and account_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch case details
    const { data: caseData } = await supabase
      .from("cases")
      .select("case_number, case_value, surgeon:surgeons(full_name), facility:facilities(name), distributor:distributors(name)")
      .eq("id", case_id)
      .single();

    // Fetch PO details
    const { data: poData } = await supabase
      .from("purchase_orders")
      .select("invoice_number, po_number, amount, invoice_date, issue_date, expected_payment_date")
      .eq("id", po_id)
      .single();

    // Fetch chase history
    const { data: chaseEntries } = await supabase
      .from("po_chase_log")
      .select("chase_type, created_at, promised_date, outcome")
      .eq("po_id", po_id)
      .order("created_at", { ascending: false });

    const chaseCount = chaseEntries?.length || 0;
    const lastEntry = chaseEntries?.[0];
    const lastContactDate = lastEntry?.created_at
      ? new Date(lastEntry.created_at).toLocaleDateString()
      : "N/A";
    const promisedDate = chaseEntries?.find((e) => e.promised_date)?.promised_date || "None";

    const caseNumber = caseData?.case_number || "Unknown";
    const invoiceNumber = poData?.invoice_number || "Unknown";
    const amount = poData?.amount ? `$${Number(poData.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Unknown";
    const facilityName = caseData?.facility?.name || "the facility";
    const surgeonName = caseData?.surgeon?.full_name || "the surgeon";

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
        messages: [
          {
            role: "user",
            content: `You are a professional medical device sales rep writing a follow-up email to a hospital billing department about a purchase order.

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
  "body": "email body text (plain text, include greeting and sign-off placeholder [Your Name])"
}`,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text();
      console.error("Anthropic API error:", errBody);
      return new Response(
        JSON.stringify({ error: "AI draft failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = anthropicData.content?.[0]?.text || "";

    let extracted;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : { subject: "", body: "" };
    } catch {
      extracted = { subject: "", body: rawText };
    }

    return new Response(
      JSON.stringify(extracted),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("draft-chase-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
