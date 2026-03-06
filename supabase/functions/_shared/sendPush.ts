// Shared helper: send a single push notification with deduplication.
// Checks notifications table for recent duplicates before sending.
// Handles expired subscriptions (410 Gone) by deleting them.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendNotifications } from "./pushNotify.ts";

interface SendPushParams {
  user_id: string;
  account_id: string;
  type: string;
  title: string;
  body: string;
  related_id?: string;
  related_type?: string;
}

/**
 * Check if a notification of the same type + related_id was sent
 * to this user in the last 23 hours.
 */
export async function isDuplicate(
  supabase: ReturnType<typeof createClient>,
  user_id: string,
  type: string,
  related_id?: string
): Promise<boolean> {
  if (!related_id) return false;

  const cutoff = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", user_id)
    .eq("type", type)
    .eq("related_id", related_id)
    .gte("sent_at", cutoff)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Send a push notification with deduplication.
 * Returns true if sent, false if skipped (duplicate or preferences).
 */
export async function sendPush(
  supabase: ReturnType<typeof createClient>,
  params: SendPushParams
): Promise<boolean> {
  // Dedup check
  const dup = await isDuplicate(
    supabase,
    params.user_id,
    params.type,
    params.related_id
  );
  if (dup) return false;

  // Check account-level notification toggle
  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", params.account_id)
    .single();

  if (account) {
    const toggleKey = `notify_${params.type}` as string;
    if (account[toggleKey] === false) return false;
  }

  const result = await sendNotifications(supabase, [
    {
      account_id: params.account_id,
      user_id: params.user_id,
      type: params.type,
      title: params.title,
      body: params.body,
      related_id: params.related_id,
      related_type: params.related_type,
    },
  ]);

  return result.sent > 0;
}
