// Public price lookup using CoinGecko. No API key required.
// Maps coin name → coingecko id and returns { prices: { COIN: usd } }.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COIN_TO_ID: Record<string, string> = {
  Bitcoin: "bitcoin",
  Ethereum: "ethereum",
  Litecoin: "litecoin",
  Solana: "solana",
  USDC: "usd-coin",
  USDT: "tether",
};

// in-memory cache (per warm instance), 60s TTL
const cache = new Map<string, { price: number; at: number }>();
const TTL_MS = 60_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let coinsParam = url.searchParams.get("coins") || "";
    if (!coinsParam && (req.method === "POST" || req.method === "PUT")) {
      try {
        const body = await req.json();
        if (Array.isArray(body?.coins)) coinsParam = body.coins.join(",");
        else if (typeof body?.coins === "string") coinsParam = body.coins;
      } catch { /* no body */ }
    }
    const requested = coinsParam
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s in COIN_TO_ID);

    const coins = requested.length > 0 ? requested : Object.keys(COIN_TO_ID);

    const now = Date.now();
    const prices: Record<string, number> = {};
    const needFetch: string[] = [];
    for (const c of coins) {
      const hit = cache.get(c);
      if (hit && now - hit.at < TTL_MS) prices[c] = hit.price;
      else needFetch.push(c);
    }

    if (needFetch.length > 0) {
      const ids = needFetch.map((c) => COIN_TO_ID[c]).join(",");
      const r = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
        { headers: { accept: "application/json" } },
      );
      if (r.ok) {
        const data = await r.json() as Record<string, { usd: number }>;
        for (const c of needFetch) {
          const id = COIN_TO_ID[c];
          const v = data[id]?.usd;
          if (typeof v === "number" && v > 0) {
            prices[c] = v;
            cache.set(c, { price: v, at: now });
          }
        }
      } else {
        // Stablecoin safe fallback
        for (const c of needFetch) {
          if (c === "USDT" || c === "USDC") prices[c] = 1;
        }
      }
    }

    return json({ prices, fetched_at: new Date().toISOString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});