import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Info, CheckCircle2, AlertTriangle, AlertOctagon, Megaphone } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  variant: string;
  cta_label: string | null;
  cta_url: string | null;
  duration_ms: number;
  expires_at: string;
  created_at: string;
};

const VARIANT_STYLES: Record<string, { ring: string; icon: JSX.Element; accent: string }> = {
  info: {
    ring: "ring-primary/30 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.45)]",
    icon: <Info className="h-5 w-5 text-primary" />,
    accent: "bg-primary/10 text-primary",
  },
  success: {
    ring: "ring-emerald-500/30 shadow-[0_0_40px_-10px_rgb(16_185_129/0.45)]",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    accent: "bg-emerald-500/10 text-emerald-500",
  },
  warning: {
    ring: "ring-amber-500/30 shadow-[0_0_40px_-10px_rgb(245_158_11/0.45)]",
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    accent: "bg-amber-500/10 text-amber-500",
  },
  critical: {
    ring: "ring-destructive/40 shadow-[0_0_40px_-10px_hsl(var(--destructive)/0.55)]",
    icon: <AlertOctagon className="h-5 w-5 text-destructive" />,
    accent: "bg-destructive/10 text-destructive",
  },
};

const SEEN_KEY = "live_announcements_seen_v1";

const getSeen = (): string[] => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const markSeen = (id: string) => {
  try {
    const seen = getSeen();
    if (!seen.includes(id)) {
      const next = [...seen, id].slice(-50);
      localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    }
  } catch {}
};

const LiveAnnouncementPopup = () => {
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState<Announcement | null>(null);
  const [show, setShow] = useState(false);

  const enqueue = useCallback((a: Announcement) => {
    if (getSeen().includes(a.id)) return;
    if (new Date(a.expires_at).getTime() <= Date.now()) return;
    setQueue((q) => (q.find((x) => x.id === a.id) ? q : [...q, a]));
  }, []);

  // Load currently active announcements from the last 5 minutes on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("live_announcements")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(10);
      if (cancelled || !data) return;
      data.forEach((a: any) => enqueue(a as Announcement));
    })();
    return () => {
      cancelled = true;
    };
  }, [enqueue]);

  // Realtime subscription for new announcements
  useEffect(() => {
    const channel = supabase
      .channel(`live-announcements-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_announcements" },
        (payload) => enqueue(payload.new as Announcement),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enqueue]);

  // Drive popup display from the queue
  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    setCurrent(next);
    setQueue((q) => q.slice(1));
    requestAnimationFrame(() => setShow(true));
    const timer = setTimeout(
      () => handleDismiss(next.id),
      Math.max(2000, Math.min(60000, next.duration_ms || 8000)),
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, current]);

  const handleDismiss = (id: string) => {
    markSeen(id);
    setShow(false);
    setTimeout(() => setCurrent(null), 280);
  };

  if (!current) return null;
  const style = VARIANT_STYLES[current.variant] || VARIANT_STYLES.info;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 sm:top-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto w-full max-w-md transform overflow-hidden rounded-xl border border-border bg-card/95 backdrop-blur-md ring-1 ${style.ring} transition-all duration-300 ${
          show ? "translate-y-0 opacity-100 scale-100" : "-translate-y-6 opacity-0 scale-95"
        }`}
      >
        <div className="relative flex gap-3 p-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.accent}`}>
            {style.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Megaphone className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Live announcement
              </span>
            </div>
            <h4 className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{current.title}</h4>
            {current.body && (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{current.body}</p>
            )}
            {current.cta_label && current.cta_url && (
              <a
                href={current.cta_url}
                target={current.cta_url.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                onClick={() => handleDismiss(current.id)}
                className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {current.cta_label}
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDismiss(current.id)}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-0.5 w-full overflow-hidden bg-border/40">
          <div
            className="h-full bg-primary"
            style={{
              animation: `liveAnnounceProgress ${Math.max(2000, Math.min(60000, current.duration_ms || 8000))}ms linear forwards`,
            }}
          />
        </div>
      </div>
      <style>{`@keyframes liveAnnounceProgress { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
};

export default LiveAnnouncementPopup;