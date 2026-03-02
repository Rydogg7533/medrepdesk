// Edge Function: Commission Check
// Analyzes commission patterns for discrepancies
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
    const { account_id, distributor_id } = await req.json();

    if (!account_id || !distributor_id) {
      return new Response(
        JSON.stringify({ error: "account_id and distributor_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch commissions for this distributor where received_amount exists
    const { data: commissions } = await supabase
      .from("commissions")
      .select("*, case:cases(case_number)")
      .eq("account_id", account_id)
      .eq("distributor_id", distributor_id)
      .not("received_amount", "is", null);

    if (!commissions || commissions.length === 0) {
      return new Response(
        JSON.stringify({
          analysis: "No received commissions found for this distributor to analyze.",
          discrepancies: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find discrepancies
    const discrepancies = commissions
      .filter(
        (c) =>
          c.expected_amount != null &&
          c.received_amount != null &&
          Math.abs(c.expected_amount - c.received_amount) > 0.01
      )
      .map((c) => ({
        case_number: c.case?.case_number || "Unknown",
        expected: c.expected_amount,
        received: c.received_amount,
        difference: Number((c.expected_amount - c.received_amount).toFixed(2)),
        commission_type: c.commission_type,
        rate: c.rate,
        case_value: c.case_value,
      }));

    // Build summary for Claude
    const commissionSummary = commissions
      .map(
        (c) =>
          `Case ${c.case?.case_number}: type=${c.commission_type}, rate=${c.rate}%, case_value=$${c.case_value}, expected=$${c.expected_amount}, received=$${c.received_amount}`
      )
      .join("\n");

    // Fetch distributor info
    const { data: distributor } = await supabase
      .from("distributors")
      .select("name, default_commission_type, default_commission_rate, default_flat_amount")
      .eq("id", distributor_id)
      .single();

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
            content: `You are a commission analysis assistant for a medical device sales rep.

Distributor: ${distributor?.name || "Unknown"}
Default commission: ${distributor?.default_commission_type || "percentage"} at ${distributor?.default_commission_rate || "N/A"}%

Commission records:
${commissionSummary}

Analyze these commissions. Look for:
1. Discrepancies between expected and received amounts
2. Patterns (are they consistently underpaying?)
3. Any anomalies in rates or calculations
4. Recommendations

Return ONLY valid JSON:
{
  "analysis": "2-3 paragraph analysis in plain English",
  "total_expected": "number - sum of all expected amounts",
  "total_received": "number - sum of all received amounts",
  "total_difference": "number - total discrepancy"
}`,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text();
      console.error("Anthropic API error:", errBody);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = anthropicData.content?.[0]?.text || "";

    let analysisResult;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: rawText };
    } catch {
      analysisResult = { analysis: rawText };
    }

    // Log extraction
    await supabase.from("ai_extractions").insert({
      account_id,
      extraction_type: "commission_check",
      input_type: "text",
      raw_response: anthropicData,
      extracted_fields: { ...analysisResult, discrepancies },
    });

    return new Response(
      JSON.stringify({
        ...analysisResult,
        discrepancies,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("commission-check error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
