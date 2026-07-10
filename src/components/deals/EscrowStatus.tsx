import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ArrowDown, Package, CheckCircle, Clock, AlertTriangle, Lock, Send, EyeOff } from "lucide-react";

interface EscrowStatusProps {
  deal: any;
  userId: string;
  onConfirmItemReceived: () => void;
  onMarkDepositSent?: () => void;
  onMarkItemDelivered?: () => void;
  loading?: boolean;
}

const ESCROW_STEPS = [
  { key: "awaiting_deposit", label: "Awaiting Deposit", icon: ArrowDown, description: "Buyer deposits crypto to escrow wallet" },
  { key: "deposited", label: "Funds Deposited", icon: Lock, description: "Crypto secured in escrow. Seller delivers the item" },
  { key: "item_delivered", label: "Item Delivered", icon: Package, description: "Buyer confirms item received. Funds ready for release" },
  { key: "completed", label: "Completed", icon: CheckCircle, description: "Funds released. Deal complete!" },
];

const getStepIndex = (status: string) => {
  // Treat deposit_pending as still on the awaiting_deposit step
  const normalized = status === "deposit_pending" ? "awaiting_deposit" : status;
  const idx = ESCROW_STEPS.findIndex((s) => s.key === normalized);
  return idx === -1 ? -1 : idx;
};

