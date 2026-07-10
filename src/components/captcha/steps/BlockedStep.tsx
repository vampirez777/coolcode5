import { ShieldX } from "lucide-react";
import { type ReactNode } from "react";

/**
 * Terminal "Please try again later." screen. No retry button — only an admin
 * can lift the block from the Admin → Security tab.
 */
const BlockedStep = () => (
  <div className="min-h-screen w-full bg-background flex items-center justify-center p-6 relative overflow-hidden">
    <Background />
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-3xl border border-destructive/30 bg-card/80 backdrop-blur-xl p-7 sm:p-8 shadow-2xl shadow-destructive/10 text-center">
        <div className="relative mx-auto mb-5">
          <div className="absolute inset-0 rounded-2xl blur-xl bg-destructive/30" />
          <div className="relative mx-auto h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/30">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
          Please try again later.
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Our security checks flagged unusual activity from this browser. Access
          to HalalMiddleman.net has been temporarily restricted.
        </p>
        <div className="mt-6 rounded-xl border border-border/50 bg-background/40 p-3 text-[11px] text-muted-foreground leading-relaxed text-left">
          If you believe this is a mistake, please contact a HalalMiddleman
          admin directly. The block can only be removed by an administrator.
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground/60">
        HalalMiddleman security
      </p>
    </div>
  </div>
);

const Background = (): ReactNode => (
  <div className="pointer-events-none absolute inset-0 -z-10">
    <div
      className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full blur-3xl opacity-25 animate-pulse bg-destructive"
      style={{ animationDuration: "4s" }}
    />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(var(--destructive)/0.08),transparent_60%)]" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.15)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
  </div>
);

export default BlockedStep;