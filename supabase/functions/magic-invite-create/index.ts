// Admin/moderator-only: create a magic invite link.
//
// Body: {
//   deal_id: string,
//   target_role: "buyer" | "seller",
//   username: string,        // username for the auto-created auth user
//   display_name?: string,
//   avatar_url?: string,     // pre-uploaded URL or external URL
// }
//
// Effect:
//   - creates a brand-new auth user (random email + random password,
//     email_confirm = true so they can sign in immediately),
//   - upserts a profile with the chosen username/display_name/avatar,
//   - generates a high-entropy raw token, stores only its SHA-256 hash,
//   - returns the raw token + a ready-to-share URL.
//
// The raw token is only ever returned by THIS endpoint.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { rateLimit, clientIp, sha256Hex as ipHash } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SITE_ORIGIN = "https://halalmiddleman.net";

// Trusted hosts whose origin may be echoed back in the generated link.
// Anything else falls back to DEFAULT_SITE_ORIGIN so we never hand out
// a link pointing to an attacker-controlled host.
const ORIGIN_ALLOWLIST = [
  /^https:\/\/ticket-halalmm\.com$/i,
  /^https:\/\/www\.ticket-halalmm\.com$/i,
  /^https:\/\/halalmiddleman\.net$/i,
  /^https:\/\/www\.halalmiddleman\.net$/i,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/i,
];

