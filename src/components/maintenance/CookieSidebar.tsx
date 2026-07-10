import { Cookie, ShieldCheck, Lock, Fingerprint, EyeOff, Activity } from "lucide-react";

/**
 * Slim vertical strip on the right edge explaining the cookie / security
 * posture. Hidden on small screens.
 */
export default function CookieSidebar() {
  return (
    <aside
      aria-label="Cookie & security info"
      className="pointer-events-none fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block"
    >
      <div className="pointer-events-auto relative w-[230px] overflow-hidden rounded-2xl border border-primary/25 bg-card/70 p-4 backdrop-blur-xl shadow-[0_0_30px_hsl(var(--primary)/0.18)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-50"
          style={{
            background: "linear-gradient(135deg, transparent 40%, hsl(var(--primary)/0.3) 50%, transparent 60%)",
            backgroundSize: "300% 300%",
            animation: "borderGlow 6s ease-in-out infinite",
          }}
        />

        <div className="relative">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30 shadow-[0_0_14px_hsl(var(--primary)/0.4)]">
              <Cookie className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Cookie notice
              </p>
              <p className="text-[10px] text-muted-foreground">Essential only · v2.4</p>
            </div>
          </div>

          <p className="text-[11.5px] leading-relaxed text-foreground/80">
            This site uses <span className="font-semibold text-primary">strictly-necessary</span> cookies
            to keep your session encrypted, block bots, and verify your device fingerprint. No tracking,
            no advertising, no third-party sharing.
          </p>

          <ul className="mt-3 space-y-1.5">
            {[
              { icon: ShieldCheck, label: "Session integrity" },
              { icon: Lock,        label: "AES-256 encryption" },
              { icon: Fingerprint, label: "Device verification" },
              { icon: EyeOff,      label: "Zero tracking" },
              { icon: Activity,    label: "Bot heuristics" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-[10.5px] text-foreground/75">
                <Icon className="h-3 w-3 text-primary/80 shrink-0" />
                <span className="truncate">{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            GDPR · CCPA compliant
          </div>
        </div>
      </div>
    </aside>
  );
}