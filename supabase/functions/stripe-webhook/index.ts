// Edge Function: Stripe Webhook Handler
// Handles all Stripe subscription lifecycle events.
// Validates webhook signature on every event.
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

serve(async (req: Request) => {
  // Webhooks are POST only — no CORS needed (server-to-server)
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2023-10-16",
  });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Verify webhook signature
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(
      JSON.stringify({ error: `Webhook Error: ${err.message}` }),
      { status: 400 }
    );
  }

  console.log(`Stripe event received: ${event.type} [${event.id}]`);

  try {
    switch (event.type) {
      // ─────────────────────────────────────────
      // CHECKOUT COMPLETED
      // ─────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const accountId = session.metadata?.account_id;
        const plan = session.metadata?.plan;

        if (!accountId) {
          console.error("No account_id in checkout session metadata");
          break;
        }

        const updates: Record<string, unknown> = {
          stripe_customer_id: session.customer as string,
          stripe_sub_id: session.subscription as string,
          sub_status: "active",
          updated_at: new Date().toISOString(),
        };

        if (plan && ["solo", "assistant", "distributorship"].includes(plan)) {
          updates.plan = plan;
        }

        await supabase
          .from("accounts")
          .update(updates)
          .eq("id", accountId);

        console.log(`Checkout complete: account=${accountId} plan=${plan}`);
        break;
      }

      // ─────────────────────────────────────────
      // SUBSCRIPTION CREATED
      // ─────────────────────────────────────────
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const accountId = subscription.metadata?.account_id;

        if (!accountId) break;

        await supabase
          .from("accounts")
          .update({
            stripe_sub_id: subscription.id,
            sub_status: mapSubStatus(subscription.status),
            updated_at: new Date().toISOString(),
          })
          .eq("id", accountId);

        console.log(`Subscription created: account=${accountId} status=${subscription.status}`);
        break;
      }

      // ─────────────────────────────────────────
      // SUBSCRIPTION UPDATED (plan change, status change)
      // ─────────────────────────────────────────
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        // Find account by stripe_sub_id
        const { data: account } = await supabase
          .from("accounts")
          .select("id")
          .eq("stripe_sub_id", subscription.id)
          .single();

        if (!account) {
          // Try metadata fallback
          const metaAccountId = subscription.metadata?.account_id;
          if (metaAccountId) {
            await supabase
              .from("accounts")
              .update({
                sub_status: mapSubStatus(subscription.status),
                updated_at: new Date().toISOString(),
              })
              .eq("id", metaAccountId);
          }
          break;
        }

        const updates: Record<string, unknown> = {
          sub_status: mapSubStatus(subscription.status),
          updated_at: new Date().toISOString(),
        };

        // Detect plan change via price ID
        const priceId = subscription.items?.data?.[0]?.price?.id;
        if (priceId) {
          const plan = priceIdToPlan(priceId);
          if (plan) updates.plan = plan;
        }

        await supabase
          .from("accounts")
          .update(updates)
          .eq("id", account.id);

        console.log(`Subscription updated: account=${account.id} status=${subscription.status}`);
        break;
      }

      // ─────────────────────────────────────────
      // SUBSCRIPTION DELETED (canceled)
      // ─────────────────────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: account } = await supabase
          .from("accounts")
          .select("id")
          .eq("stripe_sub_id", subscription.id)
          .single();

        if (account) {
          await supabase
            .from("accounts")
            .update({
              sub_status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);

          // Insert notification for account owner
          const { data: owner } = await supabase
            .from("users")
            .select("id")
            .eq("account_id", account.id)
            .eq("role", "owner")
            .single();

          if (owner) {
            await supabase.from("notifications").insert({
              account_id: account.id,
              user_id: owner.id,
              type: "payment_failed",
              title: "Subscription canceled",
              body: "Your subscription has been canceled. Resubscribe to continue using MedRepDesk.",
            });
          }

          console.log(`Subscription deleted: account=${account.id}`);
        }
        break;
      }

      // ─────────────────────────────────────────
      // INVOICE PAYMENT SUCCEEDED
      // ─────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const { data: account } = await supabase
          .from("accounts")
          .select("id")
          .eq("stripe_sub_id", invoice.subscription as string)
          .single();

        if (account) {
          await supabase
            .from("accounts")
            .update({
              sub_status: "active",
              // Reset monthly AI counters on new billing cycle
              ai_extractions_this_month: 0,
              ai_digest_this_month: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);

          console.log(`Payment succeeded: account=${account.id}`);
        }
        break;
      }

      // ─────────────────────────────────────────
      // INVOICE PAYMENT FAILED
      // ─────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const { data: account } = await supabase
          .from("accounts")
          .select("id")
          .eq("stripe_sub_id", invoice.subscription as string)
          .single();

        if (account) {
          await supabase
            .from("accounts")
            .update({
              sub_status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);

          // Notify account owner
          const { data: owner } = await supabase
            .from("users")
            .select("id")
            .eq("account_id", account.id)
            .eq("role", "owner")
            .single();

          if (owner) {
            await supabase.from("notifications").insert({
              account_id: account.id,
              user_id: owner.id,
              type: "payment_failed",
              title: "Payment failed",
              body: "Your latest payment failed. Please update your payment method to avoid service interruption.",
            });
          }

          console.log(`Payment failed: account=${account.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err);
    // Return 200 to prevent Stripe retries for processing errors
    return new Response(JSON.stringify({ received: true, error: err.message }), { status: 200 });
  }
});

// ─── Helpers ─────────────────────────────────────────

function mapSubStatus(stripeStatus: string): string {
  const mapping: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    paused: "active",
  };
  return mapping[stripeStatus] || "active";
}

function priceIdToPlan(priceId: string): string | null {
  const solo = Deno.env.get("STRIPE_PRICE_SOLO");
  const assistant = Deno.env.get("STRIPE_PRICE_ASSISTANT");
  const distributorship = Deno.env.get("STRIPE_PRICE_DISTRIBUTORSHIP");

  if (priceId === solo) return "solo";
  if (priceId === assistant) return "assistant";
  if (priceId === distributorship) return "distributorship";
  return null;
}
