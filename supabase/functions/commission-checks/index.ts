// Edge Function: Commission Checks
// Scheduled: 7am Mountain (1pm UTC) via pg_cron
// Checks for commissions where expected_date has passed and status is still pending.
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

    // Find overdue commissions: expected_date passed, status still pending
    const { data: overdueCommissions, error } = await supabase
      .from("commissions")
      .select("id, account_id, case_id, expected_amount, expected_date, distributor:distributors(name), case:cases(case_number, assigned_to)")
      .eq("status", "pending")
      .lt("expected_date", today)
      .not("expected_date", "is", null);

    if (error) {
      console.error("Error fetching commissions:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!overdueCommissions || overdueCommissions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No overdue commissions", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const notifications = [];

    for (const comm of overdueCommissions) {
      // Get the user to notify — assigned user or account owner
      let userId = comm.case?.assigned_to;

      if (!userId) {
        const { data: users } = await supabase
          .from("users")
          .select("id")
          .eq("account_id", comm.account_id)
          .eq("role", "owner")
          .limit(1);

        if (!users || users.length === 0) continue;
        userId = users[0].id;
      }

      const distributorName = comm.distributor?.name || "Unknown distributor";
      const amount = comm.expected_amount
        ? `$${Number(comm.expected_amount).toFixed(2)}`
        : "unknown amount";

      notifications.push({
        account_id: comm.account_id,
        user_id: userId,
        type: "commission_overdue",
        title: `Commission overdue: ${comm.case?.case_number || "Unknown"}`,
        body: `${amount} from ${distributorName} was expected by ${comm.expected_date}.`,
        related_id: comm.id,
        related_type: "commission",
      });
    }

    const result = await sendNotifications(supabase, notifications);

    return new Response(
      JSON.stringify({ message: "Commission checks complete", ...result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("commission-checks error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
