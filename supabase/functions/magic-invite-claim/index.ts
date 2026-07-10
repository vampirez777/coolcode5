// Public endpoint — claim a magic invite link.
//
// Body: { token: string }
//
// Flow:
//   1. Hash the token, look up the link row (must exist + not revoked).
//   2. Attach the link's target_user_id to the configured deal:
//        - if target_role = "buyer": deal.creator_role must be "seller"  → set creator if empty else other_user_id
//        - if target_role = "seller": symmetric
//      Concretely: we set whichever side (creator_id or other_user_id) is
//      free, or leave it as-is if the user is already attached.
//   3. Mark the link as used (use_count++, last_used_at=now).
//   4. Generate a magiclink for the target auth user via admin.generateLink,
//      extract its hashed_token + email, return them to the client. The
//      client then calls supabase.auth.verifyOtp({ token_hash, type: "magiclink" })
//      to establish a session on the device — no password ever travels.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { rateLimit, clientIp, jitterDelay, sha256Hex as ipHash } from "../_shared/rate-limit.ts";

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

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const ip = clientIp(req);
    const ua = req.headers.get("user-agent");

    // Throttle brute-force attempts: 20 claims / minute per IP.
    const rl = rateLimit(`miclaim:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      await logSecurityEvent(admin, {
        event_type: "magic_invite_claim_rate_limited",
        success: false,
        ip,
        user_agent: ua,
      });
      return new Response(
        JSON.stringify({ error: "Too many attempts. Try again shortly." }),
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

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const token = String(body.token || "").trim();
    // Accept both the new base64url format (43 chars) and the legacy
    // 64-char hex format so existing un-used invites still work.
    if (!/^[A-Za-z0-9_-]{43}$/.test(token) && !/^[a-f0-9]{64}$/.test(token)) {
      await jitterDelay();
      await logSecurityEvent(admin, {
        event_type: "magic_invite_claim_invalid_token_format",
        success: false,
        ip,
        user_agent: ua,
      });
      return json({ error: "Invalid token" }, 400);
    }

    const tokenHash = await sha256Hex(token);

    const { data: link, error: linkErr } = await admin
      .from("magic_invite_links")
      .select("id, deal_id, target_user_id, target_role, revoked_at, preset_total_deals, preset_total_usd, preset_avg_deal_seconds")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (linkErr) {
      console.error("magic-invite-claim link lookup error", linkErr);
      return json({ error: "unexpected_error" }, 500);
    }
    if (!link) {
      await jitterDelay();
      await logSecurityEvent(admin, {
        event_type: "magic_invite_claim_unknown_token",
        success: false,
        ip,
        user_agent: ua,
      });
      return json({ error: "Invalid or expired invite" }, 404);
    }
    if (link.revoked_at) {
      await logSecurityEvent(admin, {
        event_type: "magic_invite_claim_revoked",
        success: false,
        ip,
        user_agent: ua,
        metadata: { link_id: link.id },
      });
      return json({ error: "This invite has been revoked" }, 410);
    }

    // Apply any preset stats to the target profile (idempotent — re-claiming
    // simply re-writes the same values). Null fields are skipped so we don't
    // wipe an existing override.
    if (link.preset_total_deals !== null || link.preset_total_usd !== null || link.preset_avg_deal_seconds !== null) {
      const presetUpdate: Record<string, unknown> = {};
      if (link.preset_total_deals !== null) presetUpdate.preset_total_deals = link.preset_total_deals;
      if (link.preset_total_usd !== null) presetUpdate.preset_total_usd = link.preset_total_usd;
      if (link.preset_avg_deal_seconds !== null) presetUpdate.preset_avg_deal_seconds = link.preset_avg_deal_seconds;
      await admin.from("profiles").update(presetUpdate).eq("user_id", link.target_user_id);
    }

    // Attach to deal
    const { data: deal, error: dealErr } = await admin
      .from("deals")
      .select("id, creator_id, other_user_id, creator_role, status")
      .eq("id", link.deal_id)
      .maybeSingle();
    if (dealErr) {
      console.error("magic-invite-claim deal lookup error", dealErr);
      return json({ error: "unexpected_error" }, 500);
    }
    if (!deal) return json({ error: "Deal no longer exists" }, 404);

    const alreadyAttached =
      deal.creator_id === link.target_user_id ||
      deal.other_user_id === link.target_user_id;

    if (!alreadyAttached) {
      // The target user joins as the OTHER side (the creator already
      // exists). We never overwrite an existing other_user_id.
      if (!deal.other_user_id) {
        const { error: upErr } = await admin
          .from("deals")
          .update({ other_user_id: link.target_user_id })
          .eq("id", link.deal_id);
        if (upErr) {
          console.error("magic-invite-claim attach error", upErr);
          return json({ error: "unexpected_error" }, 500);
        }
      } else {
        return json({
          error: "This deal already has a second participant. Ask an admin to revoke and recreate the invite.",
        }, 409);
      }
    }

    // Pre-seed role assignments based on the admin's chosen target_role so
    // the magic-invite user lands on the role-assignment step with their
    // side ALREADY picked — they only need to confirm. The creator gets
    // the opposite side, also pre-picked but unconfirmed (they still must
    // confirm). This eliminates the chance of a same-side conflict and
    // makes the flow effectively two-click for both parties.
    //
    // Mapping (matches handle_role_assignment_agreement trigger):
    //   target_role "buyer"  → target picks "sender"   (buyer sends $$)
    //   target_role "seller" → target picks "receiver" (seller receives $$)
    // Only seed role assignments on FIRST claim (alreadyAttached === false).
    // Re-claims should not overwrite picks the users may have already
    // changed manually — that would reset confirmations and trap them in
    // an infinite "confirm again" loop.
    if (!alreadyAttached && (link.target_role === "buyer" || link.target_role === "seller")) {
      const targetPick = link.target_role === "buyer" ? "sender" : "receiver";
      const creatorPick = targetPick === "sender" ? "receiver" : "sender";
      try {
        // Upsert target user's pick. Do NOT overwrite if they've already
        // confirmed (covers a re-claim of the same link).
        const { data: existingTarget } = await admin
          .from("deal_role_assignments")
          .select("id, confirmed")
          .eq("deal_id", link.deal_id)
          .eq("user_id", link.target_user_id)
          .maybeSingle();
        if (!existingTarget) {
          await admin.from("deal_role_assignments").insert({
            deal_id: link.deal_id,
            user_id: link.target_user_id,
            picked_role: targetPick,
            confirmed: false,
          });
        } else if (!existingTarget.confirmed) {
          await admin
            .from("deal_role_assignments")
            .update({ picked_role: targetPick })
            .eq("id", existingTarget.id);
        }

        // Same idea for the creator — only seed if they haven't picked yet.
        const { data: existingCreator } = await admin
          .from("deal_role_assignments")
          .select("id")
          .eq("deal_id", link.deal_id)
          .eq("user_id", deal.creator_id)
          .maybeSingle();
        if (!existingCreator) {
          await admin.from("deal_role_assignments").insert({
            deal_id: link.deal_id,
            user_id: deal.creator_id,
            picked_role: creatorPick,
            confirmed: false,
          });
        }
      } catch (seedErr) {
        // Best-effort — the user can still pick manually if seeding fails.
        console.error("role assignment seed failed", seedErr);
      }
    }

    // Bump use_count atomically. We re-read the current value AND constrain
    // the UPDATE to that exact value so two concurrent claims can't both
    // succeed at the same count. If the conditional update misses, we just
    // log and continue — the user has still successfully claimed.
    {
      const { data: row } = await admin
        .from("magic_invite_links")
        .select("use_count")
        .eq("id", link.id)
        .single();
      const current = row?.use_count ?? 0;
      await admin
        .from("magic_invite_links")
        .update({
          use_count: current + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", link.id)
        .eq("use_count", current);
    }

    // Look up the target user's email so we can mint a magic link.
    const { data: tu, error: tuErr } = await admin.auth.admin.getUserById(link.target_user_id);
    if (tuErr || !tu.user?.email) return json({ error: "Target user missing" }, 500);

    const { data: linkData, error: genErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: tu.user.email,
    });
    if (genErr || !linkData.properties?.hashed_token) {
      console.error("magic-invite-claim generateLink error", genErr);
      return json({ error: "could_not_mint_session" }, 500);
    }

    return json({
      success: true,
      deal_id: link.deal_id,
      email: tu.user.email,
      token_hash: linkData.properties.hashed_token,
    });
  } catch (e) {
    console.error("magic-invite-claim error", e);
    return json({ error: "unexpected_error" }, 500);
  }
});