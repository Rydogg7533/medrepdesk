// Edge Function: Create Stripe Connect Express Account
// Onboards referrers to receive referral payouts via Stripe Connect.
// Stores stripe_connect_id on accounts table.
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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

    // Get account
    const { data: userData } = await supabase
      .from("users")
      .select("account_id, role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only account owners can set up referral payouts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: account } = await supabase
      .from("accounts")
      .select("id, stripe_connect_id, email, name")
      .eq("id", userData.account_id)
      .single();

    if (!account) {
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const { return_url, refresh_url } = await req.json().catch(() => ({}));
    const origin = req.headers.get("origin") || "";

    let connectAccountId = account.stripe_connect_id;

    // Create Express account if none exists
    if (!connectAccountId) {
      const connectAccount = await stripe.accounts.create({
        type: "express",
        email: account.email,
        metadata: { account_id: account.id },
        capabilities: {
          transfers: { requested: true },
        },
      });

      connectAccountId = connectAccount.id;

      // Store connect account ID
      await supabase
        .from("accounts")
        .update({
          stripe_connect_id: connectAccountId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: refresh_url || `${origin}/referrals?connect=refresh`,
      return_url: return_url || `${origin}/referrals?connect=complete`,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, connect_id: connectAccountId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-connect-account error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
