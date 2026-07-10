import { useEffect, useState } from "react";
import { Hourglass, CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import StepShell from "./StepShell";
import { checkAccessRequest } from "@/lib/accessRequest";

interface Props {
  requestId: string;
  onApproved: () => void;
}

const POLL_INTERVAL_MS = 15_000;

const PendingApprovalStep = ({ requestId, onApproved }: Props) => {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [checking, setChecking] = useState(false);

  const pollOnce = async () => {
    setChecking(true);
    const res = await checkAccessRequest(requestId);
    setChecking(false);
    if (res?.status === "approved") {
      setStatus("approved");
      setTimeout(onApproved, 1200);
    } else if (res?.status === "rejected") {
      setStatus("rejected");
      // Persist the rejection so a reload (or a token refresh that fires
      // onAuthStateChange) doesn't flip the user back into the site,
      // which would otherwise show as a flashing black screen.
      try {
        localStorage.setItem(
          "hmm.access.rejected.v1",
          JSON.stringify({ at: Date.now(), requestId }),
        );
        localStorage.removeItem("hmm.access.approved.v1");
        localStorage.removeItem("hmm.entry.bypass.v1");
      } catch { /* noop */ }
    }
  };

  useEffect(() => {
    pollOnce();
    const interval = setInterval(pollOnce, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  return (
    <StepShell
      step={1}
      total={1}
      tone={status === "rejected" ? "warning" : "default"}
      icon={
        status === "approved" ? (
          <CheckCircle2 className="h-8 w-8 text-primary" />
        ) : status === "rejected" ? (
          <XCircle className="h-8 w-8 text-destructive" />
        ) : (
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-slow-ping" />
            <Hourglass className="relative h-8 w-8 text-primary" />
          </div>
        )
      }
      title={
        status === "approved"
          ? "You're approved!"
          : status === "rejected"
          ? "Request not approved"
          : "Waiting for review"
      }
      description={
        status === "approved"
          ? "Welcome — taking you in now."
          : status === "rejected"
          ? "Our team reviewed your request and could not approve access from this connection. If you believe this is a mistake, please disable your VPN or contact support."
          : "Your request has been submitted to our team. We'll approve you on this browser as soon as possible — you can leave this page open or come back later."
      }
    >
      {status === "pending" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-left">
            <p className="text-xs font-medium text-primary mb-1">💡 Fastest way in</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Disable your VPN and refresh the page — most users are then approved instantly by our automated checks.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <StatusPill label="Submitted" active />
            <StatusPill label="Reviewing" active pulse />
            <StatusPill label="Approved" />
          </div>
          <Button
            variant="outline"
            onClick={pollOnce}
            disabled={checking}
            className="w-full"
          >
            {checking ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking…</>
            ) : (
              "Check status now"
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground/60 text-center">
            Auto-checking every 15 seconds
          </p>
        </div>
      )}
      {status === "rejected" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-left flex items-start gap-3">
          <Mail className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            You can try again from a different network, or email{" "}
            <a href="mailto:support@ticket-halalmm.com" className="text-foreground font-medium hover:underline">
              support@ticket-halalmm.com
            </a>{" "}
            for help.
          </p>
        </div>
      )}
    </StepShell>
  );
};

const StatusPill = ({ label, active = false, pulse = false }: { label: string; active?: boolean; pulse?: boolean }) => (
  <div
    className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1.5 rounded-lg border transition-colors ${
      active
        ? "border-primary/40 bg-primary/10 text-primary"
        : "border-border/40 bg-muted/30 text-muted-foreground/50"
    } ${pulse ? "animate-pulse" : ""}`}
  >
    {label}
  </div>
);

export default PendingApprovalStep;