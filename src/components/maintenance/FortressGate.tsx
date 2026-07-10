import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck, CheckCircle2, Loader2, Lock, Cpu, Fingerprint, Radar, Wifi,
  ScanFace, KeyRound, Hash, Calculator, Image as ImageIcon, MoveHorizontal,
  Type as TypeIcon, ListOrdered, Reply, Eye, Atom, Globe2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExitLock } from "./useExitLock";

/* ════════════════ INTERACTIVE CAPTCHAS ════════════════ */

function MathCaptcha({ onSolved }: { onSolved: () => void }) {
  const [a] = useState(() => 3 + Math.floor(Math.random() * 9));
  const [b] = useState(() => 2 + Math.floor(Math.random() * 8));
  const [v, setV] = useState("");
  const wrong = v !== "" && parseInt(v) !== a + b;
  useEffect(() => { if (parseInt(v) === a + b) onSolved(); }, [v, a, b, onSolved]);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/80">Solve: <span className="text-primary">{a} + {b} = ?</span></p>
      <Input value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))}
        className={`h-9 w-24 text-center font-mono ${wrong ? "border-destructive/60" : ""}`} placeholder="?" />
    </div>
  );
}

function EmojiGridCaptcha({ onSolved }: { onSolved: () => void }) {
  const target = "🐱";
  const grid = useMemo(() => {
    const cats = [0,0,0]; // 3 cats
    const others = ["🐶","🐰","🐻","🦊","🐵","🐯"];
    const items: { id: number; emoji: string; isCat: boolean }[] = [];
    let id = 0;
    cats.forEach(() => items.push({ id: id++, emoji: target, isCat: true }));
    while (items.length < 9) items.push({ id: id++, emoji: others[Math.floor(Math.random()*others.length)], isCat: false });
    return items.sort(() => Math.random() - 0.5);
  }, []);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setPicked((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const isCorrect = [...picked].every((id) => grid.find((x) => x.id === id)?.isCat)
                 && grid.filter((x) => x.isCat).every((x) => picked.has(x.id));
  useEffect(() => { if (isCorrect && picked.size > 0) onSolved(); }, [isCorrect, picked.size, onSolved]);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/80">Select all the <span className="text-primary">cats</span></p>
      <div className="grid grid-cols-3 gap-1.5">
        {grid.map((c) => (
          <button key={c.id} type="button" onClick={() => toggle(c.id)}
            className={`flex h-12 items-center justify-center rounded-lg border text-2xl transition-all ${
              picked.has(c.id) ? "border-primary bg-primary/15 scale-95" : "border-border/50 bg-background/40 hover:border-primary/40"
            }`}>{c.emoji}</button>
        ))}
      </div>
    </div>
  );
}

function SliderCaptcha({ onSolved }: { onSolved: () => void }) {
  const target = useMemo(() => 55 + Math.floor(Math.random() * 30), []); // 55-85
  const [v, setV] = useState(0);
  const ok = Math.abs(v - target) <= 2;
  useEffect(() => { if (ok) onSolved(); }, [ok, onSolved]);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/80">Drag the slider to <span className="font-mono text-primary">{target}%</span></p>
      <input type="range" min={0} max={100} value={v} onChange={(e) => setV(parseInt(e.target.value))}
        className="w-full accent-primary" />
      <div className="text-[10px] font-mono text-muted-foreground">Current: {v}%</div>
    </div>
  );
}

