import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, UserCheck } from "lucide-react";
import StepShell from "./StepShell";

interface Props {
  step: number;
  total: number;
  /** Called with the elapsed ms before the user clicked Proceed. */
  onProceed: (elapsedMs: number) => void;
  busy?: boolean;
}

/**
 * Final "Prove you are Human" gate before manual review. The button is
 * deliberately simple — what we measure is *how long* the visitor takes.
 */
const HumanProveStep = ({ step, total, onProceed, busy }: Props) => {
  const startedAt = useRef<number>(Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = Math.max(0, Math.floor((now - startedAt.current) / 1000));

  return (
    <StepShell
      step={step}
      total={total}
      icon={<UserCheck className="h-8 w-8 text-primary" />}
      title="Prove you are Human"
      description="Last requirement to access the site. Take a breath, read this, and only continue when you're sure."
    >
      <div className="w-full space-y-4 text-left">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-foreground leading-relaxed">
            By proceeding you confirm that you're a real person, you understand
            HalalMiddleman.net is invite-based, and you'll wait while our admins
            review your access request.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-xs">
          <span className="text-muted-foreground">Time on this step</span>
          <span className="font-mono text-foreground">{elapsedSec}s</span>
        </div>

        <Button
          onClick={() => onProceed(Date.now() - startedAt.current)}
          disabled={!!busy}
          className="w-full"
          size="lg"
        >
          {busy ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking…</>
          ) : (
            <><ShieldCheck className="h-4 w-4 mr-2" /> Proceed</>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground/70 text-center">
          Bots tend to click instantly. Real humans usually take a moment.
        </p>
      </div>
    </StepShell>
  );
};

export default HumanProveStep;