// Edge Function: Morning Checks
// Scheduled: 6am Mountain (12pm UTC) via pg_cron
// Checks for: promised_date_passed, escalation_recommended, po_overdue
// Secrets required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotifications } from "../_shared/pushNotify.ts";

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!authHeader?.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];
    const notifications = [];

    // ──────────────────────────────────────────
    // 1. Promised date passed (chase log)
    // ──────────────────────────────────────────
    const { data: passedPromises } = await supabase
      .from("po_chase_log")
      .select("id, case_id, account_id, promised_date, contact_name, created_by, case:cases(case_number, assigned_to)")
      .lt("promised_date", today)
      .eq("follow_up_done", false)
      .not("promised_date", "is", null);

    if (passedPromises) {
      for (const chase of passedPromises) {
        const userId = chase.case?.assigned_to || chase.created_by;
        if (!userId) continue;

        notifications.push({
          account_id: chase.account_id,
          user_id: userId,
          type: "promised_date_passed",
          title: `Promised date passed: ${chase.case?.case_number || "Unknown"}`,
          body: `${chase.contact_name || "Contact"} promised by ${chase.promised_date}. Follow up needed.`,
          related_id: chase.case_id,
          related_type: "case",
        });
      }
    }

    // ──────────────────────────────────────────
    // 2. Escalation recommended
    // Uses accounts.escalation_threshold to detect cases stuck too long
    // ──────────────────────────────────────────
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, escalation_threshold");

    if (accounts) {
      for (const account of accounts) {
        const threshold = account.escalation_threshold || 3;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - threshold);
        const thresholdStr = thresholdDate.toISOString().split("T")[0];

        // Cases in po_requested status for longer than threshold with no chase activity
        const { data: stuckCases } = await supabase
          .from("cases")
          .select("id, case_number, assigned_to, updated_at")
          .eq("account_id", account.id)
          .eq("status", "po_requested")
          .lt("updated_at", thresholdStr + "T00:00:00Z");

        if (!stuckCases || stuckCases.length === 0) continue;

        // Get account users to notify
        const { data: users } = await supabase
          .from("users")
          .select("id")
          .eq("account_id", account.id);

        if (!users) continue;

        for (const c of stuckCases) {
          const targetUsers = c.assigned_to
            ? users.filter((u: { id: string }) => u.id === c.assigned_to)
            : users;

          for (const user of targetUsers) {
            notifications.push({
              account_id: account.id,
              user_id: user.id,
              type: "escalation_recommended",
              title: `Escalation recommended: ${c.case_number}`,
              body: `PO has been in requested status for ${threshold}+ days. Consider escalating.`,
              related_id: c.id,
              related_type: "case",
            });
          }
        }
      }
    }

    // ──────────────────────────────────────────
    // 3. PO overdue (expected_payment_date passed, not paid)
    // ──────────────────────────────────────────
    const { data: overduePOs } = await supabase
      .from("purchase_orders")
      .select("id, account_id, case_id, po_number, invoice_number, expected_payment_date, case:cases(case_number, assigned_to)")
      .lt("expected_payment_date", today)
      .not("status", "in", '("paid","disputed")');

    if (overduePOs) {
      for (const po of overduePOs) {
        const userId = po.case?.assigned_to;
        if (!userId) {
          // Get account owner
          const { data: users } = await supabase
            .from("users")
            .select("id")
            .eq("account_id", po.account_id)
            .eq("role", "owner")
            .limit(1);
          if (!users || users.length === 0) continue;

          notifications.push({
            account_id: po.account_id,
            user_id: users[0].id,
            type: "po_overdue",
            title: `PO overdue: ${po.po_number || po.invoice_number}`,
            body: `Expected payment by ${po.expected_payment_date}. Case: ${po.case?.case_number || "Unknown"}.`,
            related_id: po.id,
            related_type: "purchase_order",
          });
        } else {
          notifications.push({
            account_id: po.account_id,
            user_id: userId,
            type: "po_overdue",
            title: `PO overdue: ${po.po_number || po.invoice_number}`,
            body: `Expected payment by ${po.expected_payment_date}. Case: ${po.case?.case_number || "Unknown"}.`,
            related_id: po.id,
            related_type: "purchase_order",
          });
        }
      }
    }

    const result = await sendNotifications(supabase, notifications);

    return new Response(
      JSON.stringify({ message: "Morning checks complete", ...result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("morning-checks error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
