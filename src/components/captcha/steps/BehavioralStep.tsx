import { useEffect, useRef, useState } from "react";
import { MousePointer2, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import StepShell from "./StepShell";
import { BehavioralTracker } from "@/lib/behavioralTracker";

interface Props {
  step: number;
  total: number;
  tracker: BehavioralTracker;
  onSuccess: () => void;
}

const BehavioralStep = ({ step, total, tracker, onSuccess }: Props) => {
  const [progress, setProgress] = useState(0);
  const [passed, setPassed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);
  const trailPoints = useRef<{ x: number; y: number; t: number }[]>([]);

  // Update progress in real time as user moves
  useEffect(() => {
    const id = setInterval(() => {
      const s = tracker.snapshot();
      const score = Math.min(
        100,
        s.mouseMoves * 2 + s.directionChanges * 8 + s.touches * 30 + s.keyPresses * 15
      );
      setProgress(score);
      if (tracker.isHumanLike()) setPassed(true);
    }, 200);
    return () => clearInterval(id);
  }, [tracker]);

  // Visual trail inside our card area
  useEffect(() => {
    const el = trailRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      trailPoints.current.push({ x, y, t: Date.now() });
      trailPoints.current = trailPoints.current.filter((p) => Date.now() - p.t < 1500).slice(-60);
      const dots = el.querySelectorAll(".trail-dot");
      dots.forEach((d) => d.remove());
      trailPoints.current.forEach((p, i) => {
        const dot = document.createElement("div");
        dot.className = "trail-dot pointer-events-none absolute rounded-full bg-primary";
        const age = (Date.now() - p.t) / 1500;
        const size = 8 * (1 - age) + 2;
        dot.style.width = `${size}px`;
        dot.style.height = `${size}px`;
        dot.style.left = `${p.x - size / 2}px`;
        dot.style.top = `${p.y - size / 2}px`;
        dot.style.opacity = `${(1 - age) * 0.7}`;
        el.appendChild(dot);
      });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const handleConfirm = () => {
    if (!passed) {
      setError("Move your cursor around the box a bit more so we can confirm you're a real person.");
      return;
    }
    onSuccess();
  };

  return (
    <StepShell
      step={step}
      total={total}
      icon={<MousePointer2 className="h-8 w-8 text-primary" />}
      title="Move naturally"
      description="Glide your cursor around the box below for a couple of seconds. On mobile, just tap around — bots can't fake natural motion."
    >
      <div
        ref={trailRef}
        className={`relative h-48 w-full rounded-2xl border-2 border-dashed overflow-hidden mb-4 cursor-crosshair transition-all duration-500 ${
          passed
            ? "border-primary/60 bg-primary/5"
            : "border-primary/30 bg-background/40 hover:border-primary/50"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.06),transparent_70%)] pointer-events-none" />
        {!passed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground/70 pointer-events-none">
            <MousePointer2 className="h-6 w-6 animate-pulse" />
            <span>Move your cursor inside this box</span>
          </div>
        )}
        {passed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-sm font-semibold text-primary pointer-events-none animate-in fade-in zoom-in-95">
            <div className="relative">
              <CheckCircle2 className="h-8 w-8" />
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 animate-pulse" />
            </div>
            <span>Looks human!</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
        <span>Human signal</span>
        <span className="font-mono">{Math.round(progress)}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-300 ${passed ? "bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]" : "bg-primary/70"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && <p className="text-sm text-destructive mb-3">{error}</p>}

      <Button onClick={handleConfirm} disabled={!passed} className="w-full" size="lg">
        {passed ? <><CheckCircle2 className="h-4 w-4 mr-2" />Continue</> : <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Watching for human input…</>}
      </Button>
    </StepShell>
  );
};

export default BehavioralStep;
