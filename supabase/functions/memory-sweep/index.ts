import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANALYSIS_PROMPT = `You analyze a medical device sales rep's activity data and identify patterns worth storing as memories for their AI voice assistant.

Return ONLY a JSON array. No markdown, no explanation.

Each object: { "key": "snake_case_id", "value": "what to remember", "memory_type": "preference|pattern|shortcut|workflow" }

Rules:
- Only output genuinely useful behavioral patterns
- Skip anything already in existing_memories
- Maximum 5 memories per sweep
- Return [] if nothing meaningful found
- Focus on: most-used surgeons, facilities, common procedures, chase habits, scheduling patterns

Good examples:
{ "key": "most_used_facility", "value": "Garfield Medical Center is the most-used facility", "memory_type": "pattern" }
{ "key": "primary_surgeon", "value": "Dr. Anthony Clark is the primary surgeon (12 cases this month)", "memory_type": "pattern" }
{ "key": "preferred_chase_action", "value": "Usually follows up via phone call", "memory_type": "preference" }
{ "key": "typical_case_value", "value": "Average case value is around $3,500", "memory_type": "pattern" }
{ "key": "busy_day", "value": "Most cases are scheduled on Tuesdays and Thursdays", "memory_type": "pattern" }`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get active accounts with assistant+ plans
    const { data: accounts, error: accErr } = await supabase
      .from("accounts")
      .select("id, plan")
      .in("plan", ["assistant", "distributorship"])
      .in("sub_status", ["active", "trialing"]);

    if (accErr) throw accErr;
    if (!accounts?.length) {
      return new Response(
        JSON.stringify({ message: "No eligible accounts", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let processed = 0;
    let memoriesCreated = 0;

    for (const account of accounts) {
      // Get users for this account
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("account_id", account.id);

      if (!users?.length) continue;

      for (const user of users) {
        try {
          // Fetch recent activity
          const [casesRes, chaseRes, commsRes, existingMemRes] = await Promise.all([
            supabase
              .from("cases")
              .select("procedure_type, scheduled_date, case_value, status, surgeon:surgeons(full_name), facility:facilities(name), distributor:distributors(name)")
              .eq("account_id", account.id)
              .gte("created_at", thirtyDaysAgo)
              .order("created_at", { ascending: false })
              .limit(50),
            supabase
              .from("po_chase_log")
              .select("chase_type, action_taken, outcome")
              .eq("account_id", account.id)
              .gte("created_at", thirtyDaysAgo)
              .limit(50),
            supabase
              .from("communications")
              .select("comm_type, direction, contact_name")
              .eq("account_id", account.id)
              .gte("created_at", thirtyDaysAgo)
              .limit(50),
            supabase
              .from("agent_memory")
              .select("key, value, memory_type")
              .eq("user_id", user.id),
          ]);

          const cases = casesRes.data || [];
          const chases = chaseRes.data || [];
          const comms = commsRes.data || [];
          const existingMemories = existingMemRes.data || [];

          // Skip if no activity
          if (cases.length === 0 && chases.length === 0 && comms.length === 0) continue;

          const activitySummary = JSON.stringify({
            cases_last_30_days: cases.map((c) => ({
              procedure: c.procedure_type,
              date: c.scheduled_date,
              value: c.case_value,
              status: c.status,
              surgeon: c.surgeon?.full_name,
              facility: c.facility?.name,
              distributor: c.distributor?.name,
            })),
            chase_activity: chases.map((c) => ({
              type: c.chase_type,
              action: c.action_taken,
              outcome: c.outcome,
            })),
            communications: comms.map((c) => ({
              type: c.comm_type,
              direction: c.direction,
              contact: c.contact_name,
            })),
            existing_memories: existingMemories.map((m) => ({
              key: m.key,
              value: m.value,
              type: m.memory_type,
            })),
          });

          // Call Claude to analyze
          const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 512,
              system: ANALYSIS_PROMPT,
              messages: [{ role: "user", content: activitySummary }],
            }),
          });

          if (!anthropicRes.ok) {
            console.error("memory-sweep: Anthropic error for user", user.id, await anthropicRes.text());
            continue;
          }

          const anthropicData = await anthropicRes.json();
          const rawText = anthropicData.content?.[0]?.text || "[]";

          let newMemories: Array<{ key: string; value: string; memory_type: string }>;
          try {
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            newMemories = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
          } catch {
            console.error("memory-sweep: Failed to parse response for user", user.id);
            continue;
          }

          // Upsert memories
          for (const mem of newMemories) {
            if (!mem.key || !mem.value || !mem.memory_type) continue;

            const { error: upsertErr } = await supabase
              .from("agent_memory")
              .upsert({
                account_id: account.id,
                user_id: user.id,
                memory_type: mem.memory_type,
                key: mem.key,
                value: mem.value,
                source: "implicit",
                confidence: 0.7,
                updated_at: new Date().toISOString(),
              }, { onConflict: "user_id,key" });

            if (upsertErr) {
              console.error("memory-sweep: upsert error:", upsertErr.message);
            } else {
              memoriesCreated++;
            }
          }

          processed++;
        } catch (userErr) {
          console.error("memory-sweep: error processing user", user.id, userErr);
        }
      }
    }

    return new Response(
      JSON.stringify({ message: "Sweep complete", processed, memoriesCreated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("memory-sweep error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
