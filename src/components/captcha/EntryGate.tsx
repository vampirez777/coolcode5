import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Wifi,
  Lock,
  Sparkles,
  Zap,
  LinkIcon,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  checkVpn,
  getCaptchaSitekey,
  isTrustedCountry,
  verifyCaptchaToken,
  type VpnCheckResult,
} from "@/lib/captcha";
import { BehavioralTracker } from "@/lib/behavioralTracker";
import { supabase } from "@/integrations/supabase/client";
import EmailOtpStep from "./steps/EmailOtpStep";
import MathStep from "./steps/MathStep";
import SliderStep from "./steps/SliderStep";
import BehavioralStep from "./steps/BehavioralStep";
import PowStep from "./steps/PowStep";
import ReasonStep from "./steps/ReasonStep";
import PendingApprovalStep from "./steps/PendingApprovalStep";
import QuizStep from "./steps/QuizStep";
import HumanProveStep from "./steps/HumanProveStep";
import BlockedStep from "./steps/BlockedStep";
import StaffLoginButton from "./StaffLoginButton";
import {
  getOrCreateBrowserId,
  isBrowserApproved,
  markBrowserApproved,
  rememberPendingRequest,
  getPendingRequest,
  clearPendingRequest,
  checkBrowserBlocked,
  recordBrowserBlock,
  isLocallyBlocked,
  markBrowserBlocked,
  clearLocalBlock,
  hasRecentMagicInviteClaim,
} from "@/lib/accessRequest";

/** Local persisted flag set when an admin rejected this browser's access
 *  request. Survives reloads so the user keeps seeing the rejection screen
 *  instead of flashing into the site after a token refresh. */
const REJECTED_KEY = "hmm.access.rejected.v1";
function isLocallyRejected(): boolean {
  try { return Boolean(localStorage.getItem(REJECTED_KEY)); } catch { return false; }
}
function markLocallyRejected() {
  try { localStorage.setItem(REJECTED_KEY, JSON.stringify({ at: Date.now() })); } catch { /* noop */ }
}
function clearLocalRejection() {
  try { localStorage.removeItem(REJECTED_KEY); } catch { /* noop */ }
}

/** Wipe any cached "approved" state so a now-blocked/rejected browser can't
 *  keep slipping into the site via the auth-state listener. */
function wipeApprovalCache() {
  try {
    localStorage.removeItem("hmm.access.approved.v1");
    localStorage.removeItem("hmm.entry.bypass.v1");
    localStorage.removeItem("hmm.access.pending.v1");
  } catch { /* noop */ }
}
import { useGlobalSecuritySettings } from "@/hooks/useGlobalSecuritySettings";

/* ----------------- Per-browser bypass ----------------- */
const BYPASS_KEY = "hmm.entry.bypass.v1";
const BYPASS_DAYS = 30;

interface BypassRecord {
  expiresAt: number;
  vpn: boolean;
  trusted: boolean;
}

