import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface CancelDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: any;
  userId: string;
  otherUsername?: string;
  onRequest: () => Promise<void> | void;
  onApprove: () => Promise<void> | void;
  onDecline: () => Promise<void> | void;
}

const CancelDealDialog = ({
  open,
  onOpenChange,
  deal,
  userId,
  otherUsername,
  onRequest,
  onApprove,
  onDecline,
}: CancelDealDialogProps) => {
  const [loading, setLoading] = useState(false);

  const hasOtherParty = !!deal?.other_user_id;
  const requestedBy = deal?.cancel_requested_by as string | null | undefined;
  const iRequested = requestedBy === userId;
  const otherRequested = !!requestedBy && !iRequested;
  const noRequestYet = !requestedBy;

  const run = async (fn: () => Promise<void> | void) => {
    try {
      setLoading(true);
      await fn();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  // No other party yet — instant cancel
  if (!hasOtherParty) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md border-border/50 bg-card">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <img src="/images/auto-bot.gif" alt="Halal Bot" className="h-10 w-10 rounded-full object-cover border border-primary/30" />
              <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                <XCircle className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg">Cancel this deal?</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              No other party has joined yet, so you can cancel this draft deal immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Keep deal</Button>
            <Button variant="destructive" onClick={() => run(onApprove)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Cancel deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border/50 bg-card">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <img src="/images/auto-bot.gif" alt="Halal Bot" className="h-10 w-10 rounded-full object-cover border border-primary/30 flex-shrink-0" />
            <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <DialogTitle className="text-lg leading-tight">
              {otherRequested ? "Cancellation requested" : iRequested ? "Cancellation pending" : "Request to cancel deal"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            For safety, both parties must agree before a deal can be cancelled.
          </DialogDescription>
        </DialogHeader>

        {/* Status panel */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <img src="/images/auto-bot.gif" alt="Halal Bot" className="h-8 w-8 rounded-full object-cover border border-primary/30 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wide text-primary font-semibold">Halal Auto Bot</p>
              {noRequestYet && (
                <p className="text-sm text-foreground mt-0.5">
                  Click <span className="font-semibold">Request cancellation</span> below to ask{" "}
                  <span className="font-semibold">{otherUsername || "the other party"}</span> to approve. They'll get a notification and can accept or decline.
                </p>
              )}
              {iRequested && (
                <p className="text-sm text-foreground mt-0.5 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
                  Waiting for <span className="font-semibold">{otherUsername || "the other party"}</span> to approve your cancellation request.
                </p>
              )}
              {otherRequested && (
                <p className="text-sm text-foreground mt-0.5">
                  <span className="font-semibold">{otherUsername || "The other party"}</span> wants to cancel this deal. Approve to cancel together, or decline to keep the deal active.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            If funds have already been deposited, cancelling will trigger a refund flow. If you can't agree, open a dispute and our admins will review.
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          {noRequestYet && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="w-full sm:w-auto">
                Keep deal
              </Button>
              <Button variant="destructive" onClick={() => run(onRequest)} disabled={loading} className="w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                Request cancellation
              </Button>
            </>
          )}
          {iRequested && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="w-full sm:w-auto">
                Close
              </Button>
              <Button variant="outline" onClick={() => run(onDecline)} disabled={loading} className="w-full sm:w-auto border-destructive/40 text-destructive hover:bg-destructive/10">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Withdraw request
              </Button>
            </>
          )}
          {otherRequested && (
            <>
              <Button variant="outline" onClick={() => run(onDecline)} disabled={loading} className="w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Decline — keep deal
              </Button>
              <Button variant="destructive" onClick={() => run(onApprove)} disabled={loading} className="w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Approve cancellation
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelDealDialog;