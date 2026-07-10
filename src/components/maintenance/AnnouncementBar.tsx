import { ShieldCheck, Radar, Lock, Cpu, Fingerprint, ServerCog, KeyRound, Eye, Activity, Flame, Satellite, Zap } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, label: "Perimeter shield ARMED" },
  { icon: Radar,       label: "Threat radar sweeping every 200ms" },
  { icon: Lock,        label: "TLS 1.3 — forward secrecy active" },
  { icon: Cpu,         label: "Proof-of-work bot filter online" },
  { icon: Fingerprint, label: "Device fingerprint verified" },
  { icon: ServerCog,   label: "Edge DDoS mitigation: NOMINAL" },
  { icon: KeyRound,    label: "Ed25519 session tokens rotating" },
  { icon: Eye,         label: "Zero-knowledge access logs" },
  { icon: Activity,    label: "All 47 security probes GREEN" },
  { icon: Flame,       label: "Honeypot decoys deployed" },
  { icon: Satellite,   label: "Geo-routing via 14 edge POPs" },
  { icon: Zap,         label: "Realtime anomaly engine: streaming" },
];

export default function AnnouncementBar() {
  // Render the items twice for a seamless marquee loop.
  const reel = [...ITEMS, ...ITEMS];
  return (
    <div className="relative z-20 overflow-hidden border-b border-primary/25 bg-gradient-to-r from-primary/[0.08] via-primary/[0.18] to-primary/[0.08] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--background))_0%,transparent_8%,transparent_92%,hsl(var(--background))_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
      <div className="flex whitespace-nowrap py-2 will-change-transform" style={{ animation: "annMarquee 50s linear infinite" }}>
        {reel.map(({ icon: Icon, label }, i) => (
          <span
            key={i}
            className="mx-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary/90"
            style={{ fontFamily: "'JetBrains Mono', monospace", textShadow: "0 0 12px hsl(var(--primary)/0.6)" }}
          >
            <Icon className="h-3.5 w-3.5 drop-shadow-[0_0_6px_hsl(var(--primary))]" />
            {label}
            <span className="ml-6 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
          </span>
        ))}
      </div>
      <style>{`
        @keyframes annMarquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}