function pickSiteOrigin(req: Request): string {
  const candidate = req.headers.get("origin") || (() => {
    const ref = req.headers.get("referer");
    if (!ref) return null;
    try { return new URL(ref).origin; } catch { return null; }
  })();
  if (candidate && ORIGIN_ALLOWLIST.some((re) => re.test(candidate))) return candidate;
  return DEFAULT_SITE_ORIGIN;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64url, 43 chars for 32 bytes
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomEmail(username: string): string {
  const slug = username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "user";
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `${slug}+${id}@magic.halalmm.local`;
}

function randomPassword(): string {
  return crypto.randomUUID() + crypto.randomUUID();
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

// Reject control characters and zero-width chars in display strings.
const SAFE_TEXT_RE = /^[^\x00-\x1f\x7f\u200b-\u200f\u2028\u2029]*$/;

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

    // Cap each admin/mod to 30 invite creations per 10 minutes.
    const rl = rateLimit(`micreate:${user.id}`, 30, 10 * 60_000);
    if (!rl.allowed) {
      await logSecurityEvent(admin, {
        event_type: "magic_invite_create_rate_limited",
        success: false,
        ip,
        user_agent: ua,
        metadata: { user_id: user.id },
      });
      return new Response(
        JSON.stringify({ error: "Too many invites created. Try again shortly." }),
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

    // Caller must be admin, moderator, or staff.
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator", "staff"]);
    const allowed = (roles || []).length > 0;
    if (!allowed) {
      await logSecurityEvent(admin, {
        event_type: "magic_invite_create_forbidden",
        success: false,
        ip,
        user_agent: ua,
        metadata: { user_id: user.id },
      });
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const dealId = String(body.deal_id || "").trim();
    const targetRole = String(body.target_role || "").trim();
    const username = String(body.username || "").trim();
    const displayName = body.display_name != null ? String(body.display_name).trim() : "";
    const avatarUrl = body.avatar_url != null ? String(body.avatar_url).trim() : "";

    // Optional preset stats — admin/staff can pre-fill the recipient's
    // dashboard numbers. Validated as non-negative integers / decimal.
    const parsePresetInt = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
      return Math.trunc(n);
    };
    const parsePresetUsd = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 999_999_999.99) return null;
      return Math.round(n * 100) / 100;
    };
    const presetTotalDeals = parsePresetInt(body.preset_total_deals);
    const presetTotalUsd = parsePresetUsd(body.preset_total_usd);
    const presetAvgDealSeconds = parsePresetInt(body.preset_avg_deal_seconds);

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(dealId)) return json({ error: "Invalid deal_id" }, 400);
    if (!["buyer", "seller"].includes(targetRole)) {
      return json({ error: "target_role must be buyer or seller" }, 400);
    }
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
      return json({ error: "Username must be 3-30 chars, letters/numbers/_/- only" }, 400);
    }
    if (displayName.length > 60 || !SAFE_TEXT_RE.test(displayName)) {
      return json({ error: "display_name has invalid characters or is too long" }, 400);
    }
    if (avatarUrl.length > 2048) {
      return json({ error: "avatar_url too long" }, 400);
    }
    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      return json({ error: "avatar_url must be http(s)" }, 400);
    }

    // Confirm the deal exists.
    const { data: deal } = await admin
      .from("deals")
      .select("id, creator_id, other_user_id, creator_role")
      .eq("id", dealId)
      .maybeSingle();
    if (!deal) return json({ error: "Deal not found" }, 404);

    // 1. If a profile with this exact username already exists, reuse that
    //    user instead of creating a duplicate auth account. This prevents
    //    the "kokyaww / kokyaww1 / kokyaww2" drift that happens when an
    //    admin re-creates an invite for the same person (e.g. after the
    //    first link was revoked or used on a different deal). Without
    //    this, every re-invite spawns a brand-new auth user with a
    //    suffixed username, and the real person ends up signed into the
    //    wrong account and "can't see their deal".
    let newUserId: string;
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("username", username)
      .maybeSingle();

    if (existingProfile?.user_id) {
      newUserId = existingProfile.user_id;
      // Refresh display_name / avatar so the admin's latest choice wins.
      await admin
        .from("profiles")
        .update({
          display_name: displayName || username,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        })
        .eq("user_id", newUserId);
    } else {
      const email = randomEmail(username);
      const password = randomPassword();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          display_name: displayName || username,
          magic_invite: true,
        },
      });
      if (createErr || !created.user) {
        return json({ error: createErr?.message || "Could not create auth user" }, 500);
      }
      newUserId = created.user.id;

      // Upsert profile (the handle_new_user trigger may have already done this;
      // we update to make sure username + avatar match exactly what admin chose).
      const { error: profErr } = await admin
        .from("profiles")
        .upsert(
          {
            user_id: newUserId,
            username,
            display_name: displayName || username,
            avatar_url: avatarUrl || null,
          },
          { onConflict: "user_id" },
        );
      if (profErr) {
        console.error("profile upsert error", profErr);
      }
    }

    // 3. Generate token + insert link row.
    const rawToken = randomToken();
    const tokenHash = await sha256Hex(rawToken);

    const { data: linkRow, error: linkErr } = await admin
      .from("magic_invite_links")
      .insert({
        token_hash: tokenHash,
        deal_id: dealId,
        target_user_id: newUserId,
        target_role: targetRole,
        created_by: user.id,
        preset_total_deals: presetTotalDeals,
        preset_total_usd: presetTotalUsd,
        preset_avg_deal_seconds: presetAvgDealSeconds,
      })
      .select()
      .single();
    if (linkErr) {
      // rollback the auth user so we don't leak orphans
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return json({ error: linkErr.message }, 500);
    }

    // Apply preset stats immediately to the target profile so the recipient
    // sees the numbers as soon as they claim — and even before, on any
    // page that reads from profiles. Only writes columns that were set.
    if (presetTotalDeals !== null || presetTotalUsd !== null || presetAvgDealSeconds !== null) {
      const update: Record<string, unknown> = {};
      if (presetTotalDeals !== null) update.preset_total_deals = presetTotalDeals;
      if (presetTotalUsd !== null) update.preset_total_usd = presetTotalUsd;
      if (presetAvgDealSeconds !== null) update.preset_avg_deal_seconds = presetAvgDealSeconds;
      await admin.from("profiles").update(update).eq("user_id", newUserId);
    }

    const url = `${pickSiteOrigin(req)}/deals/join?t=${rawToken}`;
    await logSecurityEvent(admin, {
      event_type: "magic_invite_created",
      success: true,
      ip,
      user_agent: ua,
      metadata: {
        link_id: linkRow.id,
        deal_id: dealId,
        target_role: targetRole,
        created_by: user.id,
      },
    });
    return json({
      success: true,
      id: linkRow.id,
      url,
      raw_token: rawToken,
      target_user_id: newUserId,
    });
  } catch (e) {
    console.error("magic-invite-create error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});