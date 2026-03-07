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

    // Parse optional voice preference from request body
    let voice = "alloy";
    try {
      const body = await req.json();
      if (body?.voice) voice = body.voice;
    } catch {
      // No body or invalid JSON — use default
    }

    // Create ephemeral session token from OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI session error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to create voice session" }),
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
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("openai-voice-session error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
