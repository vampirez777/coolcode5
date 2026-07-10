import { useState, type ReactNode } from "react";
import { Lock, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const STAFF_PASSWORD = "Safe1010";
const BYPASS_KEY = "hmm.entry.bypass.v1";
const APPROVED_KEY = "hmm.access.approved.v1";
const BYPASS_DAYS = 30;

interface StepShellProps {
  step: number;
  total: number;
  title: string;
  description: string;
  icon: ReactNode;
  tone?: "default" | "warning";
  children: ReactNode;
}

const StepShell = ({ step, total, title, description, icon, tone = "default", children }: StepShellProps) => {
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffPw, setStaffPw] = useState("");
  const [staffErr, setStaffErr] = useState<string | null>(null);

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (staffPw !== STAFF_PASSWORD) {
      setStaffErr("Incorrect staff password");
      return;
    }
    try {
      localStorage.setItem(
        BYPASS_KEY,
        JSON.stringify({
          expiresAt: Date.now() + BYPASS_DAYS * 24 * 60 * 60 * 1000,
          vpn: false,
          trusted: true,
        }),
      );
      localStorage.setItem(APPROVED_KEY, JSON.stringify({ at: Date.now() }));
      localStorage.removeItem("hmm.access.pending.v1");
      localStorage.removeItem("hmm.access.rejected.v1");
      localStorage.removeItem("hmm.gate.blocked.v1");
    } catch { /* noop */ }
    toast({ title: "Staff access granted", description: "Bypassing verification…" });
    setTimeout(() => window.location.reload(), 300);
  };

  return (
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
      <div className="mb-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium tracking-wide">HalalMiddleman security</span>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-7 sm:p-8 shadow-2xl shadow-primary/5">
        {/* Step pips */}
        <div className="mb-6 flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => {
            const isDone = i + 1 < step;
            const isActive = i + 1 === step;
            return (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  isDone
                    ? tone === "warning"
                      ? "bg-amber-500/70"
                      : "bg-primary"
                    : isActive
                      ? tone === "warning"
                        ? "bg-amber-500 shadow-[0_0_10px_hsl(45_95%_55%/0.5)]"
                        : "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                      : "bg-muted"
                }`}
              />
            );
          })}
        </div>

        <div className="mb-5 flex items-center justify-between text-[11px] uppercase tracking-wider">
          <span className="font-semibold text-muted-foreground">
            Step {step} <span className="text-muted-foreground/50">/ {total}</span>
          </span>
          <span className={`font-medium ${tone === "warning" ? "text-amber-500/80" : "text-primary/80"}`}>
            {tone === "warning" ? "Manual review" : "Verifying"}
          </span>
        </div>

        <div className="flex flex-col items-center text-center">
          <div
            className={`relative h-16 w-16 rounded-2xl flex items-center justify-center mb-5 ring-1 ${
              tone === "warning"
                ? "bg-amber-500/10 ring-amber-500/30"
                : "bg-primary/10 ring-primary/20"
            }`}
          >
            <div
              className={`absolute inset-0 rounded-2xl blur-xl opacity-50 ${
                tone === "warning" ? "bg-amber-500/20" : "bg-primary/20"
              }`}
            />
            <div className="relative">{icon}</div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{description}</p>

          <div className="mt-6 w-full">{children}</div>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
        Protected by enterprise-grade verification • Your privacy is preserved
      </p>

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => { setStaffErr(null); setStaffPw(""); setStaffOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <Lock className="h-3 w-3" /> Staff Login
        </button>
      </div>
    </div>

    {staffOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card/95 p-6 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.5)]">
          <button
            type="button"
            onClick={() => setStaffOpen(false)}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30 mb-3">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Staff Login</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter the staff password to bypass verification.
            </p>
          </div>
          <form onSubmit={handleStaffSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-pw" className="text-xs">Staff password</Label>
              <Input
                id="staff-pw"
                type="password"
                autoFocus
                required
                value={staffPw}
                onChange={(e) => { setStaffPw(e.target.value); setStaffErr(null); }}
                placeholder="••••••••"
              />
            </div>
            {staffErr && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {staffErr}
              </div>
            )}
            <Button type="submit" className="w-full font-semibold">
              <Lock className="h-4 w-4 mr-2" /> Unlock
            </Button>
          </form>
        </div>
      </div>
    )}
  </div>
  );
};

export default StepShell;