function readBypass(): BypassRecord | null {
  try {
    const raw = localStorage.getItem(BYPASS_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as BypassRecord;
    if (!r?.expiresAt || r.expiresAt < Date.now()) return null;
    return r;
  } catch {
    return null;
  }
}
function writeBypass(record: Omit<BypassRecord, "expiresAt">) {
  const r: BypassRecord = {
    ...record,
    expiresAt: Date.now() + BYPASS_DAYS * 24 * 60 * 60 * 1000,
  };
  try { localStorage.setItem(BYPASS_KEY, JSON.stringify(r)); } catch { /* */ }
}

/* ----------------- Invite-link detection -----------------
 * Strict parser: only a *valid* deal invite URL bypasses the gate.
 * Any other route on halalmiddleman.net (root, /auth without invite,
 * /dashboard, /support, garbage paths, malformed invite ids, …) will
 * trigger the verification flow.
 *
 * Accepted shapes:
 *   1) /auth?invite=<UUID>             ← canonical, produced by the
 *                                        invite edge function redirect
 *   2) /invite/<UUID>                  ← legacy/path-based
 *   3) /auth/deal/invite/<UUID>        ← legacy/path-based
 *
 * Rules enforced:
 *   - The deal id MUST be a v1-v5 UUID. Random strings, empty values
 *     and obviously-fake ids do NOT count as a valid invite.
 *   - The query-param shape only counts when it's on the /auth route,
 *     so attackers can't tack `?invite=…` onto unrelated routes.
 *   - Trailing slashes and casing are tolerated.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidDealId(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_RE.test(value.trim());
}

function hasValidInvite(): boolean {
  try {
    const url = new URL(window.location.href);
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();

    // Magic-invite auto-login links — handled by MagicInviteClaim which
    // signs the user in, so let them through the entry gate.
    // New format: /deals/join?t=<base64url-43>
    // Legacy:     /magic-invite/<hex-64>
    if (path === "/deals/join") {
      const t = (url.searchParams.get("t") || "").trim();
      if (/^[A-Za-z0-9_-]{43}$/.test(t)) return true;
    }
    const mm = path.match(/^\/magic-invite\/([a-f0-9]{64})$/);
    if (mm) return true;

    // 1) /auth?invite=<UUID>  — only valid on the /auth route.
    if (path === "/auth" || path === "") {
      const q = url.searchParams.get("invite");
      if (isValidDealId(q)) return true;
    }

    // 2) /invite/<UUID>
    let m = path.match(/^\/invite\/([^/]+)$/);
    if (m && isValidDealId(m[1])) return true;

    // 3) /auth/deal/invite/<UUID>
    m = path.match(/^\/auth\/deal\/invite\/([^/]+)$/);
    if (m && isValidDealId(m[1])) return true;

    return false;
  } catch {
    return false;
  }
}

/** True when the visitor did NOT arrive via a valid deal invite link. */
function detectNoInvite(): boolean {
  return !hasValidInvite();
}

/** True when the current URL is a magic-invite auto-login link. */
function isMagicInviteRoute(): boolean {
  try {
    const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
    if (/^\/magic-invite\/[a-f0-9]{64}$/.test(path)) return true;
    if (path === "/deals/join") {
      const t = (new URL(window.location.href).searchParams.get("t") || "").trim();
      if (/^[A-Za-z0-9_-]{43}$/.test(t)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Routes that must stay reachable before a user has passed the entry gate. */
function isPublicAuthRoute(): boolean {
  try {
    const path = window.location.pathname.replace(/\/+$/, "").toLowerCase() || "/";
    return path === "/auth" || path === "/reset-password" || path === "/terms" || path === "/privacy";
  } catch {
    return false;
  }
}

/* ----------------- Phases ----------------- */

type Phase =
  | "checking"        // VPN + sitekey lookup
  | "vpn-warning"     // soft notice for VPN users
  | "no-invite-warning" // soft notice for visitors without an invite link
  | "captcha"         // step 1
  | "email-otp"       // step 2 (vpn-only)
  | "math"            // step 3 (vpn + non-trusted country)
  | "slider"          // step 4 (vpn + non-trusted)
  | "behavioral"      // step 5 (vpn + non-trusted)
  | "pow"             // step 6 (vpn + non-trusted)
  | "quiz"            // halal-themed MCQ (no-invite path)
  | "human"           // "Prove you are Human" gate
  | "reason"          // suspicious users only — request manual review
  | "pending"         // suspicious users only — waiting for admin
  | "blocked"         // terminal — admin must unblock
  | "done";

const EntryGate = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;
  // Global admin-controlled security toggles. Defaults to enabled when the
  // table or row is missing, so the gate stays "secure by default".
  const { isEnabled: isSecEnabled, loading: secLoading } = useGlobalSecuritySettings();
  const captchaOn = isSecEnabled("entry_captcha");
  const vpnCheckOn = isSecEnabled("entry_vpn_check");
  const quizOn = isSecEnabled("entry_quiz");
  const riskBlockOn = isSecEnabled("entry_risk_blocking");

  // Behavioral tracker is started immediately, regardless of which path
  // we end up needing. This way we have signal by the time the user reaches
  // the behavioral step.
  const trackerRef = useRef<BehavioralTracker>(new BehavioralTracker());
  useEffect(() => {
    const t = trackerRef.current;
    t.start_listening();
    return () => t.stop();
  }, []);

  const [phase, setPhase] = useState<Phase>(() => {
    // Auth and magic-invite routes must bypass the entry gate completely.
    // Otherwise new users and staff can be blocked before they can sign in.
    if (isPublicAuthRoute() || isMagicInviteRoute()) return "done";
    if (hasRecentMagicInviteClaim()) return "done";
    if (isLocallyRejected() && getPendingRequest()) return "pending";
    if (isLocallyBlocked() || isLocallyRejected()) return "checking";
    if (isBrowserApproved()) return "done";
    const b = readBypass();
    if (b) return "done";
    if (getPendingRequest()) return "pending";
    return "checking";
  });
  const [browserId] = useState<string>(() => getOrCreateBrowserId());
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(
    () => getPendingRequest(),
  );
  const [vpn, setVpn] = useState<VpnCheckResult | null>(null);
  const [trusted, setTrusted] = useState<boolean>(true);
  const [sitekey, setSitekey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [blockCheckDone, setBlockCheckDone] = useState<boolean>(() => {
    return isPublicAuthRoute() || isMagicInviteRoute() || hasRecentMagicInviteClaim() || !riskBlockOn;
  });
  const [blockCheckedRoute, setBlockCheckedRoute] = useState<string | null>(() => {
    return isPublicAuthRoute() || isMagicInviteRoute() || hasRecentMagicInviteClaim() || !riskBlockOn ? routeKey : null;
  });
  // True when the visitor arrived without a deal invite link.
  const [noInvite] = useState<boolean>(() => detectNoInvite());
  const widgetRef = useRef<HCaptcha | null>(null);

  // Per-step timing log used by the risk scorer on the no-invite path.
  const stepTimings = useRef<Record<string, number>>({});
  const stepStartedAt = useRef<number>(Date.now());
  const flowStartedAt = useRef<number>(Date.now());
  const [evaluatingHuman, setEvaluatingHuman] = useState(false);
  const hasAuthedUserRef = useRef(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  // Logged-in users (including admins and moderators) skip the entry gate
  // entirely. We check the existing Supabase session synchronously on mount
  // and also subscribe to auth changes so a fresh login during the gate
  // immediately dismisses it.
  useEffect(() => {
    let mounted = true;
    const approveAndDone = () => {
      if (!mounted) return;
      hasAuthedUserRef.current = true;
      setIsAuthed(true);
      clearLocalRejection();
      clearLocalBlock();
      writeBypass({ vpn: !!vpn?.vpn, trusted });
      markBrowserApproved();
      clearPendingRequest();
      setBlockCheckDone(true);
      setPhase("done");
    };
    const handleSession = async (user: { id: string } | null | undefined) => {
      if (!user) {
        if (!mounted) return;
        hasAuthedUserRef.current = false;
        setIsAuthed(false);
        setAuthReady(true);
        return;
      }
      // Any signed-in user (admins, moderators, regular users, and magic
      // invite users) bypasses the entry gate. Once a visitor has an active
      // session we don't want to re-run verification when they tab away and
      // come back, since that's disruptive.
      if (!mounted) return;
      approveAndDone();
      setAuthReady(true);
      return;
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void handleSession(data.session.user);
      } else if (mounted) {
        hasAuthedUserRef.current = false;
        setIsAuthed(false);
        setAuthReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void handleSession(session.user);
      } else {
        hasAuthedUserRef.current = false;
        setIsAuthed(false);
        setAuthReady(true);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // We intentionally only run this once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Server-side block check on mount. If the visitor's browser id is in the
  // gate_blocks table they cannot complete the flow until an admin removes it.
  useEffect(() => {
    if (isPublicAuthRoute() || isMagicInviteRoute() || hasRecentMagicInviteClaim()) {
      setBlockCheckDone(true);
      setBlockCheckedRoute(routeKey);
      if (hasRecentMagicInviteClaim()) setPhase("done");
      return;
    }
    // If admins disabled risk blocking globally, ignore the table entirely.
    if (!riskBlockOn) {
      clearLocalBlock();
      setBlockCheckedRoute(routeKey);
      setPhase((current) => {
        if (current !== "blocked" || isLocallyRejected()) return current;
        return getPendingRequest() ? "pending" : "checking";
      });
      setBlockCheckDone(true);
      return;
    }
    let mounted = true;
    setBlockCheckDone(false);
    setBlockCheckedRoute(null);
    checkBrowserBlocked(browserId).then(async (blocked) => {
      if (!mounted) return;
      // Only auto-approve when we've already verified the signed-in user is
      // an admin/moderator (hasAuthedUserRef is set by the role-aware
      // handler in the session effect above). A raw session alone is not
      // enough — regular users must still pass the entry gate.
      if (hasAuthedUserRef.current) {
        hasAuthedUserRef.current = true;
        setIsAuthed(true);
        setAuthReady(true);
        clearLocalRejection();
        clearLocalBlock();
        clearPendingRequest();
        markBrowserApproved();
        setBlockCheckedRoute(routeKey);
        setBlockCheckDone(true);
        setPhase("done");
        return;
      }
      if (blocked) {
        wipeApprovalCache();
        markBrowserBlocked();
        setPhase("blocked");
      } else if (blocked === false) {
        clearLocalBlock();
        setPhase((current) => {
          if (current !== "blocked" || isLocallyRejected()) return current;
          return getPendingRequest() ? "pending" : "checking";
        });
      }
      setBlockCheckedRoute(routeKey);
      setBlockCheckDone(true);
    });
    return () => { mounted = false; };
  }, [browserId, riskBlockOn, routeKey]);

  // A "suspicious" visitor must go through manual approval AFTER the
  // automated steps. We treat Tor exits, declared proxies, datacenter IPs
  // and (a future) blacklist hit as suspicious.
  const isSuspicious = useMemo(() => {
    if (!vpn) return false;
    return Boolean(vpn.is_tor || vpn.is_proxy || vpn.is_datacenter);
  }, [vpn]);

  // Determine which steps apply for the visitor's situation
  const flow = useMemo(() => {
    // No-invite visitors always go through: captcha → math → slider →
    // reason → pending. We keep it visible and mandatory regardless of
    // VPN/country since the goal is admin approval.
    if (noInvite && quizOn) {
      const steps: Phase[] = ["math", "slider", "quiz", "human", "reason"];
      if (captchaOn) steps.unshift("captcha");
      return { steps };
    }
    if (!vpnCheckOn || !vpn || !vpn.vpn) {
      return { steps: (captchaOn ? ["captcha"] : []) as Phase[] };
    }
    // VPN user (vpn check enabled)
    if (trusted) {
      const steps: Phase[] = ["email-otp"];
      if (captchaOn) steps.unshift("captcha");
      return { steps };
    }
    const base: Phase[] = ["email-otp", "math", "slider", "behavioral", "pow"];
    if (captchaOn) base.unshift("captcha");
    if (isSuspicious) base.push("reason");
    return { steps: base };
  }, [vpn, trusted, isSuspicious, noInvite, captchaOn, vpnCheckOn, quizOn]);

  const totalSteps = flow.steps.length;
  const currentStepIndex = (() => {
    const i = flow.steps.indexOf(phase);
    return i >= 0 ? i + 1 : 1;
  })();

  // Initial detection
  useEffect(() => {
    if (phase !== "checking") return;
    if (secLoading) return; // wait for global settings before deciding

    // If everything that gates entry is disabled by an admin, skip straight
    // through. Captcha + VPN + quiz all off ⇒ no checks at all.
    if (!captchaOn && !vpnCheckOn && !quizOn) {
      writeBypass({ vpn: false, trusted: true });
      markBrowserApproved();
      setPhase("done");
      return;
    }

    let mounted = true;
    const vpnPromise = vpnCheckOn
      ? checkVpn()
      : Promise.resolve({ vpn: false, is_vpn: false, is_proxy: false, is_tor: false, is_datacenter: false, country_code: null } as VpnCheckResult);
    const sitekeyPromise = captchaOn
      ? getCaptchaSitekey().catch((e) => e as Error)
      : Promise.resolve(null);
    Promise.all([vpnPromise, sitekeyPromise])
      .then(([vpnResult, sitekeyResult]) => {
        if (!mounted) return;
        setVpn(vpnResult);
        setTrusted(isTrustedCountry(vpnResult.country_code));
        if (sitekeyResult instanceof Error) {
          setError(sitekeyResult.message || "Could not load verification");
        } else if (sitekeyResult) {
          setSitekey(sitekeyResult);
        }
        // Priority: no-invite > vpn > captcha. Each path is gated by the
        // matching admin toggle so disabled checks are skipped entirely.
        if (noInvite && quizOn) setPhase("no-invite-warning");
        else if (vpnCheckOn && vpnResult.vpn) setPhase("vpn-warning");
        else if (captchaOn) setPhase("captcha");
        else {
          // No gate left to show — let the user in.
          writeBypass({ vpn: !!vpnResult.vpn, trusted: isTrustedCountry(vpnResult.country_code) });
          markBrowserApproved();
          setPhase("done");
        }
      });
    return () => { mounted = false; };
  }, [phase, noInvite, secLoading, captchaOn, vpnCheckOn, quizOn]);

  const advance = (from: Phase) => {
    // Record how long this step took for the risk scorer.
    stepTimings.current[from] = Date.now() - stepStartedAt.current;
    stepStartedAt.current = Date.now();
    const i = flow.steps.indexOf(from);
    if (i < 0 || i >= flow.steps.length - 1) {
      // last step → done. Persist a per-browser bypass.
      writeBypass({ vpn: !!vpn?.vpn, trusted });
      markBrowserApproved();
      setPhase("done");
      return;
    }
    setPhase(flow.steps[i + 1]);
  };

  // Reset the per-step timer whenever the phase changes so each step's
  // duration is measured independently.
  useEffect(() => {
    stepStartedAt.current = Date.now();
  }, [phase]);

  /**
   * Score the no-invite visitor when they click Proceed on the Human step.
   * Rules (per user spec):
   *   +1 if total time before clicking Proceed is < 15s ("clicked too fast")
   *   +1 if any *recent* step's timing was unusually fast OR slow
   * Score >= 1 → block (per user spec: "Stricter — block at score >= 1")
   */
  const evaluateAndAdvanceFromHuman = async (humanElapsedMs: number) => {
    setEvaluatingHuman(true);
    let score = 0;
    const reasons: string[] = [];

    const totalElapsedMs = Date.now() - flowStartedAt.current;
    if (totalElapsedMs < 15_000) {
      score += 1;
      reasons.push("total_under_15s");
    }

    // "Recent step was fast or slow" — look at the last two recorded steps
    // (excluding the Human step itself, which we measure separately).
    const FAST_MS = 800;     // bot-like instant clicks
    const SLOW_MS = 120_000; // walked away / scripted pause
    const recent = Object.entries(stepTimings.current).slice(-2);
    for (const [name, ms] of recent) {
      if (ms < FAST_MS) {
        score += 1;
        reasons.push(`${name}_too_fast_${ms}ms`);
        break; // only +1 from this category
      }
      if (ms > SLOW_MS) {
        score += 1;
        reasons.push(`${name}_too_slow_${ms}ms`);
        break;
      }
    }

    // The Human step itself: instant click is the strongest bot signal.
    if (humanElapsedMs < FAST_MS) {
      score += 1;
      reasons.push(`human_too_fast_${humanElapsedMs}ms`);
    }

    if (score >= 1) {
      if (!riskBlockOn) {
        // Admins disabled auto-blocking — let the user proceed instead.
        setEvaluatingHuman(false);
        advance("human");
        return;
      }
      await recordBrowserBlock({
        browserId,
        reason: "risk_score",
        riskScore: score,
        metadata: {
          reasons,
          total_elapsed_ms: totalElapsedMs,
          human_step_ms: humanElapsedMs,
          step_timings: stepTimings.current,
          path: "no-invite",
        },
      });
      markBrowserBlocked();
      setEvaluatingHuman(false);
      setPhase("blocked");
      return;
    }

    setEvaluatingHuman(false);
    advance("human");
  };

  const handleReasonSubmitted = (requestId: string) => {
    rememberPendingRequest(requestId);
    setPendingRequestId(requestId);
    setPhase("pending");
  };

  const handleApproved = () => {
    clearLocalRejection();
    clearLocalBlock();
    clearPendingRequest();
    markBrowserApproved();
    writeBypass({ vpn: !!vpn?.vpn, trusted });
    setPhase("done");
  };

  const handleCaptchaToken = async (token: string) => {
    setVerifying(true);
    setError(null);
    try {
      const ok = await verifyCaptchaToken(token);
      if (ok) {
        if (noInvite) {
          // No-invite visitors must complete the full manual-review flow.
          // Start the master flow timer at the first real interaction.
          flowStartedAt.current = Date.now();
          advance("captcha");
        } else if (!vpn?.vpn) {
          // Non-VPN: only one step. We're done.
          writeBypass({ vpn: false, trusted: true });
          setPhase("done");
        } else {
          advance("captcha");
        }
      } else {
        setError("Verification failed. Please try again.");
        widgetRef.current?.resetCaptcha();
      }
    } catch {
      setError("Verification error. Please try again.");
      widgetRef.current?.resetCaptcha();
    } finally {
      setVerifying(false);
    }
  };

  const isGateBypassRoute = isPublicAuthRoute() || isMagicInviteRoute() || hasRecentMagicInviteClaim();
  const needsServerBlockCheck = !isGateBypassRoute && riskBlockOn;
  const routeBlockCheckDone = !needsServerBlockCheck || (blockCheckDone && blockCheckedRoute === routeKey);
  const shouldHoldContent = !isGateBypassRoute && !isAuthed && (!authReady || !routeBlockCheckDone);

  if (phase === "done") {
    if (shouldHoldContent) return <CheckingScreen />;
    return <>{children}</>;
  }

  if (phase === "blocked" && isLocallyRejected() && pendingRequestId) {
    return (
      <PendingApprovalStep
        requestId={pendingRequestId}
        onApproved={handleApproved}
      />
    );
  }

  if (phase === "blocked") {
    if (!blockCheckDone) return <CheckingScreen />;
    return <BlockedStep />;
  }

  if (phase === "pending" && pendingRequestId) {
    return (
      <PendingApprovalStep
        requestId={pendingRequestId}
        onApproved={handleApproved}
      />
    );
  }

  if (phase === "checking") return <CheckingScreen />;

  if (phase === "vpn-warning") {
    const reason = vpn?.is_tor ? "Tor network" : vpn?.is_proxy ? "proxy server" : vpn?.is_vpn ? "VPN" : "anonymizing network";
    const stepCount = totalSteps;
    return (
      <GateShell tone="warning">
        <BrandHeader tone="warning" />
        <div className="flex flex-col items-center text-center">
          <div className="relative h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5 ring-1 ring-amber-500/30">
            <div className="absolute inset-0 rounded-2xl blur-xl bg-amber-500/20" />
            <ShieldAlert className="relative h-8 w-8 text-amber-500" />
          </div>
          <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Anonymizing network detected
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
            Extra security check required
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            We detected that you're connecting through a{" "}
            <span className="font-medium text-foreground">{reason}</span>.
            For your safety and to keep HalalMiddleman.net free of bots, we
            need {stepCount === 2 ? "two quick checks" : "a few quick checks"}.
            {isSuspicious && " Because your connection looks unusual, the last step is a short manual review."}
          </p>
          <div className="mt-6 w-full space-y-3">
            <InfoRow icon={<Zap className="h-4 w-4 text-primary" />} title="Faster experience without a VPN" body="Disabling your VPN will skip the extra steps and speed up the site noticeably." />
            <InfoRow icon={<Lock className="h-4 w-4 text-primary" />} title="Your account is never affected" body={trusted ? "We'll send a one-time code to an email of your choice — it doesn't sign you in or create an account." : "The email step doesn't sign you in or create an account. The other checks are anonymous."} />
            <InfoRow icon={<Wifi className="h-4 w-4 text-primary" />} title="VPN still works" body="If you'd like to keep your VPN on, just continue — once verified we'll remember this browser for 30 days." />
          </div>
          <Button onClick={() => setPhase("captcha")} className="mt-6 w-full" size="lg">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Start the {stepCount}-step check
          </Button>
          <p className="mt-3 text-xs text-muted-foreground/70">
            Or disable your VPN and refresh the page to skip these steps.
          </p>
        </div>
      </GateShell>
    );
  }

  if (phase === "no-invite-warning") {
    const stepCount = totalSteps;
    return (
      <GateShell tone="warning">
        <BrandHeader tone="warning" />
        <div className="flex flex-col items-center text-center">
          {/* Halal bot avatar — same gif used across the deal flow */}
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl blur-xl bg-amber-500/25" />
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden ring-1 ring-amber-500/30 bg-amber-500/10">
              <img
                src="/images/auto-bot.gif"
                alt="Halal Bot"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
              <ShieldAlert className="h-3.5 w-3.5 text-background" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            No invite link detected
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
            Extra verification required
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            We flagged your visit because you arrived without a{" "}
            <span className="font-medium text-foreground">deal invite link</span>.
            HalalMiddleman.net is invite-based for safety, so before you can
            browse the site you'll need to complete a quick{" "}
            <span className="font-medium text-foreground">{stepCount}-step check</span>{" "}
            and wait for an admin to approve your access.
          </p>

          <div className="mt-6 w-full space-y-3">
            <InfoRow
              icon={<LinkIcon className="h-4 w-4 text-primary" />}
              title="Got an invite link? Use it instead"
              body="If a friend or seller sent you a deal invite, open that link directly to skip these steps entirely."
            />
            <InfoRow
              icon={<ShieldCheck className="h-4 w-4 text-primary" />}
              title="Solve a hCaptcha + math + slider"
              body="Three quick visible challenges to confirm you're a real human, not a bot."
            />
            <InfoRow
              icon={<UserCheck className="h-4 w-4 text-primary" />}
              title="Wait for admin approval"
              body="Tell us why you'd like access. Our admins will review and approve your entry — usually within a few hours."
            />
          </div>

          <Button onClick={() => setPhase("captcha")} className="mt-6 w-full" size="lg">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Start the {stepCount}-step check
          </Button>
          <p className="mt-3 text-xs text-muted-foreground/70">
            Once approved we'll remember this browser for 30 days — no need to verify again.
          </p>
        </div>
      </GateShell>
    );
  }

  if (phase === "captcha") {
    return (
      <GateShell>
        <BrandHeader />
        {/* Step pips */}
        <div className="mb-6 flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => {
            const isActive = i + 1 === currentStepIndex;
            const isDone = i + 1 < currentStepIndex;
            return (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  isDone
                    ? "bg-primary"
                    : isActive
                      ? "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                      : "bg-muted"
                }`}
              />
            );
          })}
        </div>
        <div className="mb-5 flex items-center justify-between text-[11px] uppercase tracking-wider">
          <span className="font-semibold text-muted-foreground">
            Step {currentStepIndex} <span className="text-muted-foreground/50">/ {totalSteps}</span>
          </span>
          <span className="font-medium text-primary/80">Verifying</span>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl blur-xl bg-primary/20" />
            <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
            Quick security check
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Confirm you're human to enter HalalMiddleman.net. This protects every escrow deal on the platform.
          </p>

          <div className="my-6 flex flex-col items-center justify-center min-h-[110px] w-full">
            {!sitekey && !error && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading challenge…
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            )}
            {sitekey && (
              <HCaptcha
                ref={widgetRef}
                sitekey={sitekey}
                onVerify={handleCaptchaToken}
                onError={() => setError("Challenge errored. Please retry.")}
                onExpire={() => widgetRef.current?.resetCaptcha()}
                theme="dark"
              />
            )}
            {verifying && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Encrypted
            </div>
            <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <div>Powered by hCaptcha</div>
          </div>
        </div>
      </GateShell>
    );
  }

  if (phase === "email-otp") {
    return (
      <EmailOtpStep
        step={currentStepIndex}
        total={totalSteps}
        onSuccess={() => advance("email-otp")}
      />
    );
  }
  if (phase === "math") {
    return (
      <MathStep
        step={currentStepIndex}
        total={totalSteps}
        onSuccess={() => advance("math")}
      />
    );
  }
  if (phase === "slider") {
    return (
      <SliderStep
        step={currentStepIndex}
        total={totalSteps}
        onSuccess={() => advance("slider")}
      />
    );
  }
  if (phase === "behavioral") {
    return (
      <BehavioralStep
        step={currentStepIndex}
        total={totalSteps}
        tracker={trackerRef.current}
        onSuccess={() => advance("behavioral")}
      />
    );
  }
  if (phase === "pow") {
    return (
      <PowStep
        step={currentStepIndex}
        total={totalSteps}
        onSuccess={() => advance("pow")}
      />
    );
  }
  if (phase === "reason") {
    return (
      <ReasonStep
        step={currentStepIndex}
        total={totalSteps}
        browserId={browserId}
        onSubmitted={handleReasonSubmitted}
        variant={noInvite ? "no-invite" : "vpn"}
      />
    );
  }

  if (phase === "quiz") {
    return (
      <QuizStep
        step={currentStepIndex}
        total={totalSteps}
        onComplete={(timings) => {
          stepTimings.current["quiz"] = timings.reduce((a, b) => a + b, 0);
          // Flag suspiciously fast or slow per-question timing.
          const min = Math.min(...timings);
          const max = Math.max(...timings);
          stepTimings.current["quiz_min_q_ms"] = min;
          stepTimings.current["quiz_max_q_ms"] = max;
          stepStartedAt.current = Date.now();
          const i = flow.steps.indexOf("quiz");
          setPhase(flow.steps[i + 1]);
        }}
      />
    );
  }

  if (phase === "human") {
    return (
      <HumanProveStep
        step={currentStepIndex}
        total={totalSteps}
        busy={evaluatingHuman}
        onProceed={(elapsedMs) => evaluateAndAdvanceFromHuman(elapsedMs)}
      />
    );
  }

  return null;
};

/* ---------- helpers ---------- */

const CheckingScreen = () => (
  <GateShell>
    <BrandHeader />
    <div className="flex flex-col items-center text-center">
      <div className="relative h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 ring-1 ring-primary/20">
        <span className="absolute inset-0 rounded-2xl bg-primary/20 animate-slow-ping" />
        <Loader2 className="relative h-8 w-8 text-primary animate-spin" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
        Securing your connection
      </h1>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        Running a quick safety check to keep this platform free of bots and abuse…
      </p>
      <div className="mt-6 w-full space-y-2">
        <SkeletonRow label="Network analysis" />
        <SkeletonRow label="Reputation check" delay={150} />
        <SkeletonRow label="Loading challenge" delay={300} />
      </div>
    </div>
  </GateShell>
);

const GateShell = ({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "warning";
}) => (
  <div className="min-h-screen w-full bg-background flex items-center justify-center p-6 relative overflow-hidden">
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full blur-3xl opacity-25 animate-pulse ${
          tone === "warning" ? "bg-amber-500" : "bg-primary"
        }`}
        style={{ animationDuration: "4s" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--primary)/0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
    </div>
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-7 sm:p-8 shadow-2xl shadow-primary/5">
        {children}
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
        Protected by enterprise-grade verification • Your privacy is preserved
      </p>
      <StaffLoginButton />
    </div>
  </div>
);

const BrandHeader = ({ tone = "default" }: { tone?: "default" | "warning" }) => (
  <div className="mb-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
    <ShieldCheck className={`h-3.5 w-3.5 ${tone === "warning" ? "text-amber-500" : "text-primary"}`} />
    <span className="font-medium tracking-wide">HalalMiddleman security</span>
  </div>
);

const SkeletonRow = ({ label, delay = 0 }: { label: string; delay?: number }) => (
  <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-xs">
    <div
      className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    />
    <span className="text-muted-foreground">{label}</span>
    <Loader2
      className="ml-auto h-3 w-3 text-muted-foreground/50 animate-spin"
      style={{ animationDelay: `${delay}ms` }}
    />
  </div>
);

const InfoRow = ({ icon, title, body }: { icon: ReactNode; title: string; body: string }) => (
  <div className="flex items-start gap-3 text-left rounded-xl border border-border/50 bg-background/40 p-3">
    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
    </div>
  </div>
);

export default EntryGate;