function DistortedTextCaptcha({ onSolved }: { onSolved: () => void }) {
  const code = useMemo(() => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }, []);
  const [v, setV] = useState("");
  const ok = v.toUpperCase() === code;
  useEffect(() => { if (ok) onSolved(); }, [ok, onSolved]);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/80">Type the characters shown</p>
      <div className="relative h-14 w-full overflow-hidden rounded-lg border border-border/60 bg-gradient-to-br from-muted/40 to-background select-none">
        <svg viewBox="0 0 200 50" className="h-full w-full">
          <defs>
            <pattern id="noise" width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.6" fill="hsl(var(--primary)/0.25)" />
            </pattern>
          </defs>
          <rect width="200" height="50" fill="url(#noise)" />
          {code.split("").map((c, i) => (
            <text key={i} x={20 + i * 35} y={35}
              transform={`rotate(${(Math.random()*40-20).toFixed(1)} ${20 + i*35} 30)`}
              fontFamily="'JetBrains Mono', monospace" fontSize="26" fontWeight="700"
              fill={`hsl(var(--primary))`} style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)/0.5))" }}>
              {c}
            </text>
          ))}
          <line x1="0" y1={Math.random()*50} x2="200" y2={Math.random()*50} stroke="hsl(var(--primary)/0.4)" strokeWidth="1" />
          <line x1="0" y1={Math.random()*50} x2="200" y2={Math.random()*50} stroke="hsl(var(--primary)/0.4)" strokeWidth="1" />
        </svg>
      </div>
      <Input value={v} onChange={(e) => setV(e.target.value.toUpperCase())} maxLength={5}
        className="h-9 font-mono uppercase tracking-[0.3em] text-center" placeholder="•••••" />
    </div>
  );
}

function OrderCaptcha({ onSolved }: { onSolved: () => void }) {
  const nums = useMemo(() => {
    const arr: number[] = [];
    while (arr.length < 4) {
      const n = Math.floor(Math.random() * 90) + 10;
      if (!arr.includes(n)) arr.push(n);
    }
    return arr;
  }, []);
  const sorted = [...nums].sort((a, b) => a - b);
  const [picked, setPicked] = useState<number[]>([]);
  const wrong = picked.some((n, i) => n !== sorted[i]);
  useEffect(() => {
    if (picked.length === sorted.length && !wrong) onSolved();
  }, [picked, sorted, wrong, onSolved]);
  useEffect(() => { if (wrong) setTimeout(() => setPicked([]), 600); }, [wrong]);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/80">Click the numbers in <span className="text-primary">ascending</span> order</p>
      <div className="grid grid-cols-4 gap-1.5">
        {nums.map((n) => {
          const idx = picked.indexOf(n);
          return (
            <button key={n} type="button" disabled={idx !== -1}
              onClick={() => setPicked((p) => [...p, n])}
              className={`h-12 rounded-lg border font-mono text-base font-bold transition-all ${
                idx !== -1 ? "border-primary bg-primary/20 text-primary" :
                wrong ? "border-destructive/50 bg-destructive/10" :
                "border-border/60 bg-background/40 hover:border-primary/40"
              }`}>{n}{idx !== -1 && <sup className="ml-0.5 text-[9px]">{idx + 1}</sup>}</button>
          );
        })}
      </div>
    </div>
  );
}

function ReverseCaptcha({ onSolved }: { onSolved: () => void }) {
  const words = ["SECURE","HALAL","CRYPTO","ESCROW","SHIELD"];
  const word = useMemo(() => words[Math.floor(Math.random() * words.length)], []);
  const reversed = word.split("").reverse().join("");
  const [v, setV] = useState("");
  useEffect(() => { if (v.toUpperCase() === reversed) onSolved(); }, [v, reversed, onSolved]);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/80">
        Type <span className="font-mono text-primary">{word}</span> in reverse
      </p>
      <Input value={v} onChange={(e) => setV(e.target.value.toUpperCase())} maxLength={word.length}
        className="h-9 font-mono uppercase tracking-widest" placeholder="reversed…" />
    </div>
  );
}

