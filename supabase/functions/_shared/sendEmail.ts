// Shared email sending helper using Resend API
// Env: RESEND_API_KEY

const RESEND_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "MedRepDesk <notifications@medrepdesk.io>";

interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ id?: string; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return { error: "Email not configured" };
  }

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: Array.isArray(options.to) ? options.to : [options.to],
        ...(options.cc?.length && { cc: Array.isArray(options.cc) ? options.cc : [options.cc] }),
        subject: options.subject,
        html: options.html,
        text: options.text,
        reply_to: options.replyTo,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Resend API error:", err);
      return { error: err };
    }

    const data = await response.json();
    return { id: data.id };
  } catch (err) {
    console.error("Email send failed:", err);
    return { error: err.message };
  }
}

// ─── Email Templates ───────────────────────────────────

export function poChaseEmailHtml({
  caseNumber,
  invoiceNumber,
  facilityName,
  amount,
  daysOutstanding,
  repName,
}: {
  caseNumber: string;
  invoiceNumber: string;
  facilityName: string;
  amount: string;
  daysOutstanding: number;
  repName: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="border-bottom:2px solid #0F4C81;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="color:#0F4C81;font-size:20px;margin:0;">Purchase Order Follow-Up</h1>
    </div>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">Hello,</p>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
      I'm following up on the outstanding purchase order for the following case:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0 24px;">
      <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;color:#374151;width:40%;">Case Number</td><td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151;">${caseNumber}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Invoice Number</td><td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151;">${invoiceNumber}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Facility</td><td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151;">${facilityName}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Amount</td><td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151;">${amount}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;color:#374151;">Days Outstanding</td><td style="padding:8px 12px;border:1px solid #e5e7eb;color:#374151;font-weight:600;color:#dc2626;">${daysOutstanding} days</td></tr>
    </table>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
      Could you please provide an update on the status of this purchase order? I would appreciate any timeline for processing.
    </p>
    <p style="color:#374151;line-height:1.6;margin:0;">Thank you for your attention to this matter.</p>
    <p style="color:#374151;line-height:1.6;margin:16px 0 0;">Best regards,<br><strong>${repName}</strong></p>
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">Sent via MedRepDesk</p>
</div>
</body>
</html>`;
}

export function weeklyDigestEmailHtml({
  repName,
  digestContent,
  weekLabel,
}: {
  repName: string;
  digestContent: string;
  weekLabel: string;
}): string {
  // Convert markdown-like line breaks to HTML
  const htmlContent = digestContent
    .replace(/\n\n/g, '</p><p style="color:#374151;line-height:1.6;margin:0 0 12px;">')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="border-bottom:2px solid #0F4C81;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="color:#0F4C81;font-size:20px;margin:0;">Weekly Briefing</h1>
      <p style="color:#6b7280;font-size:13px;margin:4px 0 0;">${weekLabel}</p>
    </div>
    <p style="color:#374151;line-height:1.6;margin:0 0 12px;">Good morning ${repName},</p>
    <p style="color:#374151;line-height:1.6;margin:0 0 12px;">${htmlContent}</p>
    <div style="margin-top:24px;text-align:center;">
      <a href="https://medrepdesk.io" style="display:inline-block;background:#0F4C81;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Open MedRepDesk</a>
    </div>
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">Sent via MedRepDesk</p>
</div>
</body>
</html>`;
}

export function paymentFailedEmailHtml({ repName }: { repName: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="border-bottom:2px solid #dc2626;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="color:#dc2626;font-size:20px;margin:0;">Payment Failed</h1>
    </div>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">Hi ${repName},</p>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
      We were unable to process your latest subscription payment. Please update your payment method to avoid any interruption to your MedRepDesk service.
    </p>
    <div style="margin:24px 0;text-align:center;">
      <a href="https://medrepdesk.io/settings" style="display:inline-block;background:#0F4C81;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Update Payment Method</a>
    </div>
    <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0;">
      If you believe this is an error, please contact support.
    </p>
  </div>
  <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">Sent via MedRepDesk</p>
</div>
</body>
</html>`;
}
