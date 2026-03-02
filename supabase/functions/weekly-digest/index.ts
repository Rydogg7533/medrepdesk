// Edge Function: Weekly Digest
// Scheduled: Sunday 8pm Mountain (Monday 2am UTC) via pg_cron
// AI-powered Monday morning briefing using Anthropic API.
// Respects accounts.digest_enabled, digest_days, digest_time.
// Secrets: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotifications } from "../_shared/pushNotify.ts";
import { sendEmail, weeklyDigestEmailHtml } from "../_shared/sendEmail.ts";

const PLAN_DIGEST_LIMITS: Record<string, number> = {
  solo: 4,
  assistant: 8,
  distributorship: 999, // unlimited
};

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!authHeader?.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun...6=Sat

    // Fetch accounts with digest enabled
    const { data: accounts, error: accError } = await supabase
      .from("accounts")
      .select("id, name, plan, digest_enabled, digest_days, ai_digest_this_month")
      .eq("digest_enabled", true)
      .in("sub_status", ["active", "trialing"]);

    if (accError) {
      console.error("Error fetching accounts:", accError);
      return new Response(JSON.stringify({ error: accError.message }), { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ message: "No accounts eligible", sent: 0 }), { status: 200 });
    }

    let processed = 0;
    let skipped = 0;

    for (const account of accounts) {
      // Check digest_days preference
      const digestDays: number[] = account.digest_days || [1]; // default Monday
      if (!digestDays.includes(dayOfWeek)) {
        skipped++;
        continue;
      }

      // Check AI digest limit
      const limit = PLAN_DIGEST_LIMITS[account.plan] || 4;
      if (account.ai_digest_this_month >= limit) {
        skipped++;
        continue;
      }

      // Get owner user
      const { data: owner } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("account_id", account.id)
        .eq("role", "owner")
        .single();

      if (!owner) {
        skipped++;
        continue;
      }

      // Gather data for digest
      const weekStart = new Date(now);
      weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekEndStr = weekEnd.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      // Upcoming cases this week
      const { data: upcomingCases } = await supabase
        .from("cases")
        .select("case_number, scheduled_date, scheduled_time, procedure_type, status, surgeon:surgeons(full_name), facility:facilities(name)")
        .eq("account_id", account.id)
        .gte("scheduled_date", weekStartStr)
        .lte("scheduled_date", weekEndStr)
        .neq("status", "cancelled")
        .order("scheduled_date");

      // Overdue POs
      const { data: overduePOs } = await supabase
        .from("purchase_orders")
        .select("po_number, invoice_number, amount, expected_payment_date, case:cases(case_number)")
        .eq("account_id", account.id)
        .lt("expected_payment_date", todayStr)
        .not("status", "in", '("paid","disputed")');

      // Pending follow-ups
      const { data: pendingFollowUps } = await supabase
        .from("po_chase_log")
        .select("next_follow_up, contact_name, case:cases(case_number)")
        .eq("account_id", account.id)
        .eq("follow_up_done", false)
        .lte("next_follow_up", weekEndStr)
        .not("next_follow_up", "is", null);

      // Commission status
      const { data: pendingCommissions } = await supabase
        .from("commissions")
        .select("expected_amount, expected_date, status, case:cases(case_number)")
        .eq("account_id", account.id)
        .in("status", ["pending", "confirmed"]);

      // Referral earnings
      const { data: referrals } = await supabase
        .from("referrals")
        .select("total_earned, months_paid, commission_months, status")
        .eq("referrer_account_id", account.id)
        .eq("status", "active");

      // Build prompt
      const caseSummary = (upcomingCases || []).map((c: any) =>
        `- ${c.case_number}: ${c.surgeon?.full_name || "TBD"} @ ${c.facility?.name || "TBD"}, ${c.scheduled_date}${c.scheduled_time ? " " + c.scheduled_time.slice(0, 5) : ""}, ${c.procedure_type || "procedure"} (${c.status})`
      ).join("\n") || "No cases this week.";

      const poSummary = (overduePOs || []).map((p: any) =>
        `- ${p.po_number || p.invoice_number}: $${p.amount || "?"} for case ${p.case?.case_number || "?"}, expected by ${p.expected_payment_date}`
      ).join("\n") || "No overdue POs.";

      const followUpSummary = (pendingFollowUps || []).map((f: any) =>
        `- ${f.case?.case_number || "?"}: follow up with ${f.contact_name || "contact"} by ${f.next_follow_up}`
      ).join("\n") || "No pending follow-ups.";

      const commissionSummary = (pendingCommissions || []).length > 0
        ? `${pendingCommissions.length} pending/confirmed commissions totaling $${pendingCommissions.reduce((s: number, c: any) => s + Number(c.expected_amount || 0), 0).toFixed(2)}`
        : "No pending commissions.";

      const referralSummary = (referrals || []).length > 0
        ? `${referrals.length} active referrals, $${referrals.reduce((s: number, r: any) => s + Number(r.total_earned || 0), 0).toFixed(2)} total earned`
        : "No active referrals.";

      const prompt = `You are a concise, professional AI assistant for a medical device sales rep named ${owner.full_name || "there"}.
Write a brief Monday morning briefing for the week of ${weekStartStr}. Be direct, actionable, and encouraging. Use short paragraphs and bullet points.

Data:

UPCOMING CASES THIS WEEK:
${caseSummary}

OVERDUE PURCHASE ORDERS:
${poSummary}

PENDING FOLLOW-UPS:
${followUpSummary}

COMMISSION STATUS:
${commissionSummary}

REFERRAL EARNINGS:
${referralSummary}

Write 3-5 short paragraphs: week overview, key priorities, action items. Keep it under 300 words. No greeting or sign-off.`;

      // Call Anthropic
      const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!aiResponse.ok) {
        console.error(`AI call failed for account ${account.id}:`, await aiResponse.text());
        skipped++;
        continue;
      }

      const aiData = await aiResponse.json();
      const digestContent = aiData.content?.[0]?.text || "Unable to generate digest this week.";

      // Increment ai_digest_this_month
      await supabase
        .from("accounts")
        .update({ ai_digest_this_month: (account.ai_digest_this_month || 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", account.id);

      // Insert notification
      await sendNotifications(supabase, [{
        account_id: account.id,
        user_id: owner.id,
        type: "weekly_digest",
        title: `Weekly Briefing — ${weekStartStr}`,
        body: digestContent.slice(0, 500),
      }]);

      // Send email
      const weekLabel = `Week of ${new Date(weekStartStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
      await sendEmail({
        to: owner.email,
        subject: `Your MedRepDesk Weekly Briefing — ${weekLabel}`,
        html: weeklyDigestEmailHtml({
          repName: owner.full_name || "there",
          digestContent,
          weekLabel,
        }),
        text: digestContent,
      });

      processed++;
    }

    return new Response(
      JSON.stringify({ message: "Weekly digest complete", processed, skipped }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("weekly-digest error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
