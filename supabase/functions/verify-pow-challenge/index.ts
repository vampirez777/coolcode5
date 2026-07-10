// Issues and verifies SHA-256 proof-of-work challenges.
// GET  -> issues a new challenge: { challenge, difficulty }
// POST -> verifies a solution: { challenge, nonce } -> { success }
//
// The client must find a `nonce` such that SHA-256(challenge + ":" + nonce)
// has at least `difficulty` leading zero BITS. Default difficulty=18 takes
// ~1-3s on a modern laptop and is essentially negligible to a single user
// but very expensive at bot scale.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const DIFFICULTY = 18;

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function leadingZeroBits(hex: string): number {
  let bits = 0;
  for (const ch of hex) {
    const v = parseInt(ch, 16);
    if (v === 0) { bits += 4; continue; }
    if (v < 2) return bits + 3;
    if (v < 4) return bits + 2;
    if (v < 8) return bits + 1;
    return bits;
  }
  return bits;
}
function randomChallenge(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(url, key);
  const ipHash = (await sha256Hex((getClientIp(req) || "") + "|hmm-salt")).slice(0, 32);

  if (req.method === "GET") {
    const challenge = randomChallenge();
    await admin.from("pow_challenges").insert({
      challenge, difficulty: DIFFICULTY, ip_hash: ipHash,
    });
    return new Response(JSON.stringify({ challenge, difficulty: DIFFICULTY }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { challenge?: string; nonce?: string } = {};
  try { body = await req.json(); } catch { /* */ }
  const challenge = (body.challenge || "").trim();
  const nonce = (body.nonce || "").trim();
  if (!challenge || !nonce || nonce.length > 128) {
    return new Response(JSON.stringify({ success: false, error: "invalid_input" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: rows } = await admin
    .from("pow_challenges")
    .select("id, difficulty, consumed, expires_at")
    .eq("challenge", challenge)
    .limit(1);
  const row = rows?.[0];
  if (!row || row.consumed || new Date(row.expires_at).getTime() < Date.now()) {
    return new Response(JSON.stringify({ success: false, error: "challenge_invalid" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const hash = await sha256Hex(`${challenge}:${nonce}`);
  const bits = leadingZeroBits(hash);
  const ok = bits >= row.difficulty;

  if (ok) {
    await admin.from("pow_challenges").update({ consumed: true }).eq("id", row.id);
  }
  await admin.from("security_events").insert({
    event_type: "pow_verify",
    success: ok,
    ip_hash: ipHash,
    user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
    metadata: { bits, required: row.difficulty },
  });

  return new Response(JSON.stringify({ success: ok }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
