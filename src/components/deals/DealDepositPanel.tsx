import { Button } from "@/components/ui/button";
import { Wallet, CreditCard, CheckCircle2, Send, Loader2, Copy, AlertTriangle, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCryptoPrice } from "@/hooks/useCryptoPrice";

interface CoinMeta {
  name: string;
  network: string;
  image: string;
}

interface DealDepositPanelProps {
  deal: any;
  userId: string;
  coinMeta: CoinMeta | null;
  senderName: string;
  receiverName: string;
  isSender: boolean;
  onMarkDepositSent?: () => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const DealDepositPanel = ({
  deal,
  userId,
  coinMeta,
  senderName,
  receiverName,
  isSender,
  onMarkDepositSent,
  onRefresh,
  loading,
}: DealDepositPanelProps) => {
  const { toast } = useToast();
  const amount = deal.amount ? Number(deal.amount).toFixed(2) : "0.00";
  const feeAmount = deal.fee_amount ? Number(deal.fee_amount).toFixed(2) : null;
  const pending = deal.status === "deposit_pending";

  const copyAddress = async () => {
    if (!deal.escrow_wallet_address) return;
    await navigator.clipboard.writeText(deal.escrow_wallet_address);
    toast({ title: "Address copied" });
  };

  // Live crypto price from CoinGecko (cached 60s).
  const { price } = useCryptoPrice(deal.coin);
  const usd = deal.amount ? Number(deal.amount) : 0;
  const cryptoAmount =
    price && usd > 0
      ? (usd / price).toLocaleString(undefined, { maximumFractionDigits: 8 })
      : "—";
  const exchangeRate =
    coinMeta && price
      ? `1 ${shortSymbol(deal.coin)} = $${price.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD`
      : null;

  // --- Sender view: Payment Invoice ---
  if (isSender) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Payment Invoice</h2>
            <p className="mt-1 text-[13px] font-medium text-muted-foreground">Please notify staff if support is required</p>
          </div>
          {exchangeRate && (
            <div className="text-right text-[13px]">
              <p className="text-muted-foreground">Exchange rate</p>
              <p className="font-bold text-foreground">{exchangeRate}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Deal Summary */}
          <div className="rounded-xl border border-border/50 bg-background/40 p-4">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <h3 className="text-[15px] font-bold text-foreground">Deal Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <Field label="Sender" value={senderName} />
              <Field label="Receiver" value={receiverName} />
              <Field
                label="Coin"
                value={
                  <span className="flex items-center gap-2">
                    {coinMeta && <img src={coinMeta.image} alt={coinMeta.name} className="h-4 w-4 rounded-full object-contain" />}
                    {deal.coin}
                  </span>
                }
              />
              <Field label="Deal Value" value={`$${amount}`} suffix="USD" />
              <Field label="Fee" value={feeAmount ? `$${feeAmount}` : "Free"} suffix="USD" />
            </div>
          </div>

          {/* Payment Invoice */}
          <div className="rounded-xl border border-border/50 bg-background/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <h3 className="text-[15px] font-bold text-foreground">Payment Invoice</h3>
                </div>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Please send funds as a part of the deal to the Middleman address below
                </p>
              </div>
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md bg-muted/50 text-muted-foreground">
                <QrCode className="h-12 w-12" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Address:</p>
                  <button
                    onClick={copyAddress}
                    disabled={!deal.escrow_wallet_address}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                    aria-label="Copy address"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2 font-mono text-[12px] text-foreground min-h-[34px] flex items-center break-all">
                  {deal.escrow_wallet_address || <span className="opacity-40">—</span>}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center gap-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground">Amount:</p>
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-[13px] text-foreground">
                  <span className="font-semibold">{cryptoAmount} {shortSymbol(deal.coin)}</span>
                  <span className="text-[11px] text-muted-foreground">${amount} USD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-3">
          <span className="text-[13px] text-muted-foreground">Current status:</span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4" />
            {pending ? "Verifying deposit" : "Awaiting your deposit"}
          </span>
          {onMarkDepositSent && !pending ? (
            <Button
              onClick={onMarkDepositSent}
              disabled={loading}
              className="h-9 rounded-lg bg-primary px-4 text-[13px] font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Send className="mr-1 h-3.5 w-3.5" /> I've sent the deposit
            </Button>
          ) : (
            <Button
              onClick={onRefresh}
              disabled={loading}
              className="h-9 rounded-lg bg-primary px-4 text-[13px] font-bold text-primary-foreground hover:bg-primary/90"
            >
              Check again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Heading row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">
            Waiting for {senderName} to deposit
          </h2>
          <p className="mt-1 text-[13px] font-medium text-muted-foreground">
            Waiting for the sender to deposit the agreed amount into the escrow wallet. Deposit status will be updated below. Contact support for any issues.
          </p>
        </div>
      </div>

      {/* Two columns: Deal Summary + Your side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Deal Summary */}
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h3 className="text-[15px] font-bold text-foreground">Deal Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <Field label="Sender" value={senderName} />
            <Field label="Receiver" value={receiverName} />
            <Field
              label="Coin"
              value={
                <span className="flex items-center gap-2">
                  {coinMeta && <img src={coinMeta.image} alt={coinMeta.name} className="h-4 w-4 rounded-full object-contain" />}
                  {deal.coin}
                </span>
              }
            />
            <Field label="Deal Value" value={`$${amount}`} suffix="USD" />
            <Field label="Fee" value={feeAmount ? `$${feeAmount}` : "Free"} suffix="USD" />
          </div>
        </div>

        {/* Your side */}
        <div className="rounded-xl border border-border/50 bg-background/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-[15px] font-bold text-foreground">Your side</h3>
          </div>

          <p className="text-[13px] leading-relaxed text-muted-foreground">
              The sender is now expected the agreed amount. When their deposit is seen on-chain, this deal moves forward automatically after confirmations. Wait until confirmations are reached.
              <br /><br />
              Use <span className="font-semibold text-foreground">Check again</span> below if the status does not update.
            </p>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-3">
        <span className="text-[13px] text-muted-foreground">Current status:</span>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary">
          <CheckCircle2 className="h-4 w-4" />
          {pending ? "Verifying deposit" : "Awaiting deposit"}
        </span>
        <Button
          onClick={onRefresh}
          disabled={loading}
          className="h-9 rounded-lg bg-primary px-4 text-[13px] font-bold text-primary-foreground hover:bg-primary/90"
        >
          Check again
        </Button>
      </div>
    </div>
  );
};

const Field = ({ label, value, suffix }: { label: string; value: React.ReactNode; suffix?: string }) => (
  <div>
    <p className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</p>
    <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-[13px] font-semibold text-foreground">
      <span className="truncate">{value}</span>
      {suffix && <span className="text-[10px] font-medium text-muted-foreground">{suffix}</span>}
    </div>
  </div>
);

const shortSymbol = (coin?: string) => {
  if (!coin) return "";
  const map: Record<string, string> = {
    Bitcoin: "BTC",
    Ethereum: "ETH",
    Litecoin: "LTC",
    Solana: "SOL",
    USDC: "USDC",
    USDT: "USDT",
  };
  return map[coin] || coin.toUpperCase().slice(0, 4);
};

export default DealDepositPanel;