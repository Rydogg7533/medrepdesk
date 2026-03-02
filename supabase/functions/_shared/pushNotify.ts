// Shared push notification helper for Edge Functions
// Sends web push notifications and inserts into notifications table.
// Respects user notification_preferences and notification_delivery.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NotificationPayload {
  account_id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_id?: string;
  related_type?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Web Push requires signing with VAPID keys using the Web Crypto API
async function importVapidKey(base64Key: string): Promise<CryptoKey> {
  const padding = "=".repeat((4 - (base64Key.length % 4)) % 4);
  const base64 = (base64Key + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwt(payload: Record<string, unknown>, privateKeyPem: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import PKCS8 private key
  const pemBody = privateKeyPem
    .replace(/-----BEGIN EC PRIVATE KEY-----/, "")
    .replace(/-----END EC PRIVATE KEY-----/, "")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput)
  );

  // Convert DER signature to raw r||s format for JWT
  const sigArray = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigArray.length === 64) {
    rawSig = sigArray;
  } else {
    // DER format: parse r and s
    const r = parseDerInt(sigArray, 3);
    const sOffset = 3 + sigArray[3] + 2;
    const s = parseDerInt(sigArray, sOffset);
    rawSig = new Uint8Array(64);
    rawSig.set(padTo32(r), 0);
    rawSig.set(padTo32(s), 32);
  }

  const sigB64 = base64UrlEncode(rawSig);
  return `${signingInput}.${sigB64}`;
}

function parseDerInt(buf: Uint8Array, offset: number): Uint8Array {
  const len = buf[offset];
  return buf.slice(offset + 1, offset + 1 + len);
}

function padTo32(buf: Uint8Array): Uint8Array {
  if (buf.length === 32) return buf;
  if (buf.length > 32) return buf.slice(buf.length - 32);
  const padded = new Uint8Array(32);
  padded.set(buf, 32 - buf.length);
  return padded;
}

async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<boolean> {
  try {
    const audience = new URL(subscription.endpoint).origin;
    const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 12;

    const jwt = await signJwt(
      { aud: audience, exp: expiry, sub: vapidSubject },
      vapidPrivateKey
    );

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: payload,
    });

    return response.ok || response.status === 201;
  } catch (err) {
    console.error("Web push send failed:", err);
    return false;
  }
}

export async function sendNotifications(
  supabase: ReturnType<typeof createClient>,
  notifications: NotificationPayload[]
): Promise<{ sent: number; skipped: number }> {
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:notifications@medrepdesk.com";

  let sent = 0;
  let skipped = 0;

  for (const notification of notifications) {
    // Fetch user's preferences
    const { data: user } = await supabase
      .from("users")
      .select("notification_preferences, notification_delivery")
      .eq("id", notification.user_id)
      .single();

    if (!user) {
      skipped++;
      continue;
    }

    const prefs = user.notification_preferences || {};
    const delivery = user.notification_delivery || {};

    // Check if notification type is enabled
    if (prefs[notification.type] === false) {
      skipped++;
      continue;
    }

    // Always insert into notifications table
    await supabase.from("notifications").insert({
      account_id: notification.account_id,
      user_id: notification.user_id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      related_id: notification.related_id || null,
      related_type: notification.related_type || null,
    });

    // Send push if delivery method includes push
    const deliveryMethod = delivery[notification.type] || "push";
    if (
      (deliveryMethod === "push" || deliveryMethod === "both") &&
      vapidPublicKey &&
      vapidPrivateKey
    ) {
      // Get user's push subscriptions
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", notification.user_id);

      if (subscriptions && subscriptions.length > 0) {
        const pushPayload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          type: notification.type,
          related_id: notification.related_id,
          related_type: notification.related_type,
        });

        for (const sub of subscriptions) {
          const subData = sub.subscription as PushSubscription;
          if (subData?.endpoint) {
            await sendWebPush(subData, pushPayload, vapidPublicKey, vapidPrivateKey, vapidSubject);
          }
        }
      }
    }

    sent++;
  }

  return { sent, skipped };
}
