// Lightweight in-memory rate limiter for edge functions.
//
// Edge function instances are short-lived and may scale horizontally, so this
// is best-effort defense against bursty abuse from a single instance — NOT a
// strong global limiter. For brute-force protection we combine it with a
// per-call artificial delay and audit logging.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Clean expired buckets occasionally so the map doesn't grow unbounded. */
function gc(now: number) {
  if (buckets.size < 1024) return;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

/**
 * Returns `{ allowed, remaining, resetAt }`. When `allowed` is false the
 * caller should respond with 429.
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  gc(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const b = { count: 1, resetAt: now + windowMs };
    buckets.set(key, b);
    return { allowed: true, remaining: max - 1, resetAt: b.resetAt };
  }
  existing.count += 1;
  if (existing.count > max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  return {
    allowed: true,
    remaining: Math.max(0, max - existing.count),
    resetAt: existing.resetAt,
  };
}

/** Extract a best-effort client IP from common proxy headers. */
export function clientIp(req: Request): string {
  const h = req.headers;
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("fly-client-ip") ||
    "unknown"
  );
}

/** Constant-ish-time delay to slow down token brute-force attempts. */
export function jitterDelay(minMs = 80, maxMs = 220): Promise<void> {
  const ms = minMs + Math.floor(Math.random() * (maxMs - minMs));
  return new Promise((r) => setTimeout(r, ms));
}

/** SHA-256 hex helper — used to hash IPs before logging. */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}