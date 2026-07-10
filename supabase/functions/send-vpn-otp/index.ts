// Sends a 6-digit OTP code to a VPN visitor's email via the transactional
// email pipeline. Does NOT touch auth.users — this email is only for proving
// access to a real inbox.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_NAME = "HalalMiddleman";
const SENDER_DOMAIN = "notify.halalmiddleman.net";
const FROM_DOMAIN = "halalmiddleman.net";

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

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[char] || char));
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildOtpEmail(code: string) {
  const safeCode = escapeHtml(code);
  const html = `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#0f172a;"><div style="max-width:560px;margin:0 auto;padding:32px 20px;"><div style="border:1px solid #e2e8f0;border-radius:12px;padding:28px;"><p style="margin:0 0 8px;font-size:13px;color:#64748b;">${SITE_NAME}</p><h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0f172a;">Your verification code</h1><p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#334155;">Enter this code to continue through the VPN security check.</p><div style="letter-spacing:8px;font-size:32px;font-weight:700;text-align:center;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 12px;color:#0f172a;">${safeCode}</div><p style="margin:22px 0 0;font-size:13px;line-height:1.5;color:#64748b;">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div></div></body></html>`;
  return { html, text: `Your ${SITE_NAME} verification code is ${code}. It expires in 10 minutes.` };
}

async function enqueueOtpEmail(admin: any, email: string, emailHash: string, code: string) {
  const normalizedEmail = email.toLowerCase();
  const { data: suppressed, error: suppressionError } = await admin
    .from("suppressed_emails")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (suppressionError) return { ok: false, error: "prepare_failed", details: suppressionError.message };
  if (suppressed) return { ok: false, error: "email_unavailable", details: "suppressed" };

  let unsubscribeToken = generateToken();
  const { data: existingToken, error: tokenLookupError } = await admin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (tokenLookupError) return { ok: false, error: "prepare_failed", details: tokenLookupError.message };
  if (existingToken?.used_at) return { ok: false, error: "email_unavailable", details: "used_unsubscribe_token" };
  if (existingToken?.token && typeof existingToken.token === "string") unsubscribeToken = existingToken.token;
  if (!existingToken) {
    const { error: tokenError } = await admin
      .from("email_unsubscribe_tokens")
      .upsert({ token: unsubscribeToken, email: normalizedEmail }, { onConflict: "email", ignoreDuplicates: true });
    if (tokenError) return { ok: false, error: "prepare_failed", details: tokenError.message };
  }

  const messageId = crypto.randomUUID();
  const emailContent = buildOtpEmail(code);
  await admin.from("email_send_log").insert({
    message_id: messageId,
    template_name: "vpn-otp",
    recipient_email: email,
    status: "pending",
  });

  const { error: enqueueError } = await admin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: "Your VPN verification code",
      html: emailContent.html,
      text: emailContent.text,
      purpose: "transactional",
      label: "vpn-otp",
      idempotency_key: `vpn-otp-${emailHash.slice(0, 16)}-${Date.now()}`,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "vpn-otp",
      recipient_email: email,
      status: "failed",
      error_message: "Failed to enqueue VPN OTP email",
    });
    return { ok: false, error: "enqueue_failed", details: enqueueError.message };
  }

  return { ok: true };
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

  let body: { email?: string } = {};
  try { body = await req.json(); } catch { /* */ }
  const email = (body.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: "invalid_email" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(url, key);
  const ipHash = (await sha256((getClientIp(req) || "") + "|hmm-salt")).slice(0, 32);
  const emailHash = await sha256(email);

  // Light rate-limit: max 3 active, unconsumed codes per email in the last 10 min.
  // Return a normal JSON response so the client can show a cooldown instead of
  // treating this expected state as a runtime failure.
  const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, data: recentCodes } = await admin
    .from("vpn_otp_codes")
    .select("created_at", { count: "exact" })
    .eq("email_hash", emailHash)
    .eq("consumed", false)
    .gt("expires_at", new Date().toISOString())
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true });
  if ((count ?? 0) >= 3) {
    const oldest = recentCodes?.[0]?.created_at ? new Date(recentCodes[0].created_at).getTime() : Date.now();
    const retryAfterSeconds = Math.max(30, Math.ceil((oldest + 10 * 60 * 1000 - Date.now()) / 1000));
    return new Response(JSON.stringify({ success: false, error: "rate_limited", retry_after: retryAfterSeconds }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 6-digit numeric code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = await sha256(code + "|" + emailHash);

  const { data: insertedCode, error: insertErr } = await admin.from("vpn_otp_codes").insert({
    email_hash: emailHash,
    code_hash: codeHash,
    ip_hash: ipHash,
  }).select("id").single();
  if (insertErr) {
    return new Response(JSON.stringify({ success: false, error: "try_again_later" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Enqueue the email via the transactional pipeline
  const sendResult = await enqueueOtpEmail(admin, email, emailHash, code);
  const sendErr = sendResult.ok ? null : sendResult;

  if (sendErr && insertedCode?.id) {
    await admin.from("vpn_otp_codes").delete().eq("id", insertedCode.id);
  }

  // Log security event (don't expose code)
  await admin.from("security_events").insert({
    event_type: "vpn_otp_sent",
    success: !sendErr,
    ip_hash: ipHash,
    user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
    metadata: { send_error: sendErr ? JSON.stringify(sendErr) : null },
  });

  if (sendErr) {
    return new Response(JSON.stringify({ success: false, error: "email_temporarily_unavailable" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
