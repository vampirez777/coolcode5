import { Coins, UserPlus, Send, Lock, Package, CheckCircle } from "lucide-react";

interface DealStepGuideProps {
  deal: any;
  userId: string;
  otherUsername?: string;
}

/**
 * Friendly, role-aware step-by-step guide that shows the user exactly what
 * to do next. Different copy for buyer (creator) vs seller (other_user).
 */
const DealStepGuide = ({ deal, userId, otherUsername }: DealStepGuideProps) => {
  // Derive role from deal.creator_role (defaults to 'buyer' for legacy deals).
  // Creator's role is set at deal creation; the other party gets the opposite role.
  const creatorRole = (deal.creator_role || "buyer") as "buyer" | "seller";
  const isCreator = deal.creator_id === userId;
  const isOther = deal.other_user_id === userId;
  const myRole = isCreator ? creatorRole : isOther ? (creatorRole === "buyer" ? "seller" : "buyer") : "viewer";
  const role = myRole;
  const otherName = otherUsername || (role === "buyer" ? "the seller" : "the buyer");

  const steps =
    role === "buyer"
      ? [
          {
            icon: Coins,
            title: "1. Deal created",
            body: `You created a ${deal.coin || "crypto"} deal for $${deal.amount || "—"}.`,
          },
          {
            icon: UserPlus,
            title: "2. Other party joined",
            body: `${otherName} has been added to the deal.`,
          },
          {
            icon: Send,
            title: "3. Send your deposit",
            body: `Send exactly $${deal.amount} of ${deal.coin} (${deal.coin_network}) to the escrow address shown below, then tap "I've Sent the Deposit".`,
          },
          {
            icon: Lock,
            title: "4. Funds verified & secured",
            body: "We verify your deposit on-chain and lock it in escrow. You'll see a confirmation in chat.",
          },
          {
            icon: Package,
            title: "5. Receive the item",
            body: `${otherName} delivers the agreed item. Inspect it carefully.`,
          },
          {
            icon: CheckCircle,
            title: "6. Release the funds",
            body: 'When you\'re happy with what you received, tap "I Received the Item — Release Funds". The seller is paid out and the deal is complete.',
          },
        ]
      : [
          {
            icon: Coins,
            title: "1. You were invited",
            body: `${otherName} created a ${deal.coin || "crypto"} deal for $${deal.amount || "—"} and added you as the seller.`,
          },
          {
            icon: Send,
            title: "2. Buyer sends deposit",
            body: `${otherName} sends the agreed amount to the escrow wallet. Do NOT release the item yet.`,
          },
          {
            icon: Lock,
            title: "3. Funds verified & secured",
            body: "Once the deposit is verified on-chain, you'll see a confirmation in chat. Only then start preparing the item.",
          },
          {
            icon: Package,
            title: "4. Deliver the item",
            body: `Deliver the agreed item to ${otherName}, then tap "I've Delivered the Item" so they know to confirm receipt.`,
          },
          {
            icon: CheckCircle,
            title: "5. Get paid",
            body: "When the buyer confirms receipt, the funds in escrow are released to your wallet and the deal is complete.",
          },
        ];

  const Title = role === "buyer" ? "How this deal works (Buyer)" : "How this deal works (Seller)";

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">{Title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          A safe, step-by-step crypto escrow deal. Follow each step from top to bottom.
        </p>
      </div>
      <ol className="space-y-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default DealStepGuide;
