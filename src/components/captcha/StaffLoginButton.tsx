import { useState } from "react";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const STAFF_PASSWORD = "Safe1010";
const BYPASS_KEY = "hmm.entry.bypass.v1";
const APPROVED_KEY = "hmm.access.approved.v1";
const BYPASS_DAYS = 30;

const StaffLoginButton = () => {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== STAFF_PASSWORD) {
      setErr("Incorrect staff password");
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
    <>
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => { setErr(null); setPw(""); setOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          <Lock className="h-3 w-3" /> Staff Login
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card/95 p-6 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.5)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
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
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="staff-pw" className="text-xs">Staff password</Label>
                <Input
                  id="staff-pw"
                  type="password"
                  autoFocus
                  required
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setErr(null); }}
                  placeholder="••••••••"
                />
              </div>
              {err && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  {err}
                </div>
              )}
              <Button type="submit" className="w-full font-semibold">
                <Lock className="h-4 w-4 mr-2" /> Unlock
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default StaffLoginButton;