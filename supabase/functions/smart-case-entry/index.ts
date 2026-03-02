// Edge Function: Smart Case Entry
// Parses natural language text into structured case fields
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
    const { text, account_id } = await req.json();

    if (!text || !account_id) {
      return new Response(
        JSON.stringify({ error: "text and account_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check plan limits
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

    // Fetch account's surgeons and facilities for context
    const [surgeonRes, facilityRes] = await Promise.all([
      supabase
        .from("surgeons")
        .select("id, full_name, specialty")
        .or(`account_id.eq.${account_id},is_global.eq.true`),
      supabase
        .from("facilities")
        .select("id, name, facility_type, city, state")
        .or(`account_id.eq.${account_id},is_global.eq.true`),
    ]);

    const surgeons = surgeonRes.data || [];
    const facilities = facilityRes.data || [];

    const surgeonList = surgeons
      .map((s) => `${s.full_name} (ID: ${s.id}${s.specialty ? ", " + s.specialty : ""})`)
      .join("\n");
    const facilityList = facilities
      .map((f) => `${f.name} (ID: ${f.id}${f.city ? ", " + f.city : ""}${f.state ? " " + f.state : ""})`)
      .join("\n");

    // Send to Claude
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
            content: `You are a medical device sales rep assistant. Parse the following natural language case description into structured data.

Known surgeons:
${surgeonList || "None registered yet"}

Known facilities:
${facilityList || "None registered yet"}

Return ONLY valid JSON:
{
  "surgeon_name": "string - match to known surgeon if possible",
  "surgeon_id": "uuid or null - ID of matched surgeon",
  "facility_name": "string - match to known facility if possible",
  "facility_id": "uuid or null - ID of matched facility",
  "procedure_type": "hip|knee|shoulder|spine|trauma|other or null",
  "scheduled_date": "ISO date string (YYYY-MM-DD) or null",
  "scheduled_time": "HH:MM (24-hour) or null",
  "case_value": "number or null",
  "notes": "any remaining details as string"
}

Case description: ${text}`,
          },
        ],
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
      extracted = {};
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
    console.error("smart-case-entry error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
