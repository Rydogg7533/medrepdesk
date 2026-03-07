import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code, email } = await req.json();

    if (!code) {
      return new Response(
        JSON.stringify({ valid: false, error: "No code provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dev bypass code
    const DEV_CODE = Deno.env.get("BETA_DEV_CODE");
    if (DEV_CODE && code.trim().toUpperCase() === DEV_CODE) {
      return new Response(
        JSON.stringify({ valid: true, plan: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: accessCode, error } = await supabase
      .from("beta_access_codes")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !accessCode) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid access code" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check use limit
    if (accessCode.use_count >= accessCode.max_uses) {
      return new Response(
        JSON.stringify({ valid: false, error: "This access code has reached its limit" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check email lock if set
    if (accessCode.email && email && accessCode.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ valid: false, error: "This code is not valid for this email address" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        plan: accessCode.plan || null,
        code_id: accessCode.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
