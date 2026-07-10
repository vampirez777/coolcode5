// Verifies an hCaptcha token. Also exposes the public sitekey for the frontend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip + "|hmm-salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

async function logEvent(payload: Record<string, unknown>) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const admin = createClient(url, key);
    await admin.from("security_events").insert(payload);
  } catch {
    /* never block on logging */
  }
}

// GET  → { sitekey: string }
// POST → { token: string } → { success: boolean, error?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sitekey = Deno.env.get("HCAPTCHA_SITEKEY") ?? "";
  const secret = Deno.env.get("HCAPTCHA_SECRET") ?? "";

  // GET → return public sitekey so the widget can render
  if (req.method === "GET") {
    return new Response(JSON.stringify({ sitekey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "method_not_allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  if (!secret) {
    return new Response(JSON.stringify({ success: false, error: "captcha_not_configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "invalid_body" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  const token = (body.token || "").trim();
  if (!token || token.length > 4096) {
    return new Response(JSON.stringify({ success: false, error: "missing_token" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  const ipHash = await hashIp(getClientIp(req));
  const ua = (req.headers.get("user-agent") || "").slice(0, 300);

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);
  if (sitekey) params.set("sitekey", sitekey);

  try {
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();
    if (data.success) {
      await logEvent({
        event_type: "captcha_success",
        success: true,
        ip_hash: ipHash,
        user_agent: ua,
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    await logEvent({
      event_type: "captcha_failure",
      success: false,
      ip_hash: ipHash,
      user_agent: ua,
      error_codes: data["error-codes"] ?? null,
    });
    return new Response(
      JSON.stringify({ success: false, error: "verification_failed", details: data["error-codes"] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("verify-captcha error", err);
    await logEvent({
      event_type: "captcha_failure",
      success: false,
      ip_hash: ipHash,
      user_agent: ua,
      error_codes: ["upstream_error"],
      metadata: { message: (err as Error).message },
    });
    return new Response(
      JSON.stringify({ success: false, error: "upstream_error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 }
    );
  }
});