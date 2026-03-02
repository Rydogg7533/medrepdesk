// Edge Function: Monthly Referral Payouts
// Scheduled: 1st of month, 2am Mountain (8am UTC) via pg_cron
// Calculates 25% of each referred account's subscription amount,
// creates referral_payouts record, transfers via Stripe Connect.
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const PLAN_PRICES: Record<string, number> = {
  solo: 9900,        // $99 in cents
  assistant: 14900,  // $149 in cents
  distributorship: 24900, // $249 in cents
};

serve(async (req: Request) => {
  try {
    // Verify service role auth
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!authHeader?.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const now = new Date();
    const periodMonth = now.getUTCMonth() + 1; // 1-12
    const periodYear = now.getUTCFullYear();

    // Fetch active referrals that still have months remaining
    const { data: referrals, error: refError } = await supabase
      .from("referrals")
      .select(`
        id,
        referrer_account_id,
        referred_account_id,
        commission_rate,
        commission_months,
        months_paid,
        total_earned,
        referrer:accounts!referrer_account_id(stripe_connect_id),
        referred:accounts!referred_account_id(plan, sub_status)
      `)
      .eq("status", "active")
      .filter("months_paid", "lt", "commission_months");

    if (refError) {
      console.error("Error fetching referrals:", refError);
      return new Response(JSON.stringify({ error: refError.message }), { status: 500 });
    }

    if (!referrals || referrals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No eligible referrals", processed: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const ref of referrals) {
      const referrerConnectId = (ref.referrer as any)?.stripe_connect_id;
      const referredPlan = (ref.referred as any)?.plan;
      const referredStatus = (ref.referred as any)?.sub_status;

      // Skip if referred account isn't active
      if (referredStatus !== "active") {
        skipped++;
        continue;
      }

      // Skip if referrer has no Connect account
      if (!referrerConnectId) {
        skipped++;
        continue;
      }

      // Check for duplicate payout this period
      const { data: existing } = await supabase
        .from("referral_payouts")
        .select("id")
        .eq("referral_id", ref.id)
        .eq("period_month", periodMonth)
        .eq("period_year", periodYear)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Calculate payout
      const subscriptionAmountCents = PLAN_PRICES[referredPlan] || PLAN_PRICES.solo;
      const subscriptionAmount = subscriptionAmountCents / 100;
      const commissionRate = Number(ref.commission_rate) || 0.25;
      const commissionAmountCents = Math.round(subscriptionAmountCents * commissionRate);
      const commissionAmount = commissionAmountCents / 100;

      // Create payout record (pending)
      const { data: payout, error: payoutError } = await supabase
        .from("referral_payouts")
        .insert({
          referral_id: ref.id,
          referrer_account_id: ref.referrer_account_id,
          period_month: periodMonth,
          period_year: periodYear,
          subscription_amount: subscriptionAmount,
          commission_amount: commissionAmount,
          status: "pending",
        })
        .select()
        .single();

      if (payoutError) {
        console.error(`Payout insert failed for referral ${ref.id}:`, payoutError);
        failed++;
        continue;
      }

      // Transfer via Stripe Connect
      try {
        const transfer = await stripe.transfers.create({
          amount: commissionAmountCents,
          currency: "usd",
          destination: referrerConnectId,
          description: `MedRepDesk referral payout ${periodMonth}/${periodYear}`,
          metadata: {
            referral_id: ref.id,
            payout_id: payout.id,
            period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
          },
        });

        // Mark payout as paid
        await supabase
          .from("referral_payouts")
          .update({
            status: "paid",
            stripe_transfer_id: transfer.id,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout.id);

        // Update referral totals
        const newMonthsPaid = (ref.months_paid || 0) + 1;
        const newTotalEarned = Number(ref.total_earned || 0) + commissionAmount;

        await supabase
          .from("referrals")
          .update({
            months_paid: newMonthsPaid,
            total_earned: newTotalEarned,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ref.id);

        // Send payout_sent notification to referrer
        const { data: referrerOwner } = await supabase
          .from("users")
          .select("id")
          .eq("account_id", ref.referrer_account_id)
          .eq("role", "owner")
          .single();

        if (referrerOwner) {
          await supabase.from("notifications").insert({
            account_id: ref.referrer_account_id,
            user_id: referrerOwner.id,
            type: "payout_sent",
            title: "Referral payout sent",
            body: `$${commissionAmount.toFixed(2)} transferred to your account for ${periodMonth}/${periodYear}.`,
          });
        }

        processed++;
      } catch (stripeErr) {
        console.error(`Stripe transfer failed for referral ${ref.id}:`, stripeErr);

        // Mark payout as failed
        await supabase
          .from("referral_payouts")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout.id);

        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Monthly payouts complete",
        period: `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
        processed,
        skipped,
        failed,
        total: referrals.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("monthly-payouts error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
