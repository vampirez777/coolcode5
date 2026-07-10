import { supabase } from "@/integrations/supabase/client";

const BROWSER_ID_KEY = "hmm.browser.id.v1";

/** Stable per-browser id (random). Used to look up access requests later. */
export function getOrCreateBrowserId(): string {
  try {
    const existing = localStorage.getItem(BROWSER_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(BROWSER_ID_KEY, id);
    return id;
  } catch {
    // Fallback if localStorage is blocked
    return crypto.randomUUID();
  }
}

export interface SubmitAccessRequestArgs {
  browserId: string;
  reason: string;
}

export async function submitAccessRequest(
  args: SubmitAccessRequestArgs,
): Promise<{ ok: boolean; requestId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("submit-access-request", {
      body: { browser_id: args.browserId, reason: args.reason },
    });
    if (error) return { ok: false, error: "submit_failed" };
    const d = data as { success?: boolean; request_id?: string; error?: string };
    if (d?.success && d.request_id) return { ok: true, requestId: d.request_id };
    return { ok: false, error: d?.error || "submit_failed" };
  } catch {
    return { ok: false, error: "network_error" };
  }
}

export async function checkAccessRequest(
  requestId: string,
): Promise<{ status: "pending" | "approved" | "rejected" } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("check-access-request", {
      body: { request_id: requestId },
    });
    if (error) return null;
    const d = data as { status?: "pending" | "approved" | "rejected" };
    return d?.status ? { status: d.status } : null;
  } catch {
    return null;
  }
}

/** Persist locally that this browser was approved (one-time approval). */
const APPROVED_KEY = "hmm.access.approved.v1";
export function markBrowserApproved() {
  try {
    localStorage.setItem(
      APPROVED_KEY,
      JSON.stringify({ approvedAt: Date.now() }),
    );
  } catch { /* noop */ }
}

export function isBrowserApproved(): boolean {
  try {
    return Boolean(localStorage.getItem(APPROVED_KEY));
  } catch {
    return false;
  }
}

/** Persist a pending request id so we can resume after a page refresh. */
const PENDING_KEY = "hmm.access.pending.v1";
export function rememberPendingRequest(requestId: string) {
  try { localStorage.setItem(PENDING_KEY, requestId); } catch { /* noop */ }
}
export function getPendingRequest(): string | null {
  try { return localStorage.getItem(PENDING_KEY); } catch { return null; }
}
export function clearPendingRequest() {
  try { localStorage.removeItem(PENDING_KEY); } catch { /* noop */ }
}

/* ------------------------------------------------------------------
 * Gate blocks — persistent "Please try again later" decisions
 * ------------------------------------------------------------------ */

const BLOCK_KEY = "hmm.gate.blocked.v1";
const REJECTED_KEY = "hmm.access.rejected.v1";
const MAGIC_CLAIM_KEY = "hmm.magic.claimed.v1";
const MAGIC_USER_KEY = "hmm.magic.user.v1";
const MAGIC_USER_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

function clearLocalRejection() {
  try { localStorage.removeItem(REJECTED_KEY); } catch { /* noop */ }
}

export function markBrowserBlocked() {
  try { localStorage.setItem(BLOCK_KEY, JSON.stringify({ at: Date.now() })); } catch { /* noop */ }
}
export function isLocallyBlocked(): boolean {
  try { return Boolean(localStorage.getItem(BLOCK_KEY)); } catch { return false; }
}
export function clearLocalBlock() {
  try { localStorage.removeItem(BLOCK_KEY); } catch { /* noop */ }
}

export function markMagicInviteClaimApproved(dealId?: string | null) {
  clearLocalRejection();
  clearLocalBlock();
  clearPendingRequest();
  markBrowserApproved();
  try {
    localStorage.setItem(
      MAGIC_CLAIM_KEY,
      JSON.stringify({ dealId: dealId || null, expiresAt: Date.now() + 10 * 60 * 1000 }),
    );
    localStorage.setItem(
      MAGIC_USER_KEY,
      JSON.stringify({ dealId: dealId || null, expiresAt: Date.now() + MAGIC_USER_TTL_MS }),
    );
  } catch { /* noop */ }
}

/** True when the current browser belongs to a magic-invite user. These users
 *  are restricted to the deal and support pages and must not see dashboard
 *  navigation. The flag persists across reloads for ~1 year so the
 *  restriction survives long-running deal threads. */
export function isMagicInviteUser(): boolean {
  try {
    const raw = localStorage.getItem(MAGIC_USER_KEY);
    if (!raw) return false;
    const record = JSON.parse(raw) as { expiresAt?: number };
    if (!record.expiresAt || record.expiresAt < Date.now()) {
      localStorage.removeItem(MAGIC_USER_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearMagicInviteUser() {
  try { localStorage.removeItem(MAGIC_USER_KEY); } catch { /* noop */ }
}

export function hasRecentMagicInviteClaim(dealId?: string | null): boolean {
  try {
    const raw = localStorage.getItem(MAGIC_CLAIM_KEY);
    if (!raw) return false;
    const record = JSON.parse(raw) as { dealId?: string | null; expiresAt?: number };
    if (!record.expiresAt || record.expiresAt < Date.now()) {
      localStorage.removeItem(MAGIC_CLAIM_KEY);
      return false;
    }
    return !dealId || !record.dealId || record.dealId === dealId;
  } catch {
    return false;
  }
}

export async function checkBrowserBlocked(browserId: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.functions.invoke("gate-block-check", {
      body: { browser_id: browserId },
    });
    if (error) return null;
    const d = data as { blocked?: boolean };
    return !!d?.blocked;
  } catch {
    return null;
  }
}

export interface RecordBlockArgs {
  browserId: string;
  reason?: string;
  riskScore?: number;
  metadata?: Record<string, unknown>;
}

export async function recordBrowserBlock(args: RecordBlockArgs): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("gate-block-record", {
      body: {
        browser_id: args.browserId,
        reason: args.reason || "risk_score",
        risk_score: args.riskScore ?? 1,
        metadata: args.metadata || null,
      },
    });
    if (error) return false;
    return !!(data as { blocked?: boolean })?.blocked;
  } catch {
    return false;
  }
}