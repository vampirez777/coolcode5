import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { rateLimit, clientIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || null;
}
async function hashIp(ip: string | null) {
  if (!ip) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|hmm-salt"));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Rate-limit: max 5 calls per IP per minute to deter bulk abuse.
    const ip = clientIp(req);
    const rl = rateLimit(`gbr:${ip}`, 5, 60_000);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      });
    }

    const body = await req.json().catch(() => ({}));
    const browserId = typeof body.browser_id === "string" ? body.browser_id.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.slice(0, 200) : "risk_score";
    const riskScore = Number.isFinite(body.risk_score) ? Math.max(0, Math.min(99, Math.floor(body.risk_score))) : 1;
    const meta = body.metadata && typeof body.metadata === "object" ? body.metadata : null;

    if (!browserId || browserId.length < 8 || browserId.length > 128) {
      return new Response(JSON.stringify({ error: "invalid_browser_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ipHash = await hashIp(getIp(req));
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

    // Upsert: keep first reason if already blocked, just bump updated_at + score.
    const { error } = await supabase
      .from("gate_blocks")
      .upsert(
        {
          browser_id: browserId,
          reason,
          risk_score: riskScore,
          ip_hash: ipHash,
          user_agent: userAgent,
          metadata: meta,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "browser_id" },
      );

    if (error) {
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ blocked: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});