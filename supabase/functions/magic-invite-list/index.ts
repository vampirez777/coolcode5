// Admin/moderator-only: list all magic invite links with their deal + target user info.
// Never returns raw tokens (those are only shown at creation time).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator", "staff"]);
    const roleList = (roles || []).map((r: { role: string }) => r.role);
    if (!roleList.length) return json({ error: "Forbidden" }, 403);

    // Staff only see invites they themselves created.
    const staffOnly = !roleList.includes("admin") && !roleList.includes("moderator");

    let query = admin
      .from("magic_invite_links")
      .select("id, deal_id, target_user_id, target_role, created_by, revoked_at, last_used_at, use_count, created_at, preset_total_deals, preset_total_usd, preset_avg_deal_seconds")
      .order("created_at", { ascending: false })
      .limit(500);
    if (staffOnly) query = query.eq("created_by", user.id);
    const { data: links, error } = await query;
    if (error) {
      console.error("magic-invite-list query error", error);
      return json({ error: "unexpected_error" }, 500);
    }

    // Enrich with profile + deal data
    const userIds = Array.from(
      new Set((links || []).flatMap((l) => [l.target_user_id, l.created_by]).filter(Boolean)),
    );
    const dealIds = Array.from(new Set((links || []).map((l) => l.deal_id).filter(Boolean)));

    const [{ data: profiles }, { data: deals }] = await Promise.all([
      admin.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", userIds),
      admin.from("deals").select("id, coin, amount, status").in("id", dealIds),
    ]);
    const pById = new Map((profiles || []).map((p) => [p.user_id, p]));
    const dById = new Map((deals || []).map((d) => [d.id, d]));

    const enriched = (links || []).map((l) => ({
      ...l,
      target_profile: pById.get(l.target_user_id) || null,
      created_by_profile: pById.get(l.created_by) || null,
      deal: dById.get(l.deal_id) || null,
    }));

    return json({ links: enriched });
  } catch (e) {
    console.error("magic-invite-list error", e);
    return json({ error: "unexpected_error" }, 500);
  }
});