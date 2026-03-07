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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return respond({ error: "Missing authorization header" }, 401);
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
      console.error("Auth failed:", authError?.message);
      return respond({ error: "Unauthorized" }, 401);
    }
    console.log("Authenticated user:", user.id, user.email);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 2. Parse request
    const body = await req.json();
    const { plan, success_url, cancel_url } = body;
    console.log("Request body:", JSON.stringify(body));

    // 3. Map plan to price ID
    const PRICE_IDS: Record<string, string> = {
      solo: Deno.env.get("STRIPE_PRICE_SOLO") || "",
      assistant: Deno.env.get("STRIPE_PRICE_ASSISTANT") || "",
      distributorship: Deno.env.get("STRIPE_PRICE_DISTRIBUTORSHIP") || "",
    };

    const priceId = PRICE_IDS[plan];
    console.log("Plan:", plan, "Price ID:", priceId ? `${priceId.slice(0, 10)}...` : "MISSING");

    if (!plan || !priceId) {
      return respond({ error: `No price ID configured for plan: ${plan}` }, 400);
    }

    // 4. Get account
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      console.error("User lookup failed:", userError?.message);
      return respond({ error: "User account not found" }, 404);
    }

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, stripe_customer_id, email, name")
      .eq("id", userData.account_id)
      .single();

    if (accountError || !account) {
      console.error("Account lookup failed:", accountError?.message);
      return respond({ error: "Account not found" }, 404);
    }
    console.log("Account:", account.id, "email:", account.email, "stripe_customer:", account.stripe_customer_id || "none");

    // 5. Create Stripe Checkout
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not set");
      return respond({ error: "Stripe not configured" }, 500);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const sessionParams: Record<string, unknown> = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || "https://www.medrepdesk.io/settings?checkout=success",
      cancel_url: cancel_url || "https://www.medrepdesk.io/pricing?checkout=cancel",
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
      sessionParams.customer_email = account.email || user.email;
    }

    console.log("Creating Stripe session with params:", JSON.stringify({
      mode: sessionParams.mode,
      priceId,
      customer: sessionParams.customer || "new",
      customer_email: sessionParams.customer_email || "n/a",
    }));

    const session = await stripe.checkout.sessions.create(sessionParams as Stripe.Checkout.SessionCreateParams);
    console.log("Stripe session created:", session.id, "url:", session.url?.slice(0, 50));

    return respond({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error("create-checkout error:", err.message, err.stack);
    return respond({ error: err.message }, 500);
  }
});
