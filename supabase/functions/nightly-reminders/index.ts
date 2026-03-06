// Edge Function: Nightly Reminders
// Scheduled: 8pm Mountain (2am UTC) via pg_cron
// Sends case_tomorrow notifications based on per-case reminder_offsets.
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

    const now = new Date();

    // Query all cases within the next 72 hours that aren't cancelled or paid
    const cutoff = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const todayStr = now.toISOString().split("T")[0];
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const { data: cases, error: casesError } = await supabase
      .from("cases")
      .select(
        "id, case_number, account_id, assigned_to, procedure_type, scheduled_date, scheduled_time, reminder_offsets, surgeon:surgeons(full_name), facility:facilities(name)"
      )
      .gte("scheduled_date", todayStr)
      .lte("scheduled_date", cutoffStr)
      .not("status", "in", '("cancelled","paid")');

    if (casesError) {
      console.error("Error fetching cases:", casesError);
      return new Response(JSON.stringify({ error: casesError.message }), { status: 500 });
    }

    if (!cases || cases.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming cases", sent: 0 }), { status: 200 });
    }

    let sent = 0;
    let skipped = 0;

    for (const c of cases) {
      // Calculate surgery datetime
      const dateStr = c.scheduled_date;
      const timeStr = c.scheduled_time || "08:00:00";
      const surgeryDate = new Date(`${dateStr}T${timeStr}`);
      const hoursUntil = (surgeryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Get reminder offsets (default [24])
      const offsets: number[] = c.reminder_offsets || [24];

      // Check each offset
      for (const offset of offsets) {
        // Fire if hours_until_surgery is within 1 hour of the offset
        // e.g. offset=24: fire when hoursUntil is 23-25
        if (hoursUntil < offset - 1 || hoursUntil > offset + 1) continue;

        // Get users to notify
        const { data: users } = await supabase
          .from("users")
          .select("id")
          .eq("account_id", c.account_id);

        if (!users || users.length === 0) continue;

        const targetUsers = c.assigned_to
          ? users.filter((u: { id: string }) => u.id === c.assigned_to)
          : users;

        const surgeonName = c.surgeon?.full_name || "Unknown surgeon";
        const facilityName = c.facility?.name || "";
        const timeDisplay = c.scheduled_time ? c.scheduled_time.slice(0, 5) : "";
        const isToday = hoursUntil < 12;
        const title = isToday ? "Case Today" : "Case Tomorrow";
        const body = `${timeDisplay ? timeDisplay + " — " : ""}${surgeonName}${facilityName ? ` at ${facilityName}` : ""}${c.procedure_type ? ` (${c.procedure_type})` : ""}`;

        for (const user of targetUsers) {
          const didSend = await sendPush(supabase, {
            account_id: c.account_id,
            user_id: user.id,
            type: "case_tomorrow",
            title,
            body,
            related_id: c.id,
            related_type: "case",
          });
          if (didSend) sent++;
          else skipped++;
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Nightly reminders sent", sent, skipped, total_cases: cases.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("nightly-reminders error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
