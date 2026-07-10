import { useEffect, useState } from "react";
import {
  Settings2, X, Palette, Type, Layout, Sparkles, Eye, Volume2,
  Languages, Clock, RotateCcw, Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type MaintPrefs = {
  accent: string;            // 1. accent color (hex)
  bgStyle: "particles" | "aurora" | "grid" | "starfield" | "matrix" | "none"; // 2
  font: "geist" | "space-grotesk" | "inter" | "jetbrains" | "serif"; // 3
  fontScale: number;         // 4 (0.85–1.25)
  radius: "sharp" | "soft" | "pill"; // 5
  density: "compact" | "normal" | "spacious"; // 6
  cardWidth: "narrow" | "standard" | "wide"; // 7
  cardOpacity: number;       // 8 (0.4–1)
  glow: number;              // 9 (0–1.5)
  particleDensity: number;   // 10 (0–120)
  reduceMotion: boolean;     // 11
  showStats: boolean;        // 12
  showProgress: boolean;     // 13
  showBadges: boolean;       // 14
  showSecurityCheck: boolean;// 15
  cursorTrail: boolean;      // 16
  soundFx: boolean;          // 17
  timeFormat: "12h" | "24h"; // 18
  language: "en" | "tr" | "ar" | "es" | "fr"; // 19
  uppercaseHeading: boolean; // 20
};

export const DEFAULT_PREFS: MaintPrefs = {
  accent: "#22c55e",
  bgStyle: "particles",
  font: "geist",
  fontScale: 1,
  radius: "soft",
  density: "normal",
  cardWidth: "standard",
  cardOpacity: 0.9,
  glow: 1,
  particleDensity: 60,
  reduceMotion: false,
  showStats: true,
  showProgress: true,
  showBadges: true,
  showSecurityCheck: true,
  cursorTrail: false,
  soundFx: false,
  timeFormat: "24h",
  language: "en",
  uppercaseHeading: false,
};

const PREFS_KEY = "hmm:maint-prefs";

export function loadPrefs(): MaintPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PREFS; }
}

const ACCENTS = [
  "#22c55e", "#3b82f6", "#a855f7", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#eab308",
];

const FONT_LABEL: Record<MaintPrefs["font"], string> = {
  geist: "Geist", "space-grotesk": "Space Grotesk", inter: "Inter",
  jetbrains: "JetBrains Mono", serif: "Serif",
};

