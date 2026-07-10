import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Send, Lock, Package, AlertTriangle, XCircle, ArrowDown, Users } from "lucide-react";

interface DealProgressIndicatorProps {
  deal: any;
  userId: string;
}

type StatusInfo = {
  label: string;
  detail: string;
  tone: "info" | "success" | "warning" | "danger";
  Icon: any;
  pulse?: boolean;
};

const getStatusInfo = (deal: any, isBuyer: boolean, isSeller: boolean): StatusInfo => {
  const coin = deal.coin || "crypto";
  const amount = deal.amount ? `$${deal.amount}` : "the agreed amount";

  switch (deal.status) {
    case "pending":
    case "select_user":
      // Once both participants are attached we're past the "find a user"
      // sub-step and into the mutual role-assignment sub-step. The DB
      // trigger will flip status to awaiting_deposit when both confirm.
      if (deal.other_user_id) {
        return {
          label: "Confirm your roles",
          detail: "Both parties need to pick Sender / Receiver and confirm before escrow begins.",
          tone: "info",
          Icon: Users,
          pulse: true,
        };
      }
      return {
        label: "Setting up the deal",
        detail: "Waiting for both parties to be added before escrow begins.",
        tone: "info",
        Icon: Clock,
        pulse: true,
      };
    case "awaiting_deposit":
      return {
        label: isBuyer ? "Awaiting your deposit" : "Waiting for buyer's deposit",
        detail: isBuyer
          ? `Send ${amount} in ${coin} to the escrow address shown below.`
          : `The buyer needs to deposit ${amount} in ${coin} into escrow.`,
        tone: "info",
        Icon: ArrowDown,
        pulse: true,
      };
    case "deposit_pending":
      return {
        label: "Crypto has been sent — verifying on-chain",
        detail: isBuyer
          ? "We're confirming your deposit on the blockchain. You'll be notified once it lands."
          : "The buyer reports the deposit is sent. We're verifying it on-chain now.",
        tone: "warning",
        Icon: Send,
        pulse: true,
      };
    case "deposited":
      return {
        label: "Funds received — secured in escrow",
        detail: isSeller
          ? "The buyer's funds are locked in escrow. You can safely deliver the item now."
          : "Your funds are safely held in escrow until you confirm receipt of the item.",
        tone: "success",
        Icon: Lock,
      };
    case "item_delivered":
      return {
        label: "Item confirmed — releasing funds",
        detail: "The buyer confirmed delivery. Funds are being released to the seller.",
        tone: "success",
        Icon: Package,
        pulse: true,
      };
    case "completed":
      return {
        label: "The deal has been marked as completed",
        detail: "Funds have been released. Thanks for using Halal Middleman!",
        tone: "success",
        Icon: CheckCircle2,
      };
    case "disputed":
      return {
        label: "Deal in dispute",
        detail: "A dispute is open. Our team is reviewing the case.",
        tone: "warning",
        Icon: AlertTriangle,
        pulse: true,
      };
    case "refunded":
      return {
        label: "Buyer refunded",
        detail: "Funds were returned to the buyer. This deal is closed.",
        tone: "danger",
        Icon: AlertTriangle,
      };
    case "cancelled":
      return {
        label: "Deal cancelled",
        detail: "This deal was cancelled and is no longer active.",
        tone: "danger",
        Icon: XCircle,
      };
    default:
      return {
        label: deal.status?.replace(/_/g, " ") || "Updating",
        detail: "Live deal status.",
        tone: "info",
        Icon: Clock,
      };
  }
};

const toneClasses: Record<StatusInfo["tone"], { wrap: string; icon: string; dot: string; chip: string }> = {
  info: {
    wrap: "border-primary/30 bg-primary/5",
    icon: "text-primary bg-primary/10",
    dot: "bg-primary",
    chip: "bg-primary/15 text-primary border-primary/30",
  },
  success: {
    wrap: "border-primary/40 bg-primary/10",
    icon: "text-primary bg-primary/15",
    dot: "bg-primary",
    chip: "bg-primary/20 text-primary border-primary/40",
  },
  warning: {
    wrap: "border-yellow-500/30 bg-yellow-500/5",
    icon: "text-yellow-500 bg-yellow-500/10",
    dot: "bg-yellow-500",
    chip: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  },
  danger: {
    wrap: "border-destructive/30 bg-destructive/5",
    icon: "text-destructive bg-destructive/10",
    dot: "bg-destructive",
    chip: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

const DealProgressIndicator = ({ deal, userId }: DealProgressIndicatorProps) => {
  const creatorRole = (deal.creator_role || "buyer") as "buyer" | "seller";
  const isCreator = deal.creator_id === userId;
  const isOtherUser = deal.other_user_id === userId;
  const isBuyer = (isCreator && creatorRole === "buyer") || (isOtherUser && creatorRole === "seller");
  const isSeller = (isCreator && creatorRole === "seller") || (isOtherUser && creatorRole === "buyer");

  // If a cancellation request is pending and the deal isn't already terminal,
  // override the status banner to highlight the pending approval.
  const cancelRequestedBy = deal.cancel_requested_by as string | null | undefined;
  const cancelPending =
    !!cancelRequestedBy &&
    !["completed", "cancelled", "refunded"].includes(deal.status);
  const iRequestedCancel = cancelRequestedBy === userId;

  const info: StatusInfo = cancelPending
    ? {
        label: iRequestedCancel
          ? "Waiting for the other party to approve cancellation"
          : "Cancellation requested — your approval needed",
        detail: iRequestedCancel
          ? "You requested to cancel this deal. The other party can approve or decline."
          : "The other party wants to cancel. Open the cancel dialog to approve or decline.",
        tone: "warning",
        Icon: AlertTriangle,
        pulse: true,
      }
    : getStatusInfo(deal, isBuyer, isSeller);
  const classes = toneClasses[info.tone];
  const { Icon } = info;

  // Flash effect when status changes (real-time feedback)
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(t);
  }, [deal.status, deal.cancel_requested_by]);

  return (
    <div
      className={`rounded-xl border ${classes.wrap} p-4 transition-all duration-500 ${
        flash ? "ring-2 ring-primary/40 scale-[1.01]" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <img
          src="/images/auto-bot.gif"
          alt="Halal Bot"
          className="h-10 w-10 rounded-full object-cover flex-shrink-0 border border-primary/30"
        />
        <div className={`h-9 w-9 rounded-lg ${classes.icon} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Live status</span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${classes.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${classes.dot} ${info.pulse ? "animate-pulse" : ""}`} />
              {info.pulse ? "in progress" : "current"}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground leading-tight mt-0.5">{info.label}</p>
          <p className="text-xs text-muted-foreground leading-snug mt-0.5">{info.detail}</p>
        </div>
      </div>
    </div>
  );
};

export default DealProgressIndicator;