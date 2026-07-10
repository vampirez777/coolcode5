import { useEffect, useRef, useState } from "react";
import { Cpu, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import StepShell from "./StepShell";
import { getPowChallenge, submitPowSolution } from "@/lib/captcha";
import { solveProofOfWork } from "@/lib/behavioralTracker";

interface Props {
  step: number;
  total: number;
  onSuccess: () => void;
}

const PowStep = ({ step, total, onSuccess }: Props) => {
  const [tries, setTries] = useState(0);
  const [status, setStatus] = useState<"loading" | "solving" | "verifying" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    let mounted = true;
    (async () => {
      const ch = await getPowChallenge();
      if (!mounted) return;
      if (!ch) {
        setStatus("error");
        setError("Couldn't get a challenge. Please retry.");
        return;
      }
      setStatus("solving");
      const nonce = await solveProofOfWork(
        ch.challenge,
        ch.difficulty,
        (n) => mounted && setTries(n),
        () => cancelled.current,
      );
      if (!mounted || cancelled.current) return;
      if (!nonce) {
        setStatus("error");
        setError("Couldn't complete the proof-of-work. Please retry.");
        return;
      }
      setStatus("verifying");
      const ok = await submitPowSolution(ch.challenge, nonce);
      if (!mounted) return;
      if (ok) {
        setStatus("done");
        setTimeout(onSuccess, 600);
      } else {
        setStatus("error");
        setError("Server rejected the proof. Please retry.");
      }
    })();
    return () => {
      mounted = false;
      cancelled.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = () => { setStatus("loading"); setError(null); setTries(0); /* effect will re-run on remount */ window.location.reload(); };

  const message = (() => {
    switch (status) {
      case "loading": return "Preparing challenge…";
      case "solving": return "Your device is doing a quick computation…";
      case "verifying": return "Verifying with our servers…";
      case "done": return "All set! Letting you in…";
      case "error": return error || "Something went wrong";
    }
  })();

  return (
    <StepShell
      step={step}
      total={total}
      icon={
        status === "done" ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> :
        status === "error" ? <AlertTriangle className="h-8 w-8 text-amber-500" /> :
        <Cpu className="h-8 w-8 text-primary animate-pulse" />
      }
      tone={status === "error" ? "warning" : "default"}
      title={
        status === "done" ? "All verified" :
        status === "error" ? "Something went wrong" :
        "Final check — running silently"
      }
      description="Your device is solving a tiny cryptographic puzzle in the background. This makes automated abuse expensive — it's free for you and takes only a moment."
    >
      <div className="space-y-4">
        <div className={`rounded-2xl border p-5 transition-colors ${
          status === "done" ? "border-primary/30 bg-primary/5" :
          status === "error" ? "border-amber-500/30 bg-amber-500/5" :
          "border-border/60 bg-background/40"
        }`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-foreground font-medium">{message}</p>
            {status === "solving" && (
              <span className="shrink-0 text-[11px] font-mono text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                LIVE
              </span>
            )}
          </div>
          {status === "solving" && (
            <div className="mt-3 flex items-baseline justify-between border-t border-border/40 pt-3">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Hashes computed
              </span>
              <span className="font-mono text-sm font-semibold text-primary tabular-nums">
                {tries.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Animated bars */}
        {(status === "solving" || status === "verifying" || status === "loading") && (
          <div className="flex justify-center items-end gap-1.5 h-12">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-primary/40 to-primary"
                style={{
                  animation: `pulse 1.2s ease-in-out ${i * 100}ms infinite`,
                  height: `${30 + (i % 3) * 20}%`,
                }}
              />
            ))}
          </div>
        )}

        {status === "done" && (
          <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium animate-in fade-in zoom-in-95">
            <CheckCircle2 className="h-4 w-4" />
            Welcome — taking you in
          </div>
        )}

        {status === "error" && (
          <Button onClick={retry} className="w-full" size="lg" variant="outline">
            Try again
          </Button>
        )}
      </div>
    </StepShell>
  );
};

export default PowStep;
