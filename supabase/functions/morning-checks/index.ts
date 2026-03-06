// Edge Function: Morning Checks
// Scheduled: 6am Mountain (12pm UTC) via pg_cron
// Checks: case_today, follow_up_due, promised_date_passed, escalation_recommended, po_overdue, commission_overdue
// Secrets required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPush, isDuplicate } from "../_shared/sendPush.ts";

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
    let sent = 0;
    let skipped = 0;

    // Fetch all accounts with their notification settings
    const { data: accounts } = await supabase
      .from("accounts")
      .select("id, escalation_threshold, po_overdue_grace_days, commission_overdue_grace_days, promised_date_grace_days");

    if (!accounts) {
      return new Response(JSON.stringify({ message: "No accounts", sent: 0 }), { status: 200 });
    }

    for (const account of accounts) {
      // Get users for this account
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("account_id", account.id);

      if (!users || users.length === 0) continue;

      // ──────────────────────────────────────────
      // CHECK 1 — Case Today
      // ──────────────────────────────────────────
      const { data: todayCases } = await supabase
        .from("cases")
        .select("id, case_number, assigned_to, scheduled_time, procedure_type, surgeon:surgeons(full_name), facility:facilities(name)")
        .eq("account_id", account.id)
        .eq("scheduled_date", today)
        .not("status", "in", '("cancelled","paid")');

      if (todayCases) {
        for (const c of todayCases) {
          const targetUsers = c.assigned_to
            ? users.filter((u: { id: string }) => u.id === c.assigned_to)
            : users;
          const surgeonName = c.surgeon?.full_name || "Unknown";
          const facilityName = c.facility?.name || "";
          const timeStr = c.scheduled_time ? c.scheduled_time.slice(0, 5) + " — " : "";
          const body = `${timeStr}${surgeonName}${facilityName ? ` at ${facilityName}` : ""}`;

          for (const user of targetUsers) {
            const didSend = await sendPush(supabase, {
              account_id: account.id,
              user_id: user.id,
              type: "case_tomorrow",
              title: "Case Today",
              body,
              related_id: c.id,
              related_type: "case",
            });
            if (didSend) sent++;
            else skipped++;
          }
        }
      }

      // ──────────────────────────────────────────
      // CHECK 2 — Follow-up Due
      // ──────────────────────────────────────────
      const { data: dueFollowUps } = await supabase
        .from("po_chase_log")
        .select("id, case_id, contact_name, created_by, case:cases(case_number, assigned_to)")
        .eq("account_id", account.id)
        .eq("follow_up_done", false)
        .lte("next_follow_up", today)
        .not("next_follow_up", "is", null);

      if (dueFollowUps) {
        for (const chase of dueFollowUps) {
          const userId = chase.case?.assigned_to || chase.created_by;
          if (!userId) continue;

          const didSend = await sendPush(supabase, {
            account_id: account.id,
            user_id: userId,
            type: "follow_up_due",
            title: "Follow-up Due",
            body: `Case ${chase.case?.case_number || "Unknown"} — ${chase.contact_name || "Contact"} follow-up overdue`,
            related_id: chase.case_id,
            related_type: "case",
          });
          if (didSend) sent++;
          else skipped++;
        }
      }

      // ──────────────────────────────────────────
      // CHECK 3 — Promised Date Passed
      // ──────────────────────────────────────────
      const graceDays = account.promised_date_grace_days || 0;
      const promisedCutoff = new Date();
      promisedCutoff.setDate(promisedCutoff.getDate() - graceDays);
      const promisedCutoffStr = promisedCutoff.toISOString().split("T")[0];

      const { data: passedPromises } = await supabase
        .from("po_chase_log")
        .select("id, case_id, promised_date, contact_name, created_by, case:cases(case_number, assigned_to), facility:cases(facility:facilities(name))")
        .eq("account_id", account.id)
        .lt("promised_date", promisedCutoffStr)
        .eq("follow_up_done", false)
        .not("promised_date", "is", null);

      if (passedPromises) {
        for (const chase of passedPromises) {
          const userId = chase.case?.assigned_to || chase.created_by;
          if (!userId) continue;

          const daysOverdue = Math.floor(
            (new Date(today).getTime() - new Date(chase.promised_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          const facilityName = (chase as any).facility?.facility?.name || "";
          const body = `Case ${chase.case?.case_number || "Unknown"} — ${facilityName ? facilityName + " promised" : "Promised"} PO by ${chase.promised_date}, ${daysOverdue} days overdue`;

          const didSend = await sendPush(supabase, {
            account_id: account.id,
            user_id: userId,
            type: "promised_date_passed",
            title: "Promised Date Passed",
            body,
            related_id: chase.case_id,
            related_type: "case",
          });
          if (didSend) sent++;
          else skipped++;
        }
      }

      // ──────────────────────────────────────────
      // CHECK 4 — Escalation Recommended
      // ──────────────────────────────────────────
      const threshold = account.escalation_threshold || 3;

      // Count open chase attempts per case
      const { data: openChases } = await supabase
        .from("po_chase_log")
        .select("case_id, case:cases(case_number, assigned_to)")
        .eq("account_id", account.id)
        .eq("follow_up_done", false);

      if (openChases) {
        const chaseCounts: Record<string, { count: number; case_number: string; assigned_to: string | null }> = {};
        for (const chase of openChases) {
          if (!chase.case_id) continue;
          if (!chaseCounts[chase.case_id]) {
            chaseCounts[chase.case_id] = {
              count: 0,
              case_number: chase.case?.case_number || "Unknown",
              assigned_to: chase.case?.assigned_to || null,
            };
          }
          chaseCounts[chase.case_id].count++;
        }

        // Check dedup: escalation_recommended in last 7 days
        const caseIds = Object.keys(chaseCounts).filter((id) => chaseCounts[id].count >= threshold);
        if (caseIds.length > 0) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const { data: existingNotifs } = await supabase
            .from("notifications")
            .select("related_id")
            .eq("account_id", account.id)
            .eq("type", "escalation_recommended")
            .in("related_id", caseIds)
            .gte("sent_at", sevenDaysAgo.toISOString());

          const alreadyNotified = new Set((existingNotifs || []).map((n: { related_id: string }) => n.related_id));

          for (const caseId of caseIds) {
            if (alreadyNotified.has(caseId)) {
              skipped++;
              continue;
            }
            const info = chaseCounts[caseId];
            const targetUsers = info.assigned_to
              ? users.filter((u: { id: string }) => u.id === info.assigned_to)
              : users;

            for (const user of targetUsers) {
              const didSend = await sendPush(supabase, {
                account_id: account.id,
                user_id: user.id,
                type: "escalation_recommended",
                title: "Escalation Recommended",
                body: `Case ${info.case_number} — ${info.count} chase attempts, consider escalating`,
                related_id: caseId,
                related_type: "case",
              });
              if (didSend) sent++;
              else skipped++;
            }
          }
        }
      }

      // ──────────────────────────────────────────
      // CHECK 5 — PO Overdue
      // ──────────────────────────────────────────
      const poGraceDays = account.po_overdue_grace_days || 0;
      const poCutoff = new Date();
      poCutoff.setDate(poCutoff.getDate() - poGraceDays);
      const poCutoffStr = poCutoff.toISOString().split("T")[0];

      const { data: overduePOs } = await supabase
        .from("purchase_orders")
        .select("id, po_number, invoice_number, amount, expected_payment_date, case_id, case:cases(case_number, assigned_to)")
        .eq("account_id", account.id)
        .lt("expected_payment_date", poCutoffStr)
        .not("status", "in", '("paid","received")');

      if (overduePOs) {
        for (const po of overduePOs) {
          const userId = po.case?.assigned_to || users.find((u: { id: string }) => u)?.id;
          if (!userId) continue;

          const daysOverdue = Math.floor(
            (new Date(today).getTime() - new Date(po.expected_payment_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          const amountStr = po.amount ? `$${Number(po.amount).toLocaleString()}` : "";
          const body = `Case ${po.case?.case_number || "Unknown"} — PO expected ${po.expected_payment_date}, ${daysOverdue} days overdue${amountStr ? `, ${amountStr}` : ""}`;

          const didSend = await sendPush(supabase, {
            account_id: account.id,
            user_id: userId,
            type: "po_overdue",
            title: "PO Overdue",
            body,
            related_id: po.id,
            related_type: "purchase_order",
          });
          if (didSend) sent++;
          else skipped++;
        }
      }

      // ──────────────────────────────────────────
      // CHECK 6 — Commission Overdue
      // ──────────────────────────────────────────
      const commGraceDays = account.commission_overdue_grace_days || 0;
      const commCutoff = new Date();
      commCutoff.setDate(commCutoff.getDate() - commGraceDays);
      const commCutoffStr = commCutoff.toISOString().split("T")[0];

      const { data: overdueComms } = await supabase
        .from("commissions")
        .select("id, expected_date, expected_amount, case_id, case:cases(case_number, assigned_to), distributor:distributors(name)")
        .eq("account_id", account.id)
        .lt("expected_date", commCutoffStr)
        .not("status", "in", '("received","written_off")');

      if (overdueComms) {
        for (const comm of overdueComms) {
          const userId = comm.case?.assigned_to || users.find((u: { id: string }) => u)?.id;
          if (!userId) continue;

          const daysOverdue = Math.floor(
            (new Date(today).getTime() - new Date(comm.expected_date).getTime()) / (1000 * 60 * 60 * 24)
          );
          const distName = comm.distributor?.name || "Distributor";
          const body = `Case ${comm.case?.case_number || "Unknown"} — ${distName} commission expected ${comm.expected_date}, ${daysOverdue} days overdue`;

          const didSend = await sendPush(supabase, {
            account_id: account.id,
            user_id: userId,
            type: "commission_overdue",
            title: "Commission Overdue",
            body,
            related_id: comm.id,
            related_type: "commission",
          });
          if (didSend) sent++;
          else skipped++;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Morning checks complete", sent, skipped }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("morning-checks error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
