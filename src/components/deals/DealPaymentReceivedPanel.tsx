import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Package, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useCryptoPrice } from "@/hooks/useCryptoPrice";

interface Props {
  deal: any;
  isSender: boolean; // sender = buyer (paid)
  receiverName: string;
  onRelease?: () => void;
  onBack?: () => void;
  loading?: boolean;
}

const shortSymbol = (coin?: string) => {
  if (!coin) return "";
  const map: Record<string, string> = {
    Bitcoin: "BTC", Ethereum: "ETH", Litecoin: "LTC", Solana: "SOL", USDC: "USDC", USDT: "USDT",
  };
  return map[coin] || coin.toUpperCase().slice(0, 4);
};

// Basic address format validation per coin. Network-aware: USDC/USDT default to ERC-20.
const ADDRESS_RULES: Record<string, { regex: RegExp; example: string }> = {
  BTC: {
    regex: /^(bc1[a-z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    example: "bc1... or 1.../3...",
  },
  LTC: {
    regex: /^(ltc1[a-z0-9]{25,87}|[LM3][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    example: "ltc1... or L.../M...",
  },
  ETH: { regex: /^0x[a-fA-F0-9]{40}$/, example: "0x..." },
  USDC: { regex: /^0x[a-fA-F0-9]{40}$/, example: "0x..." },
  USDT: { regex: /^(0x[a-fA-F0-9]{40}|T[a-km-zA-HJ-NP-Z1-9]{33})$/, example: "0x... or T..." },
  SOL: { regex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, example: "Base58 address" },
};

const validateAddress = (coinSymbol: string, addr: string): { ok: boolean; reason?: string } => {
  const rule = ADDRESS_RULES[coinSymbol];
  if (!rule) return { ok: true }; // Unknown coin — skip strict check
  if (!rule.regex.test(addr)) {
    return { ok: false, reason: `Not a valid ${coinSymbol} address. Expected format: ${rule.example}` };
  }
  return { ok: true };
};

const truncate = (s: string, n = 6) => (s.length > n * 2 + 3 ? `${s.slice(0, n)}...${s.slice(-n)}` : s);

const DealPaymentReceivedPanel = ({ deal, isSender, receiverName, onRelease, onBack, loading }: Props) => {
  const { toast } = useToast();
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [payoutAddress, setPayoutAddress] = useState("");
  const [savedAddress, setSavedAddress] = useState<string | null>(null);

  const sym = shortSymbol(deal.coin);
  const amountUsd = deal.amount ? Number(deal.amount).toFixed(2) : "0.00";
  // Live crypto price from CoinGecko (stables resolve to 1 instantly).
  const { price } = useCryptoPrice(deal.coin);
  const usd = deal.amount ? Number(deal.amount) : 0;
  const cryptoAmount =
    price && usd > 0
      ? (usd / price).toLocaleString(undefined, { maximumFractionDigits: 8 })
      : "—";
  const fakeTx = "c113cdc0...0847b5";

  const handleSetPayout = () => {
    const trimmed = payoutAddress.trim();
    if (!trimmed) {
      toast({ title: "Address required", description: `Enter your ${sym} payout address.`, variant: "destructive" });
      return;
    }
    const check = validateAddress(sym, trimmed);
    if (!check.ok) {
      toast({ title: `Invalid ${sym} address`, description: check.reason, variant: "destructive" });
      return;
    }
    setSavedAddress(trimmed);
    toast({ title: "Payout address saved" });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Scam warning */}
      <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-[13px] leading-snug text-red-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <span>
          <span className="font-semibold">Scam Warning:</span> Always verify deal details directly through the website chat and never do deals through Discord DMs alone.
        </span>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">
          Payment Received
        </h2>
        <p className="mt-1 text-[13px] font-medium text-muted-foreground">
          Payment is now secured, and reached number of required confirmations
        </p>
      </div>

      {/* Action card */}
      {isSender ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Package className="mt-0.5 h-4 w-4 text-primary" />
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-foreground">You may now proceed with the deal</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Payment has been secured. The receiver (<span className="font-semibold text-foreground">{receiverName}</span>) may now deliver the agreed goods to you.
                <br />Click <span className="font-semibold text-foreground">Release</span> once you have received everything as agreed.
              </p>
            </div>
          </div>
          <Button
            onClick={onRelease}
            disabled={loading || !savedAddress && false}
            className="h-9 rounded-lg bg-primary px-5 text-[13px] font-bold text-primary-foreground hover:bg-primary/90"
          >
            Release
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <p className="text-[15px] font-bold text-foreground">You may now deliver the goods</p>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            The sender's payment has been secured. You may now provide the agreed goods to the sender.
            <br />Enter your <span className="font-semibold text-foreground">{sym} {deal.coin}</span> address below to receive payment once the deal is released.
          </p>
        </div>
      )}

      {/* Payout address row (receiver only) */}
      {!isSender && (
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[13px] font-medium text-muted-foreground min-w-[180px]">
              Provide {sym} {deal.coin} Address
            </p>
            <Input
              value={payoutAddress}
              onChange={(e) => setPayoutAddress(e.target.value)}
              placeholder="Enter Address..."
              className="flex-1 h-10 bg-muted/40 border-border/50 text-[13px]"
            />
            <Button
              onClick={handleSetPayout}
              className="h-10 rounded-lg bg-muted text-foreground hover:bg-muted/80 px-4 text-[13px] font-semibold"
            >
              Set payout address
            </Button>
          </div>
          {savedAddress && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Saved: <span className="font-mono text-foreground">{truncate(savedAddress, 8)}</span>
            </p>
          )}
        </div>
      )}

      {/* Payment Received summary */}
      <div className="rounded-xl border border-border/50 bg-background/40 p-4">
        <p className="text-[15px] font-bold text-foreground">Payment Received</p>
        <div className="mt-3 space-y-2 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Tx:</span>
            <button
              type="button"
              onClick={() => setTxDialogOpen(true)}
              className="font-mono text-primary underline-offset-2 hover:underline cursor-pointer"
            >
              {fakeTx}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-semibold text-foreground">{cryptoAmount} {sym} (${amountUsd} USD)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Fee:</span>
            <span className="font-semibold text-foreground">{deal.fee_amount ? `$${Number(deal.fee_amount).toFixed(2)}` : "Free"}</span>
          </div>
        </div>
      </div>

      {/* Footer status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-3">
        {onBack ? (
          <Button
            onClick={onBack}
            variant="outline"
            className="h-9 rounded-lg px-4 text-[13px] font-semibold"
          >
            ← Back
          </Button>
        ) : <span />}
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          {isSender
            ? `Waiting for ${receiverName} to submit address.`
            : "Submit your payout address with Set payout address above."}
        </span>
        <Button
          disabled
          className="h-9 rounded-lg bg-primary/60 px-5 text-[13px] font-bold text-primary-foreground"
        >
          Continue
        </Button>
      </div>

      <AlertDialog open={txDialogOpen} onOpenChange={setTxDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transaction hidden</AlertDialogTitle>
            <AlertDialogDescription>
              The user has chose to make the TXID private for privacy reasons.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DealPaymentReceivedPanel;