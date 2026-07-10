import { useEffect, useState } from "react";
import { Cookie, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "hmm:cookies-accepted";

/**
 * Full-screen cookie consent. The user MUST accept — there is no reject path.
 * Until accepted, the page underneath is fully blocked from clicks and scroll.
 */
export default function CookieGate({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState<boolean>(() => {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(KEY) === "1";
  });

  useEffect(() => {
    if (accepted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [accepted]);

  const accept = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setAccepted(true);
  };

  return (
    <>
      {children}
      {!accepted && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/85 p-4 backdrop-blur-2xl"
          // Swallow every interaction with the underlying page
          onClickCapture={(e) => { if (e.target === e.currentTarget) e.stopPropagation(); }}
          onWheelCapture={(e) => e.preventDefault()}
          style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)/0.18) 0%, transparent 70%)" }}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-[1.5rem] border border-primary/30 bg-card/95 p-6 shadow-[0_40px_120px_-30px_hsl(var(--primary)/0.5)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.35)]">
                <Cookie className="h-5 w-5" />
              </div>
              <div>
                <h2
                  className="text-base font-bold tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
                >
                  Cookies required
                </h2>
                <p className="text-[11px] font-medium text-muted-foreground">
                  You must accept to use this site
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-foreground/85">
              We use cookies for essential security, fraud prevention, session
              management, and core site functionality. Acceptance is required
              to continue — without cookies the site cannot operate safely.
            </p>

            <ul className="mt-4 space-y-1.5">
              {[
                "Strictly-necessary security cookies",
                "Encrypted session tokens",
                "Anti-bot & fraud detection",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2 text-xs text-foreground/80">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {line}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p
                className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <ShieldCheck className="mr-1 inline h-3 w-3" /> Essential only
              </p>
              <Button
                onClick={accept}
                className="h-10 rounded-xl bg-primary px-5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.55)]"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Accept & continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}