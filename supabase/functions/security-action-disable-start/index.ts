// Step 1 of disabling a security action: verify the user's password and email a 6-digit code.
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

const ALLOWED_ACTIONS = new Set([
  "require_2fa_on_release",
  "require_captcha_on_release",
  "require_confirm_prompt",
]);

const ACTION_LABELS: Record<string, string> = {
  require_2fa_on_release: "2FA when releasing funds",
  require_captcha_on_release: "Captcha when releasing",
  require_confirm_prompt: "\"Are you sure?\" confirmation prompt",
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char)
  );
}

function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return n.toString().padStart(6, "0");
}

function buildEmail(code: string, actionLabel: string) {
  const safeCode = escapeHtml(code);
  const safeAction = escapeHtml(actionLabel);
  const html = `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:Arial,sans-serif;color:#0f172a;"><div style="max-width:560px;margin:0 auto;padding:32px 20px;"><div style="border:1px solid #e2e8f0;border-radius:12px;padding:28px;"><p style="margin:0 0 8px;font-size:13px;color:#64748b;">${SITE_NAME} security</p><h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">Confirm disabling a security protection</h1><p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">You're about to disable <strong>${safeAction}</strong> on your account. Enter the code below to confirm:</p><div style="letter-spacing:8px;font-size:32px;font-weight:700;text-align:center;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:18px 12px;color:#991b1b;">${safeCode}</div><p style="margin:22px 0 0;font-size:13px;line-height:1.5;color:#64748b;">This code expires in 10 minutes. If you didn't request this, change your password immediately — someone may have access to your account.</p></div></div></body></html>`;
  return { html, text: `Your ${SITE_NAME} confirmation code to disable "${actionLabel}" is ${code}. It expires in 10 minutes.` };
}

async function enqueueEmail(admin: any, email: string, code: string, actionLabel: string) {
  const normalizedEmail = email.toLowerCase();
  const { data: suppressed } = await admin
    .from("suppressed_emails")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (suppressed) return { ok: false, error: "email_unavailable" };

  const messageId = crypto.randomUUID();
  const content = buildEmail(code, actionLabel);
  await admin.from("email_send_log").insert({
    message_id: messageId,
    template_name: "security_action_disable",
    recipient_email: normalizedEmail,
    status: "pending",
    metadata: { purpose: "security_action_disable" },
  });

  const payload = {
    message_id: messageId,
    purpose: "transactional",
    template_name: "security_action_disable",
    to: normalizedEmail,
    subject: `Confirm disabling "${actionLabel}"`,
    html: content.html,
    text: content.text,
    sender_domain: SENDER_DOMAIN,
    from_domain: FROM_DOMAIN,
    from_name: `${SITE_NAME} Security`,
    enqueued_at: new Date().toISOString(),
  };

  const { error: enqError } = await admin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload,
  });
  if (enqError) return { ok: false, error: "enqueue_failed", details: enqError.message };
  return { ok: true };
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
    if (userErr || !user || !user.email) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";
    const action = typeof body?.action === "string" ? body.action : "";

    if (!password || password.length < 1) {
      return new Response(JSON.stringify({ error: "password_required" }), {
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

    // Verify password by attempting a fresh sign-in (does not affect current session).
    const verifier = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: signErr } = await verifier.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (signErr) {
      return new Response(JSON.stringify({ error: "invalid_password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Invalidate previous unconsumed OTPs for this user+action
    await admin
      .from("security_action_otps")
      .update({ consumed: true })
      .eq("user_id", user.id)
      .eq("action_key", action)
      .eq("consumed", false);

    const code = generateCode();
    const codeHash = await sha256(code + ":" + user.id);

    const { error: insErr } = await admin.from("security_action_otps").insert({
      user_id: user.id,
      code_hash: codeHash,
      action_key: action,
    });
    if (insErr) {
      console.error("security-action-disable-start store failed", insErr);
      return new Response(JSON.stringify({ error: "store_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sendResult = await enqueueEmail(admin, user.email, code, ACTION_LABELS[action]);
    if (!sendResult.ok) {
      console.error("security-action-disable-start send failed", sendResult);
      return new Response(JSON.stringify({ error: "send_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, email: user.email.replace(/^(.).+(@.+)$/, "$1•••$2") }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("security-action-disable-start error", e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
