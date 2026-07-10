import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Sparkles, Settings2, Palette, RefreshCw, ShieldCheck, Activity,
  BarChart3, Cookie, Megaphone, GraduationCap, ChevronRight, ChevronLeft,
  X, CheckCircle2, Rocket, Eye, Wand2, Trophy,
} from "lucide-react";

const KEY = "hmm:maint-tutorial-done";

type Step = {
  icon: typeof Sparkles;
  badge: string;
  title: string;
  body: string;
  target?: string;       // data-tour="..." attribute on the element to spotlight
  placement?: "top" | "bottom" | "left" | "right" | "center";
};

const STEPS: Step[] = [
  {
    icon: GraduationCap, badge: "Welcome",
    title: "Welcome to the Maintenance Portal",
    body: "We've prepared a quick guided tour of every feature on this page — security checks, live customization, real-time status, and more. Takes about 60 seconds.",
    placement: "center",
  },
  {
    icon: Megaphone, badge: "Step 1 · Announcement",
    title: "The Live Security Announcement Bar",
    body: "The bar scrolling at the top broadcasts what our security perimeter is doing right now — TLS handshakes, threat scans, edge routing, and 47 health probes streaming in real time.",
    target: "tour-announcement", placement: "bottom",
  },
  {
    icon: ShieldCheck, badge: "Step 2 · Status",
    title: "Encrypted Connection Status",
    body: "The badges in the header confirm your connection is encrypted end-to-end and that the site is in scheduled maintenance — not down, not hacked, just upgrading.",
    target: "tour-status", placement: "bottom",
  },
  {
    icon: Settings2, badge: "Step 3 · Customize",
    title: "Click 'Customize' to Personalize Everything",
    body: "Open the customizer to change theme color, font, layout density, particle background, language, and 15+ other preferences. Your choices save automatically to your browser.",
    target: "tour-customize", placement: "bottom",
  },
  {
    icon: BarChart3, badge: "Step 4 · Live Stats",
    title: "Real-Time Status Tiles",
    body: "Your local time, the elapsed maintenance duration, and current system status — all updated every second. The pulsing dot means the maintenance engine is actively working.",
    target: "tour-stats", placement: "top",
  },
  {
    icon: Activity, badge: "Step 5 · Progress",
    title: "Maintenance Progress Bar",
    body: "The glowing progress strip shows current upgrade phase. The page auto-refreshes — you don't need to do anything. Sit back, the bar pulses while work continues server-side.",
    target: "tour-progress", placement: "top",
  },
  {
    icon: RefreshCw, badge: "Step 6 · Try Again",
    title: "Manually Re-check at Any Time",
    body: "If you want to check immediately whether maintenance has finished, click 'Try again'. This re-fetches the live maintenance flag from the server — no waiting required.",
    target: "tour-retry", placement: "top",
  },
  {
    icon: Eye, badge: "Step 7 · Security Check",
    title: "Continuous Security Verification",
    body: "The emerald panel cycles through real security checks — browser integrity, fingerprint validation, captcha confirmation, TLS handshake. Each check runs on a 2-second rotation.",
    target: "tour-securitycheck", placement: "top",
  },
  {
    icon: Cookie, badge: "Step 8 · Cookies",
    title: "Cookie & Privacy Strip",
    body: "The panel on the right details exactly which cookies we use — all strictly necessary, zero tracking, fully GDPR and CCPA compliant. No banners hidden behind 'legitimate interest'.",
    target: "tour-cookies", placement: "left",
  },
  {
    icon: Wand2, badge: "Step 9 · Effects",
    title: "Falling Embers & Glow Effects",
    body: "The particles raining across the screen are pure CSS canvas — zero impact on performance. You can disable all motion at once from the Customize panel's 'Reduce motion' switch.",
    placement: "center",
  },
  {
    icon: Trophy, badge: "Final · Done",
    title: "You're All Set",
    body: "That's every feature on the page. We'll keep you posted via the announcement bar and security toasts. Thanks for waiting while we make the platform better.",
    placement: "center",
  },
];

function getRect(target?: string): DOMRect | null {
  if (!target) return null;
  const el = document.querySelector(`[data-tour="${target}"]`);
  return el ? (el as HTMLElement).getBoundingClientRect() : null;
}

export default function MaintenanceTutorial() {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return true;
    return localStorage.getItem(KEY) !== "1";
  });
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tick, setTick] = useState(0); // re-measure on scroll/resize

  const step = STEPS[i];

  useLayoutEffect(() => {
    if (!open) return;
    setRect(getRect(step.target));
  }, [open, i, tick, step.target]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => setTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open]);

  // Auto-scroll the highlighted target into view
  useEffect(() => {
    if (!open || !step.target) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [open, i, step.target]);

  // Lock background scroll while tour is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const finish = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setOpen(false);
  };
  const skip = () => finish();
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : finish());
  const back = () => setI((p) => Math.max(0, p - 1));

  const progressPct = useMemo(() => Math.round(((i + 1) / STEPS.length) * 100), [i]);

  // Card position
  const cardStyle = useMemo<React.CSSProperties>(() => {
    if (!rect || step.placement === "center") {
      return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    }
    const pad = 18;
    const cardW = 420, cardH = 280;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = rect.left + rect.width / 2 - cardW / 2;
    let top = rect.bottom + pad;
    if (step.placement === "top")    top = rect.top - cardH - pad;
    if (step.placement === "left")  { left = rect.left - cardW - pad; top = rect.top + rect.height / 2 - cardH / 2; }
    if (step.placement === "right") { left = rect.right + pad;        top = rect.top + rect.height / 2 - cardH / 2; }
    left = Math.max(12, Math.min(left, vw - cardW - 12));
    top  = Math.max(12, Math.min(top,  vh - cardH - 12));
    return { left, top };
  }, [rect, step.placement]);

  if (!open) return null;
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[120]" style={{ fontFamily: "'Outfit', 'Inter', system-ui, sans-serif" }}>
      {/* SVG overlay with cut-out spotlight */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && step.placement !== "center" && (
              <rect
                x={rect.left - 10} y={rect.top - 10}
                width={rect.width + 20} height={rect.height + 20}
                rx={16} ry={16} fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="hsl(var(--background))" fillOpacity="0.78" mask="url(#tour-mask)" />
      </svg>

      {/* Glowing ring around target */}
      {rect && step.placement !== "center" && (
        <div
          className="pointer-events-none absolute rounded-2xl border-2 border-primary"
          style={{
            left: rect.left - 10, top: rect.top - 10,
            width: rect.width + 20, height: rect.height + 20,
            boxShadow: "0 0 0 4px hsl(var(--primary)/0.25), 0 0 40px 8px hsl(var(--primary)/0.6), inset 0 0 20px hsl(var(--primary)/0.25)",
            animation: "tourPulse 1.8s ease-in-out infinite",
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        className="absolute w-[420px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-primary/40 bg-card/95 shadow-[0_30px_100px_-20px_hsl(var(--primary)/0.6)] backdrop-blur-2xl"
        style={cardStyle}
      >
        {/* animated border sweep */}
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-70"
          style={{
            background: "linear-gradient(135deg, transparent 40%, hsl(var(--primary)/0.45) 50%, transparent 60%)",
            backgroundSize: "300% 300%",
            animation: "tourSweep 3.5s ease-in-out infinite",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Top progress strip */}
        <div className="relative h-1.5 w-full bg-muted/40">
          <div
            className="h-full rounded-r-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 transition-all duration-500"
            style={{ width: `${progressPct}%`, boxShadow: "0 0 14px hsl(var(--primary)/0.6)" }}
          />
        </div>

        <div className="relative p-5">
          {/* Header */}
          <div className="mb-3 flex items-start gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/0.55)]">
              <Icon className="h-5 w-5" />
              <span className="absolute inset-0 rounded-xl border border-primary/40" style={{ animation: "tourPulse 2.5s ease-in-out infinite" }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-primary"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {step.badge}
                </span>
                <span className="text-[10px] font-bold tabular-nums text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {String(i + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
                </span>
              </div>
              <h3
                className="mt-1.5 text-[17px] font-extrabold leading-tight tracking-tight text-foreground"
                style={{ fontFamily: "'Outfit', system-ui, sans-serif", letterSpacing: "-0.02em" }}
              >
                {step.title}
              </h3>
            </div>
            <button
              onClick={skip}
              className="ml-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              aria-label="Skip tutorial"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <p className="text-[13px] leading-relaxed text-foreground/85">{step.body}</p>

          {/* Step pip rail */}
          <div className="mt-4 flex items-center gap-1">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  idx < i ? "bg-primary/60"
                  : idx === i ? "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]"
                  : "bg-muted/60 hover:bg-muted"
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Footer controls */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              onClick={skip}
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={back}
                disabled={i === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-[11.5px] font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={next}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[11.5px] font-bold uppercase tracking-wider text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/0.5)] transition-all hover:shadow-[0_0_32px_hsl(var(--primary)/0.7)] hover:scale-[1.03]"
              >
                {i === STEPS.length - 1
                  ? (<><CheckCircle2 className="h-4 w-4" /> Finish</>)
                  : (<>Next <ChevronRight className="h-3.5 w-3.5" /></>)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating "tutorial in progress" pill */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border border-primary/40 bg-card/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-primary backdrop-blur-md shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        <Sparkles className="mr-1.5 inline h-3 w-3" /> Interactive tutorial · {progressPct}%
      </div>

      <style>{`
        @keyframes tourPulse {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%      { opacity: 0.7; transform: scale(1.015); }
        }
        @keyframes tourSweep {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

/** Floating launcher to restart the tour after it's been completed. */
export function TutorialLauncher() {
  const [show, setShow] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(KEY) === "1";
  });
  if (!show) return null;
  return (
    <button
      onClick={() => { try { localStorage.removeItem(KEY); } catch {} ; setShow(false); window.location.reload(); }}
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-card/85 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-primary backdrop-blur-md shadow-[0_0_22px_hsl(var(--primary)/0.4)] transition-all hover:shadow-[0_0_32px_hsl(var(--primary)/0.6)] hover:scale-105"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <Rocket className="h-3.5 w-3.5" /> Replay tutorial
    </button>
  );
}