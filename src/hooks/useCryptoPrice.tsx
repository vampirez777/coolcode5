import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Module-level cache so multiple components don't re-fetch.
const priceCache = new Map<string, { price: number; at: number }>();
const TTL_MS = 60_000;

/**
 * Returns live USD price for a coin (Bitcoin, Ethereum, Litecoin, Solana,
 * USDC, USDT). Stablecoins resolve to 1 instantly. Refreshes every 60s.
 */
export function useCryptoPrice(coin?: string | null) {
  const [price, setPrice] = useState<number | null>(() => {
    if (!coin) return null;
    if (coin === "USDC" || coin === "USDT") return 1;
    const hit = priceCache.get(coin);
    return hit ? hit.price : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!coin) return;
    if (coin === "USDC" || coin === "USDT") {
      setPrice(1);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const hit = priceCache.get(coin);
      if (hit && Date.now() - hit.at < TTL_MS) {
        setPrice(hit.price);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("crypto-price", {
          body: { coins: [coin] },
        });
        const p = (data as any)?.prices?.[coin];
        if (!cancelled && typeof p === "number" && p > 0) {
          priceCache.set(coin, { price: p, at: Date.now() });
          setPrice(p);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, TTL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [coin]);

  return { price, loading };
}