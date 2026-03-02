// Edge Function: Nightly Reminders
// Scheduled: 8pm Mountain (2am UTC) via pg_cron
// Sends case_tomorrow notifications for cases scheduled the next day.
// Secrets required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotifications } from "../_shared/pushNotify.ts";

serve(async (req: Request) => {
  try {
    // Verify service role auth (from pg_cron)
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!authHeader?.includes(serviceRoleKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get tomorrow's date in UTC (the cron runs at 2am UTC = 8pm MT)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Find all cases scheduled tomorrow that aren't cancelled
    const { data: cases, error: casesError } = await supabase
      .from("cases")
      .select("id, case_number, account_id, assigned_to, procedure_type, scheduled_time, surgeon:surgeons(full_name), facility:facilities(name)")
      .eq("scheduled_date", tomorrowStr)
      .neq("status", "cancelled");

    if (casesError) {
      console.error("Error fetching cases:", casesError);
      return new Response(JSON.stringify({ error: casesError.message }), { status: 500 });
    }

    if (!cases || cases.length === 0) {
      return new Response(JSON.stringify({ message: "No cases tomorrow", sent: 0 }), { status: 200 });
    }

    // Group by account to find the right user(s) to notify
    const notifications = [];

    for (const c of cases) {
      // Find users for this account
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("account_id", c.account_id);

      if (!users || users.length === 0) continue;

      // Notify assigned user, or all account users if unassigned
      const targetUsers = c.assigned_to
        ? users.filter((u: { id: string }) => u.id === c.assigned_to)
        : users;

      const surgeonName = c.surgeon?.full_name || "Unknown surgeon";
      const facilityName = c.facility?.name || "";
      const timeStr = c.scheduled_time ? ` at ${c.scheduled_time.slice(0, 5)}` : "";

      for (const user of targetUsers) {
        notifications.push({
          account_id: c.account_id,
          user_id: user.id,
          type: "case_tomorrow",
          title: `Case tomorrow: ${c.case_number}`,
          body: `${surgeonName}${facilityName ? ` @ ${facilityName}` : ""}${timeStr} — ${c.procedure_type || "procedure"}`,
          related_id: c.id,
          related_type: "case",
        });
      }
    }

    const result = await sendNotifications(supabase, notifications);

    return new Response(
      JSON.stringify({ message: "Nightly reminders sent", ...result, total_cases: cases.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("nightly-reminders error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