const EscrowStatus = ({ deal, userId, onConfirmItemReceived, onMarkDepositSent, onMarkItemDelivered, loading }: EscrowStatusProps) => {
  const currentStep = getStepIndex(deal.status);
  const creatorRole = (deal.creator_role || "buyer") as "buyer" | "seller";
  const isCreator = deal.creator_id === userId;
  const isOtherUser = deal.other_user_id === userId;
  // "isBuyer" = the user whose role is buyer in this deal (the depositor).
  const isBuyer = (isCreator && creatorRole === "buyer") || (isOtherUser && creatorRole === "seller");
  const isSeller = (isCreator && creatorRole === "seller") || (isOtherUser && creatorRole === "buyer");
  const terminal = deal.status === "cancelled" || deal.status === "refunded";

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Escrow Status</h2>
          <p className="text-xs text-muted-foreground">Secure middleman deal flow</p>
        </div>
        <Badge
          variant={deal.status === "completed" ? "default" : terminal ? "destructive" : "secondary"}
          className="ml-auto capitalize"
        >
          {deal.status?.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* Progress Steps (hidden if cancelled/refunded) */}
      {!terminal && (
        <div className="space-y-1">
          {ESCROW_STEPS.map((step, i) => {
            const isActive = i === currentStep;
            const isCompleted = i < currentStep || deal.status === "completed";
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isActive
                        ? "bg-primary/20 text-primary border-2 border-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  {i < ESCROW_STEPS.length - 1 && (
                    <div className={`w-0.5 h-8 ${isCompleted ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
                <div className="pt-1">
                  <p className={`text-sm font-medium ${isActive ? "text-foreground" : isCompleted ? "text-primary" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Escrow Wallet Address — only shown to the buyer (the depositor) */}
      {deal.status === "awaiting_deposit" && deal.escrow_wallet_address && isBuyer && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Deposit Address</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Send exactly <span className="text-primary font-bold">${deal.amount}</span> in {deal.coin} ({deal.coin_network}) to:
          </p>
          <div className="bg-muted rounded-md px-3 py-2">
            <p className="text-xs font-mono text-foreground break-all select-all">{deal.escrow_wallet_address}</p>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Only send the exact coin and network shown above. Incorrect deposits cannot be recovered.
          </p>
          {onMarkDepositSent && (
            <Button onClick={onMarkDepositSent} disabled={loading} variant="outline" className="w-full gap-2 mt-2">
              <Send className="h-4 w-4" /> I've Sent the Deposit
            </Button>
          )}
        </div>
      )}

      {/* Seller view while awaiting deposit — explain the address is buyer-only */}
      {deal.status === "awaiting_deposit" && isSeller && (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Waiting for buyer's deposit</p>
          </div>
          <p className="text-xs text-muted-foreground">
            For security, the escrow deposit address is only shown to the <span className="font-semibold text-foreground">buyer</span>. You don't need to see or handle it — once the buyer sends <span className="text-primary font-semibold">${deal.amount}</span> in {deal.coin} ({deal.coin_network}) to our escrow wallet, you'll get a chat update and can deliver the item.
          </p>
        </div>
      )}

      {deal.status === "awaiting_deposit" && !deal.escrow_wallet_address && isBuyer && (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-center">
          <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Generating your secure escrow wallet address — this usually takes a moment.</p>
        </div>
      )}

      {/* Deposit pending — buyer reported, awaiting admin confirmation */}
      {deal.status === "deposit_pending" && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Deposit Reported</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {isBuyer
              ? "We're verifying your deposit on the blockchain. You'll get a chat update as soon as it's confirmed."
              : "The buyer reports the deposit was sent. We're verifying it on-chain — you'll see a chat update once it's confirmed."}
          </p>
        </div>
      )}

      {/* Deposited — waiting for item delivery */}
      {deal.status === "deposited" && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Funds Secured in Escrow</p>
          </div>
          {isSeller ? (
            <>
              <p className="text-xs text-muted-foreground">
                The buyer has deposited funds. Please deliver the agreed item, then mark it as delivered below.
              </p>
              {onMarkItemDelivered && (
                <Button onClick={onMarkItemDelivered} disabled={loading} variant="outline" className="w-full gap-2 mt-2">
                  <Package className="h-4 w-4" /> I've Delivered the Item
                </Button>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Your funds are secured. Once the seller delivers the item, click below to confirm you received it.
            </p>
          )}
        </div>
      )}

      {/* Confirm Item Received button — only for creator (buyer) */}
      {deal.status === "deposited" && isBuyer && (
        <Button onClick={onConfirmItemReceived} disabled={loading} className="w-full gap-2">
          <Package className="h-4 w-4" /> I Received the Item — Release Funds
        </Button>
      )}

      {/* Item delivered — waiting for admin to release */}
      {deal.status === "item_delivered" && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-1">
          <Clock className="h-5 w-5 text-primary mx-auto" />
          <p className="text-sm font-semibold text-foreground">Item Confirmed — Releasing Funds</p>
          <p className="text-xs text-muted-foreground">
            The buyer confirmed receipt. Funds are being released to the seller — you'll see a chat update once it's done.
          </p>
        </div>
      )}

      {/* Completed */}
      {deal.status === "completed" && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-1">
          <CheckCircle className="h-5 w-5 text-primary mx-auto" />
          <p className="text-sm font-semibold text-foreground">Deal Complete!</p>
          <p className="text-xs text-muted-foreground">
            Funds have been released. This deal is finalized.
          </p>
        </div>
      )}

      {/* Refunded */}
      {deal.status === "refunded" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center space-y-1">
          <AlertTriangle className="h-5 w-5 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-foreground">Deal Refunded</p>
          <p className="text-xs text-muted-foreground">
            The funds were returned to the buyer. This deal is closed.
          </p>
        </div>
      )}

      {/* Cancelled */}
      {deal.status === "cancelled" && (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-center space-y-1">
          <AlertTriangle className="h-5 w-5 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">Deal Cancelled</p>
          <p className="text-xs text-muted-foreground">This deal was cancelled and is no longer active.</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="text-[10px] text-muted-foreground space-y-0.5 border-t border-border/30 pt-3">
        <p>Created: {new Date(deal.created_at).toLocaleString()}</p>
        {deal.deposit_confirmed_at && <p>Deposit confirmed: {new Date(deal.deposit_confirmed_at).toLocaleString()}</p>}
        {deal.item_delivered_at && <p>Item confirmed: {new Date(deal.item_delivered_at).toLocaleString()}</p>}
        {deal.funds_released_at && <p>Funds released: {new Date(deal.funds_released_at).toLocaleString()}</p>}
      </div>
    </div>
  );
};

export default EscrowStatus;
