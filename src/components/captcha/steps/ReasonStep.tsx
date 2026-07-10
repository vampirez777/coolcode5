import { useState } from "react";
import { ShieldQuestion, Loader2, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StepShell from "./StepShell";
import { submitAccessRequest } from "@/lib/accessRequest";

interface Props {
  step: number;
  total: number;
  browserId: string;
  onSubmitted: (requestId: string) => void;
  /** When true, copy is tailored for visitors arriving without a deal invite link. */
  variant?: "vpn" | "no-invite";
}

const MIN_LEN = 30;
const MAX_LEN = 1000;

const ReasonStep = ({ step, total, browserId, onSubmitted, variant = "vpn" }: Props) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN;

  const handleSubmit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const res = await submitAccessRequest({
      browserId,
      reason: `[${variant}] ${trimmed}`,
    });
    setBusy(false);
    if (res.ok && res.requestId) {
      onSubmitted(res.requestId);
    } else {
      setError("We couldn't submit your request. Please try again.");
    }
  };

  const isNoInvite = variant === "no-invite";
  const title = isNoInvite ? "Final step — manual review" : "One last step — manual review";
  const description = isNoInvite
    ? "You arrived without a deal invite link, so an admin needs to manually approve your access. Tell us briefly why you'd like to use HalalMiddleman.net and we'll get back to you."
    : "Your connection looks unusual to our automated checks (Tor, datacenter, or known proxy). Tell us a bit about why you'd like access and our team will review it.";
  const label = isNoInvite
    ? "Why would you like access to HalalMiddleman.net?"
    : "Why do you want access, and why are you on a VPN/Tor?";
  const placeholder = isNoInvite
    ? "e.g. I'd like to buy/sell crypto via your escrow service. I heard about you from… and plan to use the platform to safely…"
    : "e.g. I'm a customer based in [country] and I use a VPN for privacy. I'd like to use your escrow service for a crypto transaction with…";

  return (
    <StepShell
      step={step}
      total={total}
      tone="warning"
      icon={
        isNoInvite ? (
          <img
            src="/images/auto-bot.gif"
            alt="Halal Bot"
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <ShieldQuestion className="h-8 w-8 text-amber-500" />
        )
      }
      title={title}
      description={description}
    >
      <div className="w-full text-left space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            {label}
          </label>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full transition-colors ${
            valid
              ? "bg-primary/15 text-primary"
              : trimmed.length > 0
              ? "bg-amber-500/10 text-amber-500"
              : "bg-muted text-muted-foreground"
          }`}>
            {trimmed.length} / {MAX_LEN}
          </span>
        </div>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, MAX_LEN))}
          placeholder={placeholder}
          className="min-h-[150px] resize-none bg-background/60 text-sm leading-relaxed"
          disabled={busy}
        />
        <div className={`flex items-center gap-1.5 text-xs ${valid ? "text-primary" : "text-muted-foreground"}`}>
          {valid ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Looks good — you can submit</>
          ) : (
            <><AlertCircle className="h-3.5 w-3.5" /> {MIN_LEN - trimmed.length} more characters needed</>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!valid || busy}
          className="w-full"
          size="lg"
        >
          {busy ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
          ) : (
            <><Send className="h-4 w-4 mr-2" /> Submit for review</>
          )}
        </Button>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-muted-foreground leading-relaxed">
          ⏱️ Reviews usually take a few hours. Once approved you'll be remembered on this browser — no need to re-verify.
        </div>
      </div>
    </StepShell>
  );
};

export default ReasonStep;