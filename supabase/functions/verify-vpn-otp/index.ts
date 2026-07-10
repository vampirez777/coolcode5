// Verifies a 6-digit VPN OTP code. Does NOT create or touch auth.users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string; code?: string } = {};
  try { body = await req.json(); } catch { /* */ }
  const email = (body.email || "").trim().toLowerCase();
  const code = (body.code || "").trim();
  if (!email || !/^\d{6}$/.test(code)) {
    return new Response(JSON.stringify({ success: false, error: "invalid_input" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(url, key);
  const ipHash = (await sha256((getClientIp(req) || "") + "|hmm-salt")).slice(0, 32);
  const emailHash = await sha256(email);
  const codeHash = await sha256(code + "|" + emailHash);

  const { data: rows } = await admin
    .from("vpn_otp_codes")
    .select("id, attempts, consumed, expires_at, code_hash")
    .eq("email_hash", emailHash)
    .eq("consumed", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  const ua = (req.headers.get("user-agent") || "").slice(0, 300);
  const row = rows?.[0];

  if (!row) {
    await admin.from("security_events").insert({
      event_type: "vpn_otp_verify", success: false, ip_hash: ipHash, user_agent: ua,
      metadata: { reason: "no_active_code" },
    });
    return new Response(JSON.stringify({ success: false, error: "expired_or_missing" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (row.attempts >= 5) {
    await admin.from("vpn_otp_codes").update({ consumed: true }).eq("id", row.id);
    await admin.from("security_events").insert({
      event_type: "vpn_otp_verify", success: false, ip_hash: ipHash, user_agent: ua,
      metadata: { reason: "too_many_attempts" },
    });
    return new Response(JSON.stringify({ success: false, error: "too_many_attempts" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (row.code_hash !== codeHash) {
    await admin.from("vpn_otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    await admin.from("security_events").insert({
      event_type: "vpn_otp_verify", success: false, ip_hash: ipHash, user_agent: ua,
      metadata: { reason: "wrong_code", attempts: row.attempts + 1 },
    });
    return new Response(JSON.stringify({ success: false, error: "wrong_code" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await admin.from("vpn_otp_codes").update({ consumed: true }).eq("id", row.id);
  await admin.from("security_events").insert({
    event_type: "vpn_otp_verify", success: true, ip_hash: ipHash, user_agent: ua,
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
