import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Shield, ArrowDown, Lock, Package, CheckCircle, Wallet, Undo2, Ban, Percent, TrendingUp, ShieldAlert, ShieldCheck } from "lucide-react";
import MfaChallengeDialog from "@/components/auth/MfaChallengeDialog";
import { userHasVerifiedMfa } from "@/lib/mfa";

interface AdminEscrowDialogProps {
  deal: any | null;
  onClose: () => void;
  onUpdated: () => void;
}

const AdminEscrowDialog = ({ deal, onClose, onUpdated }: AdminEscrowDialogProps) => {
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [releaseMfaOpen, setReleaseMfaOpen] = useState(false);
  const [feeInput, setFeeInput] = useState<string>("");
  const [bumpInput, setBumpInput] = useState<string>("");
  const [holdReason, setHoldReason] = useState<string>("");

  if (!deal) return null;

  const handleSetWallet = async () => {
    if (!walletAddress.trim()) {
      toast({ title: "Enter a wallet address", variant: "destructive" });
      return;
    }
    setLoading(true);
    await supabase.from("deals").update({ escrow_wallet_address: walletAddress.trim() }).eq("id", deal.id);
    toast({ title: "Escrow wallet set" });
    setWalletAddress("");
    onUpdated();
    setLoading(false);
  };

  const handleConfirmDeposit = async () => {
    setLoading(true);
    await supabase.from("deals").update({
      status: "deposited",
      deposit_confirmed_at: new Date().toISOString(),
    }).eq("id", deal.id);
    toast({ title: "Deposit confirmed — funds secured in escrow" });
    onUpdated();
    setLoading(false);
  };

  const handleMarkDelivered = async () => {
    setLoading(true);
    await supabase.from("deals").update({
      status: "item_delivered",
      item_delivered_at: new Date().toISOString(),
    }).eq("id", deal.id);
    toast({ title: "Marked as delivered" });
    onUpdated();
    setLoading(false);
  };

  const performRelease = async () => {
    setLoading(true);
    await supabase.from("deals").update({
      status: "completed",
      funds_released_at: new Date().toISOString(),
    }).eq("id", deal.id);
    toast({ title: "Funds released — deal completed!" });
    onUpdated();
    setLoading(false);
  };

  const handleReleaseFunds = async () => {
    const hasMfa = await userHasVerifiedMfa();
    if (hasMfa) {
      setReleaseMfaOpen(true);
      return;
    }
    await performRelease();
  };

  const handleRefund = async () => {
    if (!confirm("Refund the buyer and close this deal? This action is final.")) return;
    setLoading(true);
    await supabase.from("deals").update({ status: "refunded" }).eq("id", deal.id);
    toast({ title: "Buyer refunded — deal closed" });
    onUpdated();
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this deal? It will be closed for both parties.")) return;
    setLoading(true);
    await supabase.from("deals").update({ status: "cancelled" }).eq("id", deal.id);
    toast({ title: "Deal cancelled" });
    onUpdated();
    setLoading(false);
  };

  const currentFeePct = Number(deal.fee_percent ?? 0);
  const dealAmount = Number(deal.amount ?? 0);
  const calcFeeAmount = (pct: number) => Math.round(dealAmount * pct) / 100;

  const setFeeTo = async (newPct: number) => {
    if (Number.isNaN(newPct) || newPct < 0 || newPct > 100) {
      toast({ title: "Fee must be between 0 and 100%", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("deals").update({
      fee_percent: newPct,
      fee_amount: calcFeeAmount(newPct),
      fee_set_by: user.id,
      fee_updated_at: new Date().toISOString(),
    }).eq("id", deal.id);
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't update fee", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Fee set to ${newPct}%` });
    setFeeInput("");
    setBumpInput("");
    onUpdated();
  };

  const handleApplyFee = () => setFeeTo(parseFloat(feeInput));

  const handleBumpFee = () => {
    const delta = parseFloat(bumpInput);
    if (Number.isNaN(delta) || delta <= 0) {
      toast({ title: "Enter a positive number to add", variant: "destructive" });
      return;
    }
    setFeeTo(Math.round((currentFeePct + delta) * 100) / 100);
  };

  const handlePlaceHold = async () => {
    if (!holdReason.trim()) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("deals").update({
      payout_hold: true,
      payout_hold_reason: holdReason.trim(),
      payout_hold_set_by: user.id,
      payout_hold_set_at: new Date().toISOString(),
    }).eq("id", deal.id);
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't place hold", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Payout placed on security hold", description: "A support ticket has been opened." });
    setHoldReason("");
    onUpdated();
  };

  const handleReleaseHold = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("deals").update({
      payout_hold: false,
      payout_hold_set_by: user.id,
    }).eq("id", deal.id);
    setLoading(false);
    if (error) {
      toast({ title: "Couldn't release hold", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Hold released" });
    onUpdated();
  };

  const isClosed = ["completed", "cancelled", "refunded"].includes(deal.status);
  const releaseBlocked = !!deal.payout_hold;

  return (
    <Dialog open={!!deal} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Escrow Controls
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Deal summary */}
          <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deal</span>
              <span className="font-mono text-foreground text-xs">{deal.id.slice(0, 12)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coin</span>
              <span className="text-foreground">{deal.coin} ({deal.coin_network})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-foreground font-semibold">${deal.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="secondary" className="capitalize">{deal.status?.replace(/_/g, " ")}</Badge>
            </div>
            {deal.escrow_wallet_address && (
              <div className="pt-1">
                <span className="text-muted-foreground text-xs">Escrow wallet:</span>
                <p className="font-mono text-xs text-foreground break-all">{deal.escrow_wallet_address}</p>
              </div>
            )}
            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Current fee</span>
              <span className="text-foreground">{currentFeePct}%{deal.fee_amount ? ` ($${Number(deal.fee_amount).toFixed(2)})` : ""}</span>
            </div>
            {deal.payout_hold && (
              <div className="flex justify-between">
                <span className="text-destructive font-medium">Payout</span>
                <Badge variant="destructive">On hold</Badge>
              </div>
            )}
          </div>

          {/* Fee controls — admin only (admin route is gated by useAdmin) */}
          {!isClosed && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" /> Deal fee
              </p>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Set fee to (%)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    placeholder={String(currentFeePct)}
                    value={feeInput}
                    onChange={(e) => setFeeInput(e.target.value)}
                    className="bg-background h-8 text-sm"
                  />
                  <Button size="sm" className="h-8" onClick={handleApplyFee} disabled={loading || feeInput === ""}>
                    Apply
                  </Button>
                </div>
              </div>
              <div className="space-y-2 pt-1 border-t border-border/30">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Increase fee by (%)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="e.g. 0.5"
                    value={bumpInput}
                    onChange={(e) => setBumpInput(e.target.value)}
                    className="bg-background h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" className="h-8" onClick={handleBumpFee} disabled={loading || bumpInput === ""}>
                    +Bump
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Both parties are notified automatically and a system message is posted in chat.
                </p>
              </div>
            </div>
          )}

          {/* Payout hold controls */}
          {!isClosed && (
            <div className={`rounded-lg border p-3 space-y-3 ${deal.payout_hold ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
              <p className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" /> Security hold
              </p>
              {deal.payout_hold ? (
                <>
                  <p className="text-xs text-foreground">Payout is on hold. Reason shown to both parties:</p>
                  <p className="text-sm font-medium text-foreground italic">"{deal.payout_hold_reason}"</p>
                  <Button size="sm" variant="outline" className="w-full gap-2" onClick={handleReleaseHold} disabled={loading}>
                    <ShieldCheck className="h-4 w-4" /> Release hold
                  </Button>
                </>
              ) : (
                <>
                  <Textarea
                    placeholder="Reason (shown to user — e.g. 'Suspicious activity detected, awaiting manual review.')"
                    rows={3}
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    className="bg-background text-sm"
                  />
                  <Button size="sm" variant="destructive" className="w-full gap-2" onClick={handlePlaceHold} disabled={loading}>
                    <ShieldAlert className="h-4 w-4" /> Hold payout & open support ticket
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Blocks the seller from receiving funds. A support ticket is auto-created and both parties are notified.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Wallet setup (any pre-deposit state) */}
          {(deal.status === "awaiting_deposit" || deal.status === "deposit_pending") && !deal.escrow_wallet_address && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Set Escrow Wallet Address
              </label>
              <Input
                placeholder="Paste wallet address..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="font-mono text-xs"
              />
              <Button onClick={handleSetWallet} disabled={loading} className="w-full gap-2">
                <ArrowDown className="h-4 w-4" /> Set Wallet Address
              </Button>
            </div>
          )}

          {/* Confirm deposit — pre-deposit states */}
          {(deal.status === "awaiting_deposit" || deal.status === "deposit_pending") && (
            <Button onClick={handleConfirmDeposit} disabled={loading} className="w-full gap-2">
              <Lock className="h-4 w-4" />
              {deal.status === "deposit_pending" ? "Confirm Buyer's Deposit Arrived" : "Manually Confirm Deposit Received"}
            </Button>
          )}

          {/* Deposited — funds in escrow */}
          {deal.status === "deposited" && (
            <>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                <Lock className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-sm text-foreground font-medium">Funds in Escrow</p>
                <p className="text-xs text-muted-foreground">Waiting for item delivery / buyer confirmation</p>
              </div>
              <Button onClick={handleMarkDelivered} disabled={loading} variant="outline" className="w-full gap-2">
                <Package className="h-4 w-4" /> Force-Mark Item Delivered
              </Button>
            </>
          )}

          {/* Item delivered — release */}
          {deal.status === "item_delivered" && (
            <div className="space-y-3">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                <Package className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-sm text-foreground font-medium">Buyer Confirmed Receipt</p>
                <p className="text-xs text-muted-foreground">Ready to release funds to seller</p>
              </div>
              <Button onClick={handleReleaseFunds} disabled={loading || releaseBlocked} className="w-full gap-2">
                <CheckCircle className="h-4 w-4" />
                {releaseBlocked ? "Release blocked — hold active" : "Release Funds to Seller"}
              </Button>
            </div>
          )}

          {/* Allow admin to release directly even from "deposited" if needed */}
          {deal.status === "deposited" && (
            <Button onClick={handleReleaseFunds} disabled={loading || releaseBlocked} variant="outline" className="w-full gap-2">
              <CheckCircle className="h-4 w-4" />
              {releaseBlocked ? "Release blocked — hold active" : "Release Funds Now (skip buyer confirmation)"}
            </Button>
          )}

          {/* Completed */}
          {deal.status === "completed" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
              <CheckCircle className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-sm text-foreground font-medium">Deal Completed</p>
              <p className="text-xs text-muted-foreground">Funds released at {deal.funds_released_at ? new Date(deal.funds_released_at).toLocaleString() : "—"}</p>
            </div>
          )}

          {/* Refund / Cancel — destructive actions, hidden after final state */}
          {!isClosed && (
            <div className="border-t border-border/30 pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">Destructive actions</p>
              {(deal.status === "deposited" || deal.status === "item_delivered" || deal.status === "disputed") && (
                <Button onClick={handleRefund} disabled={loading} variant="destructive" className="w-full gap-2">
                  <Undo2 className="h-4 w-4" /> Refund Buyer
                </Button>
              )}
              <Button onClick={handleCancel} disabled={loading} variant="outline" className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10">
                <Ban className="h-4 w-4" /> Cancel Deal
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      <MfaChallengeDialog
        open={releaseMfaOpen}
        onClose={() => setReleaseMfaOpen(false)}
        onVerified={async () => {
          setReleaseMfaOpen(false);
          await performRelease();
        }}
        title="Confirm release of funds"
        description="Enter your authenticator code to confirm releasing funds to the seller."
      />
    </Dialog>
  );
};

export default AdminEscrowDialog;
