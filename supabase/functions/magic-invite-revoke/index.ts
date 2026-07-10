// Admin/moderator-only: revoke a magic invite link by id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { rateLimit, clientIp, sha256Hex as ipHash } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
async function logSecurityEvent(
  admin: any,
  payload: {
    event_type: string;
    success: boolean;
    ip: string;
    user_agent: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    const ip_hash = payload.ip ? await ipHash(payload.ip) : null;
    await admin.from("security_events").insert({
      event_type: payload.event_type,
      success: payload.success,
      ip_hash,
      user_agent: payload.user_agent,
      metadata: payload.metadata || {},
    });
  } catch (e) {
    console.error("security_events log failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);

    const ip = clientIp(req);
    const ua = req.headers.get("user-agent");

    // Cap revoke/unrevoke toggles at 60 / minute per user.
    const rl = rateLimit(`mirevoke:${user.id}`, 60, 60_000);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Try again shortly." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          },
        },
      );
    }

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator", "staff"]);
    const roleList = (roles || []).map((r: { role: string }) => r.role);
    if (!roleList.length) {
      await logSecurityEvent(admin, {
        event_type: "magic_invite_revoke_forbidden",
        success: false,
        ip,
        user_agent: ua,
        metadata: { user_id: user.id },
      });
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const id = String(body.id || "").trim();
    const action = body.action === "unrevoke" ? "unrevoke" : "revoke";
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(id)) return json({ error: "Invalid id" }, 400);

    // Staff may only revoke invites they themselves created.
    const staffOnly = !roleList.includes("admin") && !roleList.includes("moderator");
    if (staffOnly) {
      const { data: own } = await admin
        .from("magic_invite_links")
        .select("id")
        .eq("id", id)
        .eq("created_by", user.id)
        .maybeSingle();
      if (!own) return json({ error: "Forbidden" }, 403);
    }

    const { error } = await admin
      .from("magic_invite_links")
      .update({ revoked_at: action === "unrevoke" ? null : new Date().toISOString() })
      .eq("id", id);
    if (error) return json({ error: error.message }, 500);

    await logSecurityEvent(admin, {
      event_type: action === "unrevoke" ? "magic_invite_unrevoked" : "magic_invite_revoked",
      success: true,
      ip,
      user_agent: ua,
      metadata: { link_id: id, by_user: user.id },
    });
    return json({ success: true, action });
  } catch (e) {
    console.error("magic-invite-revoke error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});