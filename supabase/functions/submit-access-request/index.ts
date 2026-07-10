import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_REASON_LEN = 30;
const MAX_REASON_LEN = 1000;

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
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

async function lookupIp(ip: string) {
  try {
    const res = await fetch(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const browserId = String(body?.browser_id || "").trim();
    const reason = String(body?.reason || "").trim();

    if (!browserId || browserId.length > 80) {
      return new Response(JSON.stringify({ error: "invalid_browser_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (reason.length < MIN_REASON_LEN || reason.length > MAX_REASON_LEN) {
      return new Response(JSON.stringify({ error: "invalid_reason" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return new Response(JSON.stringify({ error: "server_not_configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(url, key);

    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);
    const ua = (req.headers.get("user-agent") || "").slice(0, 300);

    // Rate-limit: max 3 pending requests per browser_id in 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("access_requests")
      .select("id", { count: "exact", head: true })
      .eq("browser_id", browserId)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-check IP signals so we record what we saw at submission time
    let isVpn = false, isProxy = false, isTor = false, isDatacenter = false;
    let country: string | null = null;
    if (ip) {
      const data = await lookupIp(ip);
      if (data) {
        isVpn = Boolean(data?.is_vpn);
        isProxy = Boolean(data?.is_proxy);
        isTor = Boolean(data?.is_tor);
        isDatacenter = Boolean(data?.is_datacenter);
        country = data?.location?.country || null;
      }
    }

    const { data: inserted, error: insErr } = await admin
      .from("access_requests")
      .insert({
        browser_id: browserId,
        ip_hash: ipHash,
        ip_address: ip,
        country,
        user_agent: ua,
        reason,
        is_vpn: isVpn,
        is_proxy: isProxy,
        is_tor: isTor,
        is_datacenter: isDatacenter,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return new Response(JSON.stringify({ error: "insert_failed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, request_id: inserted.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("submit-access-request error", err);
    return new Response(
      JSON.stringify({ error: "unexpected_error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});