function CountCaptcha({ onSolved }: { onSolved: () => void }) {
  const { count, items } = useMemo(() => {
    const targetCount = 2 + Math.floor(Math.random() * 4); // 2-5
    const items: string[] = [];
    for (let i = 0; i < targetCount; i++) items.push("🛡️");
    const fillers = ["⭐","🔒","🔑","💎","🎯","⚡"];
    while (items.length < 12) items.push(fillers[Math.floor(Math.random() * fillers.length)]);
    return { count: targetCount, items: items.sort(() => Math.random() - 0.5) };
  }, []);
  const [v, setV] = useState("");
  useEffect(() => { if (parseInt(v) === count) onSolved(); }, [v, count, onSolved]);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/80">How many <span className="text-primary">shields 🛡️</span>?</p>
      <div className="grid grid-cols-6 gap-1 rounded-lg border border-border/40 bg-background/40 p-2">
        {items.map((e, i) => <div key={i} className="flex h-8 items-center justify-center text-lg">{e}</div>)}
      </div>
      <Input value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} maxLength={2}
        className="h-9 w-20 text-center font-mono" placeholder="?" />
    </div>
  );
}

/* ════════════════ STEP DEFINITIONS ════════════════ */

type Step = {
  icon: any;
  label: string;
  detail: string;
  interactive?: (onSolved: () => void) => JSX.Element;
};

const STEPS: Step[] = [
  { icon: Atom,        label: "Seeding quantum entropy pool",     detail: "256-bit secure random" },
  { icon: Fingerprint, label: "Re-validating device fingerprint", detail: "Canvas / WebGL / fonts" },
  { icon: Calculator,  label: "CAPTCHA — Arithmetic",             detail: "Prove cognitive function",
    interactive: (onSolved) => <MathCaptcha onSolved={onSolved} /> },
  { icon: ImageIcon,   label: "CAPTCHA — Image recognition",      detail: "Select the cats",
    interactive: (onSolved) => <EmojiGridCaptcha onSolved={onSolved} /> },
  { icon: ScanFace,    label: "Behavioral mouse analysis",        detail: "Pattern variance OK" },
  { icon: MoveHorizontal, label: "CAPTCHA — Slide puzzle",        detail: "Match the target position",
    interactive: (onSolved) => <SliderCaptcha onSolved={onSolved} /> },
  { icon: Cpu,         label: "WebGL renderer attestation",       detail: "GPU sandbox verified" },
  { icon: TypeIcon,    label: "CAPTCHA — Distorted text",         detail: "Type the displayed code",
    interactive: (onSolved) => <DistortedTextCaptcha onSolved={onSolved} /> },
  { icon: Wifi,        label: "WebRTC leak scan",                 detail: "No private IP exposure" },
  { icon: ListOrdered, label: "CAPTCHA — Logical ordering",       detail: "Sort the numbers",
    interactive: (onSolved) => <OrderCaptcha onSolved={onSolved} /> },
  { icon: Globe2,      label: "Timezone consistency",             detail: "TZ ↔ IP region match" },
  { icon: Reply,       label: "CAPTCHA — String inversion",       detail: "Reverse the word",
    interactive: (onSolved) => <ReverseCaptcha onSolved={onSolved} /> },
  { icon: AlertTriangle, label: "Honeypot trap evaluation",       detail: "No hidden field touched" },
  { icon: Eye,         label: "CAPTCHA — Object counting",        detail: "Count the shields",
    interactive: (onSolved) => <CountCaptcha onSolved={onSolved} /> },
  { icon: Hash,        label: "Computing SHA-256 attestation",    detail: "Difficulty 5 PoW" },
  { icon: KeyRound,    label: "Issuing Ed25519 session token",    detail: "Signed bearer" },
  { icon: Lock,        label: "Activating AES-256-GCM envelope",  detail: "Per-session key" },
  { icon: Radar,       label: "Threat intel cross-check",         detail: "No matches in feeds" },
  { icon: ShieldCheck, label: "Sealing perimeter",                detail: "Firewall ruleset committed" },
  { icon: CheckCircle2,label: "Final integrity hash",             detail: "All 20 layers verified" },
];

/* ════════════════ THE GATE ════════════════ */

