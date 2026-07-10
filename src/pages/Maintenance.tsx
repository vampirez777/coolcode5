import { useEffect, useState, useRef } from "react";
import {
  Wrench,
  Clock,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Mail,
  Zap,
  Timer,
  ArrowUpRight,
  Activity,
  Lock,
  KeyRound,
  Fingerprint,
  ServerCog,
  EyeOff,
  CheckCircle2,
  Globe2,
  Cpu,
  MapPin,
  MousePointerClick,
  Wifi,
  Hash,
  ScanFace,
  Radar,
  Loader2,
  Bell,
  Rss,
  Info,
  Flame,
  Satellite,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import maintenanceBg from "@/assets/maintenance-bg.jpg";
import FortressGate from "@/components/maintenance/FortressGate";
import { useExitLock } from "@/components/maintenance/useExitLock";
import MaintenanceCustomizer, {
  loadPrefs,
  fontFamilyFor,
  radiusFor,
  maxWidthFor,
  paddingFor,
  TRANSLATIONS,
  type MaintPrefs,
} from "@/components/maintenance/MaintenanceCustomizer";
import AnnouncementBar from "@/components/maintenance/AnnouncementBar";
import CookieSidebar from "@/components/maintenance/CookieSidebar";
import SecurityToasts from "@/components/maintenance/SecurityToasts";
import MaintenanceTutorial, { TutorialLauncher } from "@/components/maintenance/MaintenanceTutorial";

interface MaintenancePageProps {
  message?: string | null;
}

/* Convert #rrggbb → "H S% L%" string for HSL CSS variable use. */
function hexToHsl(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16) / 255;
  const g = parseInt(m.substring(2, 4), 16) / 255;
  const b = parseInt(m.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/* ─── 10-step verification gate ─── */
const VERIFICATION_STEPS = [
  { icon: Globe2,            label: "Verifying browser integrity",        detail: "Inspecting user-agent & headers" },
  { icon: Fingerprint,       label: "Generating device fingerprint",      detail: "Canvas + audio entropy" },
  { icon: KeyRound,          label: "Establishing TLS 1.3 channel",       detail: "Forward-secret session keys" },
  { icon: MapPin,            label: "Resolving regional gateway",         detail: "GeoIP + edge routing" },
  { icon: Wifi,              label: "Scanning for VPN / Proxy / Tor",     detail: "IP reputation lookup" },
  { icon: MousePointerClick, label: "Analyzing input behavior",           detail: "Bot vs. human heuristics" },
  { icon: ScanFace,          label: "hCaptcha challenge",                 detail: "Confirm you are human" }, // interactive
  { icon: Cpu,               label: "Solving proof-of-work puzzle",       detail: "SHA-256 difficulty 4" },
  { icon: Hash,              label: "Issuing signed session token",       detail: "Ed25519 receipt" },
  { icon: Radar,             label: "Final perimeter scan",               detail: "DDoS shield armed" },
] as const;

function VerificationGate({ onComplete }: { onComplete: () => void }) {
  useExitLock(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(() =>
    Array(VERIFICATION_STEPS.length).fill(false),
  );
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [done, setDone] = useState(false);

  // Auto-advance, pausing at the hCaptcha step until user clicks.
  useEffect(() => {
    if (done) return;
    if (stepIdx >= VERIFICATION_STEPS.length) {
      setDone(true);
      return;
    }
    if (stepIdx === 6 && !captchaChecked) return; // wait for click

    const delay = stepIdx === 7 ? 1500 : 750 + Math.random() * 400;
    const t = setTimeout(() => {
      setCompleted((prev) => {
        const next = [...prev];
        next[stepIdx] = true;
        return next;
      });
      setStepIdx((i) => i + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [stepIdx, captchaChecked, done]);

  const progressPct = Math.round(
    (completed.filter(Boolean).length / VERIFICATION_STEPS.length) * 100,
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 p-4 backdrop-blur-2xl">
      {/* ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full"
             style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.18) 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/95 p-6 shadow-[0_40px_120px_-30px_hsl(var(--primary)/0.5)] sm:p-7"
           style={{ fontFamily: "'Inter', 'Geist', system-ui, sans-serif" }}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

        {/* header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
            <ShieldCheck className="h-5 w-5" />
            <span className="absolute inset-0 rounded-xl border border-primary/40" style={{ animation: "orbitRing 3s linear infinite" }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              Security Verification
            </h2>
            <p className="text-[11px] font-medium text-muted-foreground">
              10-step perimeter check before entry
            </p>
          </div>
          <div className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary"
               style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {progressPct}%
          </div>
        </div>

        {/* progress bar */}
        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-muted/60 ring-1 ring-border/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 transition-all duration-500"
            style={{ width: `${progressPct}%`, boxShadow: "0 0 12px hsl(var(--primary)/0.5)" }}
          />
        </div>

        {/* steps list */}
        <ol className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1 -mr-1">
          {VERIFICATION_STEPS.map((step, i) => {
            const isDone = completed[i];
            const isActive = i === stepIdx && !done;
            const Icon = step.icon;
            return (
              <li
                key={i}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                  isDone
                    ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                    : isActive
                    ? "border-primary/40 bg-primary/[0.07] shadow-[0_0_18px_hsl(var(--primary)/0.18)]"
                    : "border-border/40 bg-background/40 opacity-60"
                }`}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  isDone ? "bg-emerald-500/15 text-emerald-400"
                  : isActive ? "bg-primary/15 text-primary"
                  : "bg-muted/50 text-muted-foreground"
                }`}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" />
                   : isActive ? <Loader2 className="h-4 w-4 animate-spin" />
                   : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-foreground/90">
                    <span className="mr-1.5 text-muted-foreground/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {step.label}
                  </p>
                  <p className="truncate text-[10.5px] text-muted-foreground">{step.detail}</p>
                </div>
                {isActive && i === 6 && !captchaChecked && (
                  <button
                    type="button"
                    onClick={() => setCaptchaChecked(true)}
                    className="shrink-0 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/25"
                  >
                    I'm human
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        {/* footer */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
             style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {done ? "All checks passed" : "Do not refresh — verification in progress"}
          </p>
          <Button
            disabled={!done}
            onClick={onComplete}
            className="h-9 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.35)] disabled:opacity-40 disabled:shadow-none"
          >
            {done ? (<><CheckCircle2 className="mr-1.5 h-4 w-4" /> Enter</>)
                  : (<><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Verifying</>)}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── floating particles (canvas) ─── */
function useParticles(canvasRef: React.RefObject<HTMLCanvasElement | null>, count: number = 60) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (count <= 0) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
      glow: number;
    }[] = [];

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const PARTICLE_COUNT = count;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.5 + 0.15,
        glow: Math.random() > 0.7 ? 1 : 0,
      });
    }

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "108 100% 66%";

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        if (p.glow) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = `hsl(${primary} / 0.8)`;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fillStyle = `hsl(${primary} / ${p.alpha})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // connect nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsl(${primary} / ${0.06 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef, count]);
}

/* ─── animated counter digits ─── */

/* ─── Falling embers/sparks canvas overlay (always-on glow rain) ─── */
function useFallingEmbers(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  enabled: boolean,
  density: number = 90,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!enabled) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const embers = Array.from({ length: density }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vy: 0.4 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.4,
      r: 0.6 + Math.random() * 2.2,
      a: 0.25 + Math.random() * 0.6,
      twk: Math.random() * Math.PI * 2,
    }));

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const primary =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--primary")
          .trim() || "108 100% 66%";

      for (const e of embers) {
        e.y += e.vy;
        e.x += e.vx + Math.sin((e.twk += 0.02)) * 0.3;
        if (e.y > h + 4) {
          e.y = -4;
          e.x = Math.random() * w;
        }
        if (e.x < -4) e.x = w + 4;
        if (e.x > w + 4) e.x = -4;

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.shadowBlur = 14;
        ctx.shadowColor = `hsl(${primary} / 0.9)`;
        ctx.fillStyle = `hsl(${primary} / ${e.a})`;
        ctx.fill();

        // soft trailing streak
        ctx.beginPath();
        ctx.strokeStyle = `hsl(${primary} / ${e.a * 0.35})`;
        ctx.lineWidth = e.r * 0.6;
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x - e.vx * 6, e.y - e.vy * 6);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [canvasRef, enabled, density]);
}

function AnimatedDigit({ value }: { value: string }) {
  return (
    <span className="relative inline-flex h-[1.2em] w-[0.65em] flex-col overflow-hidden tabular-nums">
      <span
        className="inline-block transition-transform duration-500 ease-out"
        style={{ transform: `translateY(-${parseInt(value) * 10}%)` }}
      >
        {"0123456789".split("").map((d) => (
          <span key={d} className="block h-[1.2em] leading-[1.2em]">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

function AnimatedNumber({ value, pad = 2 }: { value: number; pad?: number }) {
  const str = value.toString().padStart(pad, "0");
  return (
    <span className="tabular-nums">
      {str.split("").map((ch, i) => (
        <AnimatedDigit key={i} value={ch} />
      ))}
    </span>
  );
}

const formatTime = (d: Date, h12: boolean) =>
  d.toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: h12,
  });

const MaintenancePage = ({ message }: MaintenancePageProps) => {
  const [now, setNow] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);
  const [start] = useState(() => Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const embersRef = useRef<HTMLCanvasElement>(null);

  // Visitor-controlled preferences (20 customizations).
  const [prefs, setPrefs] = useState<MaintPrefs>(() => loadPrefs());
  const accentHsl = hexToHsl(prefs.accent);
  const t = TRANSLATIONS[prefs.language];
  useParticles(canvasRef, prefs.reduceMotion ? 0 : (prefs.bgStyle === "particles" ? prefs.particleDensity : 0));
  useFallingEmbers(embersRef, !prefs.reduceMotion, 80);

  // Cursor glow trail (pref 16)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!prefs.cursorTrail) { setCursor(null); return; }
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [prefs.cursorTrail]);

  const [gateUnlocked, setGateUnlocked] = useState<boolean>(() => {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem("hmm:maint-gate") === "1";
  });
  const [tier1Done, setTier1Done] = useState<boolean>(() => {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem("hmm:maint-tier1") === "1";
  });
  const completeTier1 = () => {
    try { sessionStorage.setItem("hmm:maint-tier1", "1"); } catch {}
    setTier1Done(true);
  };
  const unlock = () => {
    try { sessionStorage.setItem("hmm:maint-gate", "1"); } catch {}
    setGateUnlocked(true);
  };

  // Passive "browser verification" simulation — purely visual reassurance
  const verifySteps = [
    { icon: Globe2, label: "Verifying browser integrity" },
    { icon: Fingerprint, label: "Validating device fingerprint" },
    { icon: ShieldCheck, label: "CAPTCHA challenge passed" },
    { icon: KeyRound, label: "TLS 1.3 handshake secured" },
    { icon: CheckCircle2, label: "All security checks passed" },
  ];
  const [verifyIdx, setVerifyIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setVerifyIdx((i) => (i + 1) % verifySteps.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [start]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-background text-foreground"
      style={{
        fontFamily: `'Outfit', ${fontFamilyFor(prefs.font)}`,
        fontSize: `${prefs.fontScale * 16}px`,
        ["--primary" as any]: accentHsl,
      }}
      dir={prefs.language === "ar" ? "rtl" : "ltr"}
    >
      {!gateUnlocked && !tier1Done && <VerificationGate onComplete={completeTier1} />}
      {!gateUnlocked && tier1Done && <FortressGate onComplete={unlock} />}

      {/* Cursor glow trail (pref 16) */}
      {prefs.cursorTrail && cursor && (
        <div
          className="pointer-events-none fixed z-[60] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
          style={{
            left: cursor.x, top: cursor.y,
            background: "radial-gradient(circle, hsl(var(--primary)/0.45) 0%, transparent 70%)",
            filter: "blur(10px)",
          }}
        />
      )}

      {/* ── Hero background image ── */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-[0.28]"
        style={{ backgroundImage: `url(${maintenanceBg})`, display: prefs.bgStyle === "none" ? "none" : undefined }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />

      {/* ── Canvas particles ── */}
      {prefs.bgStyle === "particles" && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-0"
          style={{ opacity: 0.9 }}
        />
      )}

      {/* ── Falling embers (always-on glow rain) ── */}
      <canvas
        ref={embersRef}
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ opacity: 0.85, mixBlendMode: "screen" }}
      />

      {/* ── Alternative background styles ── */}
      {prefs.bgStyle === "aurora" && (
        <div className="pointer-events-none absolute inset-0 z-0 opacity-70"
          style={{
            background: "conic-gradient(from 180deg at 50% 50%, hsl(var(--primary)/0.25) 0deg, transparent 90deg, hsl(var(--primary)/0.2) 180deg, transparent 270deg, hsl(var(--primary)/0.25) 360deg)",
            filter: "blur(80px)",
            animation: prefs.reduceMotion ? undefined : "borderGlow 12s linear infinite",
          }} />
      )}
      {prefs.bgStyle === "starfield" && (
        <div className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: "radial-gradient(white 1px, transparent 1px), radial-gradient(white 1px, transparent 1px)",
            backgroundSize: "120px 120px, 80px 80px",
            backgroundPosition: "0 0, 40px 40px",
            opacity: 0.2,
          }} />
      )}
      {prefs.bgStyle === "matrix" && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-30"
          style={{
            background: "repeating-linear-gradient(to bottom, hsl(var(--primary)/0.15) 0 2px, transparent 2px 4px)",
            maskImage: "linear-gradient(to bottom, black, transparent)",
          }} />
      )}

      {/* ── Deep ambient glow orbs ── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute -top-20 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.22) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute top-1/3 -right-32 h-[450px] w-[450px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.14) 0%, transparent 70%)",
            filter: "blur(90px)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      {/* ── Grid overlay ── */}
      <div
          className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
            opacity: prefs.bgStyle === "grid" ? 0.12 : 0.035,
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* ── Live security announcement marquee ── */}
        <div data-tour="tour-announcement">
          <AnnouncementBar />
        </div>

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-2.5" data-tour="tour-customize">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/20">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <MaintenanceCustomizer prefs={prefs} setPrefs={setPrefs} />
          </div>
          <div className="flex items-center gap-2.5" data-tour="tour-status">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400 backdrop-blur-sm">
              <Lock className="h-3 w-3" /> {t.secureConn}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              {t.maintenance}
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full" style={{ maxWidth: maxWidthFor(prefs.cardWidth) }}>
            {/* ═══════ HERO CARD ═══════ */}
            <div
              className="group relative overflow-hidden border border-border/40 bg-card/40 backdrop-blur-2xl shadow-[0_40px_100px_-40px_hsl(var(--primary)/0.35)]"
              style={{ borderRadius: radiusFor(prefs.radius), padding: paddingFor(prefs.density) }}
            >
              {/* animated border glow */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  borderRadius: radiusFor(prefs.radius),
                  opacity: prefs.reduceMotion ? 0 : 0.6 * prefs.glow,
                  background:
                    "linear-gradient(135deg, transparent 40%, hsl(var(--primary)/0.35) 50%, transparent 60%)",
                  backgroundSize: "300% 300%",
                  animation: prefs.reduceMotion ? undefined : "borderGlow 4s ease-in-out infinite",
                }}
              />
              <div className="absolute inset-[1px]"
                style={{ borderRadius: `calc(${radiusFor(prefs.radius)} - 1px)`, background: `hsl(var(--card) / ${prefs.cardOpacity})` }} />

              {/* shimmer top line */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

              {/* content */}
              <div className="relative">
                {/* ── Orbital icon ── */}
                <div className="relative mx-auto mb-8 h-28 w-28">
                  {/* outer slow ring */}
                  <span
                    className="absolute inset-0 rounded-full border border-primary/20"
                    style={{ animation: "orbitRing 8s linear infinite" }}
                  />
                  <span
                    className="absolute inset-1 rounded-full border border-dashed border-primary/15"
                    style={{ animation: "orbitRingReverse 12s linear infinite" }}
                  />
                  {/* glow backing */}
                  <div className="absolute inset-4 rounded-full bg-primary/10 blur-xl" />
                  <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/30 to-primary/5" />
                  {/* icon */}
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-primary/30 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-[0_0_40px_hsl(var(--primary)/0.45)]">
                    <Wrench
                      className="h-11 w-11 drop-shadow-lg"
                      style={{ animation: "spinWrench 5s ease-in-out infinite alternate" }}
                    />
                  </div>
                  {/* spark orb */}
                  <span
                    className="absolute -top-1 right-4 h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
                    style={{ animation: "sparkOrbit 4s ease-in-out infinite" }}
                  />
                </div>

                {/* ── Text ── */}
                <div className="text-center space-y-4">
                  <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-primary backdrop-blur-sm shadow-[0_0_18px_hsl(var(--primary)/0.25)]">
                    <Flame className="h-3 w-3" />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>system upgrade in progress</span>
                    <Satellite className="h-3 w-3" />
                  </div>
                  <h1
                    className={`text-4xl font-extrabold tracking-tight sm:text-5xl ${prefs.uppercaseHeading ? "uppercase" : ""}`}
                    style={{ fontFamily: "'Outfit', 'Space Grotesk', system-ui, sans-serif", letterSpacing: "-0.035em" }}
                  >
                    <span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage:
                          "linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--primary)) 60%, hsl(var(--foreground)) 100%)",
                        filter: "drop-shadow(0 0 24px hsl(var(--primary)/0.35))",
                      }}
                    >
                      {t.headline}
                    </span>
                    <span
                      className="ml-2 italic font-normal text-primary/90"
                      style={{ fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.01em" }}
                    >
                      ✦
                    </span>
                  </h1>
                  <p className="mx-auto flex max-w-md items-start justify-center gap-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    <Info className="mt-1 h-4 w-4 shrink-0 text-primary/70" />
                    <span>{message?.trim() || t.body}</span>
                  </p>
                </div>

                {/* ── Stat tiles ── */}
                {prefs.showStats && (
                <div className="mt-8 grid grid-cols-3 gap-3" data-tour="tour-stats">
                  <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-background/50 p-4 backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-background/70">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <Clock className="h-3 w-3 text-primary/80" /> {t.local}
                    </div>
                    <p className="mt-2 text-lg font-bold tabular-nums tracking-tight">
                      {formatTime(now, prefs.timeFormat === "12h")}
                    </p>
                    <div className="absolute -bottom-4 -right-4 h-12 w-12 rounded-full bg-primary/8 blur-lg" />
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-background/50 p-4 backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-background/70">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <Timer className="h-3 w-3 text-primary/80" /> {t.elapsed}
                    </div>
                    <p className="mt-2 text-lg font-bold tabular-nums tracking-tight">
                      <AnimatedNumber value={mins} pad={2} />m{" "}
                      <AnimatedNumber value={secs} pad={2} />s
                    </p>
                    <div className="absolute -bottom-4 -right-4 h-12 w-12 rounded-full bg-primary/8 blur-lg" />
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.07] p-4 backdrop-blur-sm transition-colors hover:bg-primary/[0.11]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                      <Zap className="h-3 w-3" /> {t.status}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                      <span className="text-lg font-bold tracking-tight">{t.statusVal}</span>
                    </div>
                    <div className="absolute -bottom-4 -right-4 h-12 w-12 rounded-full bg-primary/10 blur-lg" />
                  </div>
                </div>
                )}

                {/* ── Progress ── */}
                {prefs.showProgress && (
                <div className="mt-7" data-tour="tour-progress">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Activity className="h-3 w-3 text-primary/70" /> {t.workingOn}
                    </span>
                    <span className="tabular-nums text-primary/80">{t.autoRefresh}</span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted/50 ring-1 ring-border/30">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40"
                      style={{
                        width: "45%",
                        animation: prefs.reduceMotion ? undefined : "progressPulse 3s ease-in-out infinite",
                        boxShadow: "0 0 20px hsl(var(--primary)/0.5), inset 0 0 8px hsl(var(--primary)/0.4)",
                      }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 h-full w-24 rounded-full bg-white/10"
                      style={{ animation: prefs.reduceMotion ? undefined : "shimmerBar 2.2s ease-in-out infinite" }}
                    />
                  </div>
                </div>
                )}

                {/* ── Actions ── */}
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" data-tour="tour-retry">
                  <Button
                    onClick={() => window.location.reload()}
                    className="group relative w-full overflow-hidden rounded-xl bg-primary px-6 py-5 text-sm font-bold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.35)] transition-all hover:shadow-[0_0_36px_hsl(var(--primary)/0.5)] hover:scale-[1.02] sm:w-auto"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
                      {t.tryAgain}
                    </span>
                  </Button>
                </div>

                {/* ── Live security verification (CAPTCHA-style) ── */}
                {prefs.showSecurityCheck && (
                <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 backdrop-blur-sm" data-tour="tour-securitycheck">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                      {(() => {
                        const Icon = verifySteps[verifyIdx].icon;
                        return <Icon className="h-5 w-5" />;
                      })()}
                      <span className="absolute inset-0 rounded-xl border border-emerald-400/30" style={{ animation: "orbitRing 3s linear infinite" }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                        <ShieldCheck className="h-3 w-3" /> Security check
                      </div>
                      <p key={verifyIdx} className="mt-0.5 truncate text-sm font-semibold text-foreground/90 animate-in fade-in slide-in-from-left-2 duration-500">
                        {verifySteps[verifyIdx].label}
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  </div>
                </div>
                )}

                {/* ── Security feature badges ── */}
                {prefs.showBadges && (
                <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {[
                    { icon: Lock, label: "TLS 1.3 Encrypted" },
                    { icon: ShieldCheck, label: "hCaptcha Verified" },
                    { icon: ServerCog, label: "DDoS Protected" },
                    { icon: Fingerprint, label: "Device Fingerprint" },
                    { icon: EyeOff, label: "Zero-Knowledge Logs" },
                    { icon: Cpu, label: "PoW Bot Shield" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="group flex items-center gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-background/60 hover:shadow-[0_0_14px_hsl(var(--primary)/0.12)]"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary/80 transition-transform group-hover:scale-110" />
                      <span className="truncate text-[11px] font-semibold text-foreground/80">{label}</span>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary/60 animate-pulse" />
                <Gauge className="h-3 w-3 text-primary/60" />
                {t.autoCheck}
              </p>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Bell className="h-3 w-3 text-primary/70" />
                <Rss className="h-3 w-3 text-primary/70" />
                <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                {t.followUpdates}
              </a>
            </div>
          </div>
        </main>
      </div>

      {/* ── Right-side cookie & security info strip ── */}
      <div data-tour="tour-cookies">
        <CookieSidebar />
      </div>

      {/* ── Floating live security toasts ── */}
      <SecurityToasts />

      {/* ── Guided tutorial overlay + replay launcher ── */}
      {gateUnlocked && (
        <>
          <MaintenanceTutorial />
          <TutorialLauncher />
        </>
      )}

      {/* ═══════ KEYFRAME STYLES ═══════ */}
      <style>{`
        @keyframes borderGlow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes orbitRing {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes orbitRingReverse {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }
        @keyframes spinWrench {
          0%   { transform: rotate(-12deg); }
          100% { transform: rotate(12deg); }
        }
        @keyframes sparkOrbit {
          0%   { transform: translate(0,0) scale(1); opacity:1; }
          25%  { transform: translate(18px,8px) scale(1.15); opacity:0.9; }
          50%  { transform: translate(0,18px) scale(1); opacity:1; }
          75%  { transform: translate(-18px,8px) scale(0.85); opacity:0.9; }
          100% { transform: translate(0,0) scale(1); opacity:1; }
        }
        @keyframes progressPulse {
          0%, 100% { opacity: 0.8; transform: translateX(0); }
          50% { opacity: 1; transform: translateX(10px); }
        }
        @keyframes shimmerBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(500%); }
        }
      `}</style>

    </div>
  );
};

export default MaintenancePage;
