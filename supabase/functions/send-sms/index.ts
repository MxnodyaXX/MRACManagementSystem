// Supabase Edge Function: send-sms
// Holds the SMS gateway secret server-side and forwards the send to Text.lk.
//
// Deploy:   supabase functions deploy send-sms
// Secrets:  supabase secrets set TEXTLK_API_TOKEN=xxxx TEXTLK_SENDER_ID=TextLKDemo

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let to = "";
  let message = "";
  try {
    const body = await req.json();
    to = String(body.to ?? "").trim();
    message = String(body.message ?? "").trim();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!to || !message) return json({ error: "Missing 'to' or 'message'" }, 400);

  const apiToken = Deno.env.get("TEXTLK_API_TOKEN");
  const senderId = Deno.env.get("TEXTLK_SENDER_ID") ?? "TextLKDemo";
  if (!apiToken) return json({ error: "SMS gateway not configured (set TEXTLK_API_TOKEN secret)" }, 500);

  // ── Text.lk v3 send ─────────────────────────────────────────────
  try {
    const res = await fetch("https://app.text.lk/api/v3/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        recipient: to,        // 94XXXXXXXXX
        sender_id: senderId,
        type: "plain",
        message,
      }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && (data?.status === "success" || data?.status === true);
    return json({ ok, provider: data }, ok ? 200 : 502);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 502);
  }
});
