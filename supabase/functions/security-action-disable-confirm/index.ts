// Step 2: verify the 6-digit code and disable the chosen security preference.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ACTIONS = new Set([
  "require_2fa_on_release",
  "require_captcha_on_release",
  "require_confirm_prompt",
]);

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const action = typeof body?.action === "string" ? body.action : "";

    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "invalid_code_format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_ACTIONS.has(action)) {
      return new Response(JSON.stringify({ error: "invalid_action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: otp, error: otpErr } = await admin
      .from("security_action_otps")
      .select("id, code_hash, attempts, consumed, expires_at")
      .eq("user_id", user.id)
      .eq("action_key", action)
      .eq("consumed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpErr || !otp) {
      return new Response(JSON.stringify({ error: "no_pending_request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(otp.expires_at).getTime() < Date.now()) {
      await admin.from("security_action_otps").update({ consumed: true }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "code_expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((otp.attempts ?? 0) >= 5) {
      await admin.from("security_action_otps").update({ consumed: true }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "too_many_attempts" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidateHash = await sha256(code + ":" + user.id);
    if (candidateHash !== otp.code_hash) {
      await admin
        .from("security_action_otps")
        .update({ attempts: (otp.attempts ?? 0) + 1 })
        .eq("id", otp.id);
      return new Response(JSON.stringify({ error: "invalid_code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark OTP consumed and disable the preference.
    await admin.from("security_action_otps").update({ consumed: true }).eq("id", otp.id);

    const update: Record<string, any> = { user_id: user.id, updated_at: new Date().toISOString() };
    update[action] = false;

    const { error: upErr } = await admin
      .from("user_security_prefs")
      .upsert(update, { onConflict: "user_id" });

    if (upErr) {
      console.error("security-action-disable-confirm update failed", upErr);
      return new Response(JSON.stringify({ error: "update_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("security-action-disable-confirm error", e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
