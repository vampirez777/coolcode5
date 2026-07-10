import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { ShieldCheck, FileText, ExternalLink } from "lucide-react";

interface Props {
  open: boolean;
  context: "deal_create" | "signup";
  title?: string;
  /** Called when user accepts. */
  onAccept: () => void;
  /** Called when user declines / closes the dialog. */
  onCancel: () => void;
}

/**
 * Universal Terms of Service acceptance pop-up. Used before creating a deal.
 * Shows a summary of key clauses, links to the full ToS, and requires an
 * explicit checkbox before "Agree & continue" becomes enabled.
 */
const TermsAcceptDialog = ({ open, context, title, onAccept, onCancel }: Props) => {
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (open) setAgreed(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-primary/20">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="text-lg">
                  {title || (context === "deal_create"
                    ? "Confirm Terms of Service"
                    : "Agree to Terms of Service")}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {context === "deal_create"
                    ? "Before opening a deal, please review and accept the terms that govern this transaction."
                    : "Please review and accept our Terms of Service to continue."}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <ScrollArea className="h-44 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
            <ul className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><span className="text-foreground font-medium">Escrow service.</span> Funds are held in escrow until both parties confirm the trade. Payouts may be paused if the team flags suspicious activity.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><span className="text-foreground font-medium">Fees.</span> Each deal may carry a service fee. An administrator may adjust the fee on a per-deal basis; you will be notified before payout.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><span className="text-foreground font-medium">Disputes.</span> Either party may open a dispute. Decisions made by our review team are final.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><span className="text-foreground font-medium">Prohibited use.</span> You agree not to use the platform for illegal goods, fraud, or money laundering.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span><span className="text-foreground font-medium">Liability.</span> You acknowledge that crypto transactions are irreversible and accept the associated risks.</span>
              </li>
            </ul>
          </ScrollArea>

          <Link
            to="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <FileText className="h-3.5 w-3.5" />
            Read the full Terms of Service
            <ExternalLink className="h-3 w-3" />
          </Link>

          <label
            htmlFor="tos-agree"
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Checkbox
              id="tos-agree"
              checked={agreed}
              onCheckedChange={(c) => setAgreed(!!c)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground leading-snug">
              I have read and agree to the{" "}
              <Link to="/terms" target="_blank" className="text-primary underline underline-offset-2">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="text-primary underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>

        <DialogFooter className="px-6 pb-5 pt-1 gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none">
            Cancel
          </Button>
          <Button
            disabled={!agreed}
            onClick={onAccept}
            className="flex-1 sm:flex-none"
          >
            Agree & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAcceptDialog;