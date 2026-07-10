import { supabase } from "@/integrations/supabase/client";

let cachedSitekey: string | null = null;

/**
 * Fetches the public hCaptcha sitekey from the verify-captcha edge function.
 * Cached after the first successful call.
 */
export async function getCaptchaSitekey(): Promise<string> {
  if (cachedSitekey) return cachedSitekey;
  const { data, error } = await supabase.functions.invoke("verify-captcha", {
    method: "GET",
  });
  if (error) throw new Error(error.message);
  const key = (data as { sitekey?: string })?.sitekey;
  if (!key) throw new Error("Captcha not configured");
  cachedSitekey = key;
  return key;
}

/**
 * Verifies a captcha token server-side. Returns true if valid.
 */
export async function verifyCaptchaToken(token: string): Promise<boolean> {
  if (!token) return false;
  const { data, error } = await supabase.functions.invoke("verify-captcha", {
    body: { token },
  });
  if (error) return false;
  return Boolean((data as { success?: boolean })?.success);
}

/**
 * Checks whether the visitor's IP appears to be a VPN / proxy / Tor exit.
 * Returns { vpn: boolean } — defaults to false on any error so we never
 * block real users due to lookup issues.
 */
export interface VpnCheckResult {
  vpn: boolean;
  is_vpn?: boolean;
  is_proxy?: boolean;
  is_tor?: boolean;
  is_datacenter?: boolean;
  country?: string | null;
  country_code?: string | null;
}

export async function checkVpn(): Promise<VpnCheckResult> {
  try {
    const { data, error } = await supabase.functions.invoke("check-vpn", {
      method: "GET",
    });
    if (error) return { vpn: false };
    return (data as VpnCheckResult) ?? { vpn: false };
  } catch {
    return { vpn: false };
  }
}

/** Trusted ISO country codes that skip the math + behavioral + PoW steps. */
export const TRUSTED_COUNTRY_CODES = new Set<string>([
  // EU member states
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
  "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
  // + US, UK, Canada, Australia, New Zealand
  "US","GB","UK","CA","AU","NZ",
]);

export function isTrustedCountry(code?: string | null): boolean {
  if (!code) return false;
  return TRUSTED_COUNTRY_CODES.has(code.toUpperCase());
}

/* ---------- VPN OTP ---------- */

export async function sendVpnOtp(email: string): Promise<{ ok: boolean; error?: string; retryAfter?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-vpn-otp", { body: { email } });
    if (error) {
      // supabase-js throws on non-2xx responses, so try to read the JSON body
      // from the underlying Response (FunctionsHttpError.context) to recover
      // structured fields like { error, retry_after }.
      const ctx = (error as any)?.context;
      if (ctx && typeof ctx.json === "function") {
        try {
          const body = await ctx.json();
          return {
            ok: false,
            error: body?.error || "send_failed",
            retryAfter: Number(body?.retry_after) || undefined,
          };
        } catch { /* fall through */ }
      }
      return { ok: false, error: "email_temporarily_unavailable" };
    }
    if ((data as any)?.success) return { ok: true };
    return {
      ok: false,
      error: (data as any)?.error || "email_temporarily_unavailable",
      retryAfter: Number((data as any)?.retry_after) || undefined,
    };
  } catch (e) {
    return { ok: false, error: "network_error" };
  }
}

export async function verifyVpnOtp(email: string, code: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-vpn-otp", {
      body: { email, code },
    });
    if (error) return false;
    return Boolean((data as any)?.success);
  } catch {
    return false;
  }
}

/* ---------- Proof of work ---------- */

export async function getPowChallenge(): Promise<{ challenge: string; difficulty: number } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-pow-challenge", { method: "GET" });
    if (error) return null;
    const d = data as { challenge?: string; difficulty?: number };
    if (!d?.challenge || !d?.difficulty) return null;
    return { challenge: d.challenge, difficulty: d.difficulty };
  } catch {
    return null;
  }
}

export async function submitPowSolution(challenge: string, nonce: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-pow-challenge", {
      body: { challenge, nonce },
    });
    if (error) return false;
    return Boolean((data as any)?.success);
  } catch {
    return false;
  }
}