function Row({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3 text-primary/80" /> {label}
      </div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all ${
        active ? "border-primary bg-primary/15 text-primary" : "border-border/50 bg-background/40 text-muted-foreground hover:border-primary/40"
      }`}>{children}</button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-semibold text-foreground/85">
      <span>{label}</span>
      <span onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </label>
  );
}

export default function MaintenanceCustomizer({
  prefs, setPrefs,
}: { prefs: MaintPrefs; setPrefs: (p: MaintPrefs) => void }) {
  const [open, setOpen] = useState(false);
  const update = <K extends keyof MaintPrefs>(k: K, v: MaintPrefs[K]) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
  };
  const reset = () => {
    setPrefs(DEFAULT_PREFS);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(DEFAULT_PREFS)); } catch {}
  };

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/40 hover:text-foreground hover:shadow-[0_0_16px_hsl(var(--primary)/0.15)]"
      >
        <Settings2 className="h-3 w-3 transition-transform group-hover:rotate-90 duration-300" /> Customize
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex justify-end bg-background/70 backdrop-blur-lg animate-in fade-in duration-200"
             onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <aside className="relative h-full w-full max-w-sm overflow-y-auto border-l border-border/40 bg-card/95 p-5 shadow-[-30px_0_80px_-20px_hsl(var(--primary)/0.35)] animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-10 -mx-5 mb-4 flex items-center justify-between border-b border-border/40 bg-card/95 px-5 pb-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
                  Customize this page
                </h3>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-[11px] text-muted-foreground">
              20 personal settings — saved locally to your browser.
            </p>

            <div className="space-y-3">
              {/* 1. Accent */}
              <Row icon={Palette} label="1 · Accent color">
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((c) => (
                    <button key={c} onClick={() => update("accent", c)}
                      className={`h-7 w-7 rounded-lg border-2 transition-transform hover:scale-110 ${prefs.accent === c ? "border-foreground" : "border-transparent"}`}
                      style={{ background: c, boxShadow: `0 0 12px ${c}55` }} />
                  ))}
                  <input type="color" value={prefs.accent} onChange={(e) => update("accent", e.target.value)}
                    className="h-7 w-10 cursor-pointer rounded-lg border border-border/50 bg-transparent" />
                </div>
              </Row>

              {/* 2. Background style */}
              <Row icon={Sparkles} label="2 · Background style">
                <div className="flex flex-wrap gap-1.5">
                  {(["particles","aurora","grid","starfield","matrix","none"] as const).map((s) => (
                    <Chip key={s} active={prefs.bgStyle === s} onClick={() => update("bgStyle", s)}>{s}</Chip>
                  ))}
                </div>
              </Row>

              {/* 3. Font */}
              <Row icon={Type} label="3 · Font family">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(FONT_LABEL) as MaintPrefs["font"][]).map((f) => (
                    <Chip key={f} active={prefs.font === f} onClick={() => update("font", f)}>{FONT_LABEL[f]}</Chip>
                  ))}
                </div>
              </Row>

              {/* 4. Font scale */}
              <Row icon={Type} label={`4 · Font scale — ${prefs.fontScale.toFixed(2)}×`}>
                <input type="range" min={0.85} max={1.25} step={0.05} value={prefs.fontScale}
                  onChange={(e) => update("fontScale", parseFloat(e.target.value))}
                  className="w-full accent-primary" />
              </Row>

              {/* 5. Radius */}
              <Row icon={Layout} label="5 · Corner style">
                <div className="flex gap-1.5">
                  {(["sharp","soft","pill"] as const).map((r) => (
                    <Chip key={r} active={prefs.radius === r} onClick={() => update("radius", r)}>{r}</Chip>
                  ))}
                </div>
              </Row>

              {/* 6. Density */}
              <Row icon={Layout} label="6 · Density">
                <div className="flex gap-1.5">
                  {(["compact","normal","spacious"] as const).map((d) => (
                    <Chip key={d} active={prefs.density === d} onClick={() => update("density", d)}>{d}</Chip>
                  ))}
                </div>
              </Row>

              {/* 7. Card width */}
              <Row icon={Layout} label="7 · Card width">
                <div className="flex gap-1.5">
                  {(["narrow","standard","wide"] as const).map((w) => (
                    <Chip key={w} active={prefs.cardWidth === w} onClick={() => update("cardWidth", w)}>{w}</Chip>
                  ))}
                </div>
              </Row>

              {/* 8. Card opacity */}
              <Row icon={Eye} label={`8 · Card opacity — ${Math.round(prefs.cardOpacity * 100)}%`}>
                <input type="range" min={0.4} max={1} step={0.05} value={prefs.cardOpacity}
                  onChange={(e) => update("cardOpacity", parseFloat(e.target.value))}
                  className="w-full accent-primary" />
              </Row>

              {/* 9. Glow */}
              <Row icon={Sparkles} label={`9 · Glow intensity — ${prefs.glow.toFixed(2)}`}>
                <input type="range" min={0} max={1.5} step={0.05} value={prefs.glow}
                  onChange={(e) => update("glow", parseFloat(e.target.value))}
                  className="w-full accent-primary" />
              </Row>

              {/* 10. Particle density */}
              <Row icon={Sparkles} label={`10 · Particle count — ${prefs.particleDensity}`}>
                <input type="range" min={0} max={120} step={5} value={prefs.particleDensity}
                  onChange={(e) => update("particleDensity", parseInt(e.target.value))}
                  className="w-full accent-primary" />
              </Row>

              {/* 11–17 toggles */}
              <Row icon={Eye} label="11–17 · Toggles">
                <div className="space-y-2">
                  <Toggle label="11 · Reduce motion" checked={prefs.reduceMotion} onChange={(v) => update("reduceMotion", v)} />
                  <Toggle label="12 · Show stat tiles" checked={prefs.showStats} onChange={(v) => update("showStats", v)} />
                  <Toggle label="13 · Show progress bar" checked={prefs.showProgress} onChange={(v) => update("showProgress", v)} />
                  <Toggle label="14 · Show security badges" checked={prefs.showBadges} onChange={(v) => update("showBadges", v)} />
                  <Toggle label="15 · Show live security check" checked={prefs.showSecurityCheck} onChange={(v) => update("showSecurityCheck", v)} />
                  <Toggle label="16 · Cursor glow trail" checked={prefs.cursorTrail} onChange={(v) => update("cursorTrail", v)} />
                  <Toggle label="17 · Sound effects" checked={prefs.soundFx} onChange={(v) => update("soundFx", v)} />
                </div>
              </Row>

              {/* 18. Time format */}
              <Row icon={Clock} label="18 · Clock format">
                <div className="flex gap-1.5">
                  {(["12h","24h"] as const).map((t) => (
                    <Chip key={t} active={prefs.timeFormat === t} onClick={() => update("timeFormat", t)}>{t}</Chip>
                  ))}
                </div>
              </Row>

              {/* 19. Language */}
              <Row icon={Languages} label="19 · Language">
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ["en","English"],["tr","Türkçe"],["ar","العربية"],["es","Español"],["fr","Français"],
                  ] as const).map(([code, name]) => (
                    <Chip key={code} active={prefs.language === code} onClick={() => update("language", code as any)}>{name}</Chip>
                  ))}
                </div>
              </Row>

              {/* 20. Uppercase headline */}
              <Row icon={Type} label="20 · Headline">
                <Toggle label="Uppercase headline" checked={prefs.uppercaseHeading} onChange={(v) => update("uppercaseHeading", v)} />
              </Row>

              <Button onClick={reset} variant="outline" className="mt-2 w-full rounded-xl border-border/50 text-xs font-bold uppercase tracking-wider">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset to defaults
              </Button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/* ─── i18n table ─── */
export const TRANSLATIONS: Record<MaintPrefs["language"], {
  headline: string; body: string; tryAgain: string; contact: string;
  status: string; statusVal: string; local: string; elapsed: string;
  workingOn: string; autoRefresh: string; secureConn: string; maintenance: string;
  followUpdates: string; autoCheck: string;
}> = {
  en: { headline: "We'll be right back", body: "We're rolling out improvements to keep your trades safe and fast. Hang tight — service will resume automatically.",
        tryAgain: "Try again", contact: "Contact support", status: "Status", statusVal: "Upgrading",
        local: "Local", elapsed: "Elapsed", workingOn: "Working on it…", autoRefresh: "Auto-refresh active",
        secureConn: "Secure connection", maintenance: "Maintenance",
        followUpdates: "Follow for live updates", autoCheck: "This page will keep checking automatically. No action needed." },
  tr: { headline: "Birazdan dönüyoruz", body: "İşlemlerinizi güvenli ve hızlı tutmak için iyileştirmeler yapıyoruz. Sıkı durun — hizmet otomatik olarak devam edecek.",
        tryAgain: "Tekrar dene", contact: "Destek", status: "Durum", statusVal: "Güncelleniyor",
        local: "Yerel", elapsed: "Geçen", workingOn: "Üzerinde çalışıyoruz…", autoRefresh: "Otomatik yenileme aktif",
        secureConn: "Güvenli bağlantı", maintenance: "Bakım",
        followUpdates: "Canlı güncellemeleri takip et", autoCheck: "Bu sayfa otomatik olarak kontrol etmeye devam edecek." },
  ar: { headline: "سنعود قريباً", body: "نقوم بطرح تحسينات للحفاظ على معاملاتك آمنة وسريعة. الخدمة ستعود تلقائياً.",
        tryAgain: "أعد المحاولة", contact: "الدعم", status: "الحالة", statusVal: "تحديث",
        local: "محلي", elapsed: "منقضي", workingOn: "نعمل على ذلك…", autoRefresh: "التحديث التلقائي مفعّل",
        secureConn: "اتصال آمن", maintenance: "صيانة",
        followUpdates: "تابع التحديثات", autoCheck: "ستستمر هذه الصفحة في التحقق تلقائياً." },
  es: { headline: "Volvemos enseguida", body: "Estamos implementando mejoras para mantener tus operaciones seguras y rápidas. El servicio se reanudará automáticamente.",
        tryAgain: "Reintentar", contact: "Soporte", status: "Estado", statusVal: "Actualizando",
        local: "Local", elapsed: "Transcurrido", workingOn: "Trabajando en ello…", autoRefresh: "Recarga automática activa",
        secureConn: "Conexión segura", maintenance: "Mantenimiento",
        followUpdates: "Sigue para actualizaciones", autoCheck: "Esta página seguirá comprobando automáticamente." },
  fr: { headline: "On revient tout de suite", body: "Nous déployons des améliorations pour garder vos échanges sûrs et rapides. Le service reprendra automatiquement.",
        tryAgain: "Réessayer", contact: "Support", status: "Statut", statusVal: "Mise à jour",
        local: "Local", elapsed: "Écoulé", workingOn: "On s'en occupe…", autoRefresh: "Rafraîchissement auto activé",
        secureConn: "Connexion sécurisée", maintenance: "Maintenance",
        followUpdates: "Suivez les actus", autoCheck: "Cette page continuera à vérifier automatiquement." },
};

export function fontFamilyFor(font: MaintPrefs["font"]): string {
  switch (font) {
    case "space-grotesk": return "'Space Grotesk', system-ui, sans-serif";
    case "inter": return "'Inter', system-ui, sans-serif";
    case "jetbrains": return "'JetBrains Mono', monospace";
    case "serif": return "Georgia, 'Times New Roman', serif";
    default: return "'Geist', system-ui, sans-serif";
  }
}

export function radiusFor(r: MaintPrefs["radius"]): string {
  return r === "sharp" ? "0.5rem" : r === "pill" ? "2.5rem" : "1.75rem";
}

export function maxWidthFor(w: MaintPrefs["cardWidth"]): string {
  return w === "narrow" ? "28rem" : w === "wide" ? "44rem" : "36rem";
}

export function paddingFor(d: MaintPrefs["density"]): string {
  return d === "compact" ? "1.5rem" : d === "spacious" ? "3rem" : "2.25rem";
}