export default function FortressGate({ onComplete }: { onComplete: () => void }) {
  useExitLock(true);

  const [stepIdx, setStepIdx] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(() => Array(STEPS.length).fill(false));
  const [interactiveSolved, setInteractiveSolved] = useState(false);
  const [done, setDone] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  const current = STEPS[stepIdx];
  const needsHuman = !!current?.interactive;

  useEffect(() => {
    if (done) return;
    if (stepIdx >= STEPS.length) { setDone(true); return; }
    if (needsHuman && !interactiveSolved) return;

    const delay = needsHuman ? 600 : 480 + Math.random() * 380;
    const t = setTimeout(() => {
      setCompleted((prev) => { const n = [...prev]; n[stepIdx] = true; return n; });
      setInteractiveSolved(false);
      setStepIdx((i) => i + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [stepIdx, needsHuman, interactiveSolved, done]);

  // auto-scroll active row into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-step="${stepIdx}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [stepIdx]);

  const pct = Math.round((completed.filter(Boolean).length / STEPS.length) * 100);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 p-3 backdrop-blur-2xl"
      onMouseDown={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full"
             style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.22) 0%, transparent 70%)", filter: "blur(70px)" }} />
      </div>

      <div className="relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-primary/30 bg-card/95 p-6 shadow-[0_50px_140px_-30px_hsl(var(--primary)/0.6)] sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/0.45)]">
            <ShieldCheck className="h-5 w-5" />
            <span className="absolute inset-0 rounded-xl border border-primary/40" style={{ animation: "orbitRing 3s linear infinite" }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
              Fortress Verification — Tier II
            </h2>
            <p className="text-[11px] font-medium text-muted-foreground">
              20-layer CAPTCHA + cryptographic attestation
            </p>
          </div>
          <div className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary"
               style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {pct}%
          </div>
        </div>

        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted/60 ring-1 ring-border/30">
          <div className="h-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 transition-all duration-500"
               style={{ width: `${pct}%`, boxShadow: "0 0 12px hsl(var(--primary)/0.5)" }} />
        </div>

        {/* Active CAPTCHA panel */}
        {!done && needsHuman && !interactiveSolved && (
          <div className="mb-3 rounded-2xl border border-primary/40 bg-primary/[0.07] p-4 shadow-[0_0_24px_hsl(var(--primary)/0.18)] animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
              <ScanFace className="h-3 w-3" /> Live CAPTCHA — Step {stepIdx + 1}
            </div>
            {current.interactive!(() => setInteractiveSolved(true))}
          </div>
        )}

        {/* Steps */}
        <ol ref={listRef} className="space-y-1.5 max-h-[36vh] overflow-y-auto pr-1 -mr-1">
          {STEPS.map((step, i) => {
            const isDone = completed[i];
            const isActive = i === stepIdx && !done;
            const Icon = step.icon;
            return (
              <li key={i} data-step={i}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${
                  isDone ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                  : isActive ? "border-primary/50 bg-primary/[0.08] shadow-[0_0_16px_hsl(var(--primary)/0.18)]"
                  : "border-border/40 bg-background/40 opacity-55"
                }`}>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                  isDone ? "bg-emerald-500/15 text-emerald-400"
                  : isActive ? "bg-primary/15 text-primary"
                  : "bg-muted/50 text-muted-foreground"
                }`}>
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" />
                   : isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                   : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-foreground/90">
                    <span className="mr-1.5 text-muted-foreground/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {step.label}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">{step.detail}</p>
                </div>
                {step.interactive && (
                  <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary">
                    Captcha
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
             style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <Lock className="mr-1 inline h-3 w-3" />
            {done ? "Perimeter sealed" : "Modal locked — cannot exit"}
          </p>
          <Button disabled={!done} onClick={onComplete}
            className="h-9 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.35)] disabled:opacity-40 disabled:shadow-none">
            {done ? (<><CheckCircle2 className="mr-1.5 h-4 w-4" /> Enter site</>)
                  : (<><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Locked</>)}
          </Button>
        </div>
      </div>
    </div>
  );
}