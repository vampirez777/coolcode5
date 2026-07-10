import { useEffect, useRef, useState } from "react";
import { MoveHorizontal, CheckCircle2, ChevronsRight } from "lucide-react";
import StepShell from "./StepShell";

interface Props {
  step: number;
  total: number;
  onSuccess: () => void;
}

/**
 * Drag-the-puzzle-piece slider. The user must align the slider thumb
 * within ~6px of a randomly chosen target on a 320px track. Pure
 * client-side check — adds friction for headless bots that can't run
 * pointer events naturally.
 */
const TRACK_WIDTH = 300;
const THUMB_SIZE = 48;
const TOLERANCE = 10;

const SliderStep = ({ step, total, onSuccess }: Props) => {
  const [target] = useState(() => 80 + Math.floor(Math.random() * (TRACK_WIDTH - THUMB_SIZE - 80)));
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startPosRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    if (done) return;
    setDragging(true);
    startXRef.current = e.clientX;
    startPosRef.current = pos;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const delta = e.clientX - startXRef.current;
      const next = Math.max(0, Math.min(TRACK_WIDTH - THUMB_SIZE, startPosRef.current + delta));
      setPos(next);
    };
    const onUp = () => {
      setDragging(false);
      setPos((current) => {
        if (Math.abs(current - target) <= TOLERANCE) {
          setError(null);
          setDone(true);
          setTimeout(onSuccess, 600);
          return target; // snap
        }
        setError("Almost — slide it right onto the marker.");
        return 0; // reset
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, target, onSuccess]);

  return (
    <StepShell
      step={step}
      total={total}
      icon={<MoveHorizontal className="h-8 w-8 text-primary" />}
      title="Slide to verify"
      description="Drag the green button along the track until it lines up with the dashed marker."
    >
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-background/60 to-background/20 p-6 mb-3 select-none">
        <div
          ref={trackRef}
          className="relative mx-auto h-14 rounded-full bg-muted/50 ring-1 ring-border/60 shadow-inner overflow-hidden"
          style={{ width: TRACK_WIDTH }}
        >
          {/* hint chevrons */}
          {!done && pos < 4 && (
            <div className="absolute inset-y-0 right-6 flex items-center gap-1 text-muted-foreground/40 pointer-events-none">
              <ChevronsRight className="h-4 w-4 animate-pulse" style={{ animationDelay: "0ms" }} />
              <ChevronsRight className="h-4 w-4 animate-pulse" style={{ animationDelay: "200ms" }} />
              <ChevronsRight className="h-4 w-4 animate-pulse" style={{ animationDelay: "400ms" }} />
            </div>
          )}
          {/* target marker */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-11 w-11 rounded-full border-2 border-dashed transition-all duration-300 ${
              done ? "border-primary bg-primary/30 scale-110" : "border-primary/60 bg-primary/10"
            }`}
            style={{ left: target + (THUMB_SIZE - 44) / 2 }}
          />
          {/* progress fill */}
          <div
            className="absolute top-0 left-0 h-full rounded-l-full bg-gradient-to-r from-primary/30 to-primary/20"
            style={{ width: pos + THUMB_SIZE / 2 }}
          />
          {/* thumb */}
          <div
            onPointerDown={onPointerDown}
            className={`absolute top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-xl cursor-grab active:cursor-grabbing transition-all ${
              done
                ? "bg-primary text-primary-foreground scale-110 shadow-[0_0_24px_hsl(var(--primary)/0.6)]"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 ring-2 ring-primary/30"
            } flex items-center justify-center touch-none active:scale-95`}
            style={{ left: pos }}
          >
            {done ? <CheckCircle2 className="h-6 w-6" /> : <MoveHorizontal className="h-5 w-5" />}
          </div>
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
      {done && (
        <div className="flex items-center justify-center gap-2 text-sm text-primary mt-3 font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" /> Aligned! Continuing…
        </div>
      )}
      {!done && !error && (
        <p className="text-xs text-muted-foreground/60 mt-2 text-center">
          Hold and drag — release on the marker
        </p>
      )}
    </StepShell>
  );
};

export default SliderStep;