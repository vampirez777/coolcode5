// Detects whether the caller's IP is from a VPN / proxy / hosting provider.
// Uses ipapi.is free endpoint (no key required, ~1k/day per IP).
// Returns a small, safe payload — never the raw IP.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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

async function logEvent(payload: Record<string, unknown>) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const admin = createClient(url, key);
    await admin.from("security_events").insert(payload);
  } catch {
    /* swallow */
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = getClientIp(req);
  const ipHash = await hashIp(ip);
  const ua = (req.headers.get("user-agent") || "").slice(0, 300);

  if (!ip) {
    await logEvent({
      event_type: "vpn_check",
      success: false,
      ip_hash: null,
      user_agent: ua,
      metadata: { reason: "no_ip" },
    });
    return new Response(
      JSON.stringify({ vpn: false, reason: "no_ip" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  try {
    const res = await fetch(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}`);
    if (!res.ok) {
      await logEvent({
        event_type: "vpn_check",
        success: false,
        ip_hash: ipHash,
        user_agent: ua,
        metadata: { reason: "lookup_failed", status: res.status },
      });
      return new Response(
        JSON.stringify({ vpn: false, reason: "lookup_failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    const data = await res.json();
    const isVpn = Boolean(data?.is_vpn);
    const isProxy = Boolean(data?.is_proxy);
    const isTor = Boolean(data?.is_tor);
    const isDatacenter = Boolean(data?.is_datacenter);
    const isAbuser = Boolean(data?.is_abuser);
    const flagged = isVpn || isProxy || isTor || isAbuser;

    await logEvent({
      event_type: "vpn_check",
      success: true,
      ip_hash: ipHash,
      ip_address: ip,
      country: data?.location?.country || null,
      is_vpn: isVpn,
      is_proxy: isProxy,
      is_tor: isTor,
      is_datacenter: isDatacenter,
      user_agent: ua,
      metadata: { flagged, is_abuser: isAbuser },
    });

    return new Response(
      JSON.stringify({
        vpn: flagged,
        is_vpn: isVpn,
        is_proxy: isProxy,
        is_tor: isTor,
        is_datacenter: isDatacenter,
        country: data?.location?.country || null,
        country_code: data?.location?.country_code || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("check-vpn error", err);
    await logEvent({
      event_type: "vpn_check",
      success: false,
      ip_hash: ipHash,
      user_agent: ua,
      metadata: { reason: "error", message: (err as Error).message },
    });
    return new Response(
      JSON.stringify({ vpn: false, reason: "error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});