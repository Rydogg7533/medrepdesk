// Edge Function: Create Stripe Checkout Session
// Creates a Checkout session for Solo ($99), Assistant ($149), or Distributorship ($249)
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_SOLO, STRIPE_PRICE_ASSISTANT, STRIPE_PRICE_DISTRIBUTORSHIP,
//          SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRICE_MAP: Record<string, string> = {
  solo: Deno.env.get("STRIPE_PRICE_SOLO") || "",
  assistant: Deno.env.get("STRIPE_PRICE_ASSISTANT") || "",
  distributorship: Deno.env.get("STRIPE_PRICE_DISTRIBUTORSHIP") || "",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 2. Parse request
    const { plan, success_url, cancel_url } = await req.json();

    if (!plan || !PRICE_MAP[plan]) {
      return new Response(
        JSON.stringify({ error: "Invalid plan. Must be solo, assistant, or distributorship." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const priceId = PRICE_MAP[plan];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Price ID not configured for plan: ${plan}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Get account
    const { data: userData } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", user.id)
      .single();

    if (!userData) {
      return new Response(
        JSON.stringify({ error: "User account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: account } = await supabase
      .from("accounts")
      .select("id, stripe_customer_id, email, name")
      .eq("id", userData.account_id)
      .single();

    if (!account) {
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Create Stripe Checkout
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${req.headers.get("origin")}/settings?checkout=success`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/pricing?checkout=cancel`,
      subscription_data: {
        metadata: { account_id: account.id, plan },
        trial_period_days: 14,
      },
      metadata: { account_id: account.id, plan },
      allow_promotion_codes: true,
    };

    // Reuse existing Stripe customer or create new
    if (account.stripe_customer_id) {
      sessionParams.customer = account.stripe_customer_id;
    } else {
      sessionParams.customer_email = account.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
