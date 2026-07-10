import { useEffect, useState } from "react";
import { ShieldCheck, Radar, Lock, Cpu, Fingerprint, ServerCog, KeyRound, Wifi, Activity, CheckCircle2 } from "lucide-react";

type Toast = {
  id: number;
  icon: typeof ShieldCheck;
  title: string;
  detail: string;
  tone: "ok" | "info" | "warn";
};

const POOL: Omit<Toast, "id">[] = [
  { icon: ShieldCheck, title: "Perimeter probe passed",  detail: "Layer-7 firewall · 0 anomalies", tone: "ok"   },
  { icon: Radar,       title: "Threat scan complete",     detail: "0 / 2,481 signatures matched", tone: "ok"   },
  { icon: Cpu,         title: "PoW challenge solved",     detail: "SHA-256 · difficulty 4 · 412ms", tone: "info" },
  { icon: Fingerprint, title: "Device fingerprint cached", detail: "Entropy score 0.94", tone: "info" },
  { icon: KeyRound,    title: "Session key rotated",      detail: "Ed25519 · TTL 15m", tone: "ok"   },
  { icon: Wifi,        title: "Edge route optimized",     detail: "Latency 38ms · POP: FRA-3", tone: "info" },
  { icon: ServerCog,   title: "DDoS shield re-armed",     detail: "Mitigation: NOMINAL", tone: "ok"   },
  { icon: Lock,        title: "TLS handshake refreshed",  detail: "TLS 1.3 · X25519", tone: "ok"   },
  { icon: Activity,    title: "Health probe heartbeat",   detail: "47 / 47 services green", tone: "ok"   },
];

export default function SecurityToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let counter = 0;
    const push = () => {
      const pick = POOL[Math.floor(Math.random() * POOL.length)];
      const id = ++counter;
      setToasts((prev) => [...prev.slice(-2), { ...pick, id }]);
      // auto-remove after 5.5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5500);
    };
    // first one quickly, then every 6–10s
    const t0 = setTimeout(push, 2200);
    const iv = setInterval(push, 7000);
    return () => { clearTimeout(t0); clearInterval(iv); };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-40 flex w-[290px] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = t.icon;
        const ring =
          t.tone === "ok"   ? "border-emerald-500/40 shadow-[0_0_24px_hsl(150_80%_50%/0.25)]" :
          t.tone === "warn" ? "border-amber-500/40 shadow-[0_0_24px_hsl(40_90%_55%/0.25)]"   :
                              "border-primary/40 shadow-[0_0_24px_hsl(var(--primary)/0.3)]";
        const iconBg =
          t.tone === "ok"   ? "bg-emerald-500/15 text-emerald-400" :
          t.tone === "warn" ? "bg-amber-500/15 text-amber-400"     :
                              "bg-primary/15 text-primary";
        return (
          <div
            key={t.id}
            className={`pointer-events-auto relative overflow-hidden rounded-xl border ${ring} bg-card/85 p-3 backdrop-blur-xl animate-in slide-in-from-left-4 fade-in duration-500`}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            <div className="flex items-start gap-2.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-foreground/90">
                  {t.title}
                  <CheckCircle2 className="h-3 w-3 text-emerald-400/80" />
                </p>
                <p className="truncate text-[10.5px] text-muted-foreground" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {t.detail}
                </p>
              </div>
            </div>
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-muted/40">
              <div className="h-full bg-gradient-to-r from-primary/60 to-primary" style={{ animation: "toastBar 5.5s linear forwards" }} />
            </div>
            <style>{`@keyframes toastBar { from { width: 100%; } to { width: 0%; } }`}</style>
          </div>
        );
      })}
    </div>
  );
}