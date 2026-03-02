// Edge Function: PO Document Extraction
// Secrets required: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_LIMITS: Record<string, number> = {
  solo: 50,
  assistant: 100,
  distributorship: 500,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    // Create authenticated client to verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { image_base64, account_id, case_id } = await req.json();

    if (!image_base64 || !account_id) {
      return new Response(
        JSON.stringify({ error: "image_base64 and account_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check plan limits
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("plan, ai_extractions_this_month")
      .eq("id", account_id)
      .single();

    if (accountError || !account) {
      return new Response(
        JSON.stringify({ error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = PLAN_LIMITS[account.plan] || 50;
    if (account.ai_extractions_this_month >= limit) {
      return new Response(
        JSON.stringify({
          error: "AI extraction limit reached",
          limit,
          used: account.ai_extractions_this_month,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Send image to Anthropic API with vision
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: image_base64,
                },
              },
              {
                type: "text",
                text: `You are a document data extraction assistant for medical device purchase orders.
Extract the following fields from this purchase order image. Return ONLY valid JSON with no other text.
{
  "po_number": "string or null",
  "amount": "number or null (total dollar amount)",
  "issue_date": "string ISO date or null",
  "facility_name": "string or null",
  "payment_terms": "string or null (e.g. 'Net 30')",
  "invoice_number": "string or null",
  "vendor_name": "string or null"
}
If a field cannot be determined, set it to null.`,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text();
      console.error("Anthropic API error:", errBody);
      return new Response(
        JSON.stringify({ error: "AI extraction failed" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = anthropicData.content?.[0]?.text || "";

    // 4. Parse response — extract JSON from response
    let extracted;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      extracted = {};
    }

    // 5. Log extraction in ai_extractions table
    await supabase.from("ai_extractions").insert({
      account_id,
      extraction_type: "po_document",
      input_type: "image",
      raw_response: anthropicData,
      extracted_fields: extracted,
    });

    // 6. Increment account's ai_extractions_this_month
    await supabase.rpc("increment_ai_extractions", { p_account_id: account_id }).catch(() => {
      // Fallback: direct update if RPC doesn't exist
      return supabase
        .from("accounts")
        .update({ ai_extractions_this_month: account.ai_extractions_this_month + 1 })
        .eq("id", account_id);
    });

    // 7. Upload image to storage if case_id provided
    let storagePath = null;
    if (case_id) {
      const docId = crypto.randomUUID();
      storagePath = `${account_id}/${case_id}/${docId}/po_photo.jpg`;

      // Decode base64 and upload
      const binaryStr = atob(image_base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      await supabase.storage
        .from("case-documents")
        .upload(storagePath, bytes, { contentType: "image/jpeg" });

      // Create case_documents record
      await supabase.from("case_documents").insert({
        account_id,
        case_id,
        document_type: "po_photo",
        file_name: "po_photo.jpg",
        storage_path: storagePath,
        ai_extracted: true,
        extracted_data: extracted,
        created_by: user.id,
      });
    }

    // 8. Return extracted fields
    return new Response(
      JSON.stringify({
        ...extracted,
        raw_text: rawText,
        storage_path: storagePath,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("extract-po error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
