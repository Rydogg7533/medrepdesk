// Edge Function: Send PO Email
// Sends purchase order details to manufacturer/distributor via Resend
// Secrets required: RESEND_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/sendEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const lines = escaped.split("\n");
  const body = lines.map((l) => (l.trim() === "" ? "<br>" : `<p style="color:#374151;line-height:1.6;margin:0 0 4px;">${l}</p>`)).join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="border-bottom:2px solid #0F4C81;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="color:#0F4C81;font-size:20px;margin:0;">Purchase Order</h1>
    </div>
    ${body}
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">Sent via MedRepDesk</p>
</div>
</body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const { to, cc, subject, body, po_id, storage_path } = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "to, subject, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toArray = Array.isArray(to) ? to : [to];
    const ccArray = (Array.isArray(cc) ? cc : cc ? [cc] : []).filter(Boolean);

    // Send email via Resend
    const result = await sendEmail({
      to: toArray,
      cc: ccArray.length > 0 ? ccArray : undefined,
      subject,
      html: textToHtml(body),
      text: body,
    });

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-po-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
