import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  deal: any;
  userId: string;
  getUsername: (uid: string) => string;
  onBack?: () => void;
  onContinue?: () => void;
}

const sanitizeAmountInput = (value: string) => {
  const normalized = value.replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const [whole = "", ...decimalParts] = normalized.split(".");
  const decimals = decimalParts.join("").slice(0, 2);
  return normalized.includes(".") ? `${whole}.${decimals}` : whole;
};

const parseAmountInput = (value: string) => {
  const normalized = value.trim().replace(/,/g, ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
};

const amountsMatch = (a: number | null, b: number | null) =>
  a != null && b != null && Math.round(Number(a) * 100) === Math.round(Number(b) * 100);

const formatAmount = (value: number | null) =>
  value == null ? "" : Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const DealAmountAgreementStep = ({ deal, userId, getUsername, onBack, onContinue }: Props) => {
  const { toast } = useToast();
  const isCreator = deal.creator_id === userId;
  const otherId = isCreator ? deal.other_user_id : deal.creator_id;

  const myAmountField = isCreator ? "amount_creator" : "amount_other";
  const otherAmountField = isCreator ? "amount_other" : "amount_creator";
  const myConfirmField = isCreator ? "amount_confirmed_by_creator" : "amount_confirmed_by_other";
  const otherConfirmField = isCreator ? "amount_confirmed_by_other" : "amount_confirmed_by_creator";

  const dbMyAmount: number | null = deal[myAmountField] ?? null;
  const dbOtherAmount: number | null = deal[otherAmountField] ?? null;
  const myConfirmed: boolean = !!deal[myConfirmField];
  const otherConfirmed: boolean = !!deal[otherConfirmField];
  const bothConfirmed = myConfirmed && otherConfirmed;

  const otherName = otherId ? getUsername(otherId) : "Other";

  const [amount, setAmount] = useState<string>(dbMyAmount != null ? String(Number(dbMyAmount)) : "");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // Once the user starts editing, do NOT let DB changes overwrite their input.
  // Cleared on blur/confirm. Prevents the "I typed 230 but it disappeared"
  // bug caused by realtime / polling refreshes mid-typing.
  const dirtyRef = useRef(false);
  const parsedAmount = parseAmountInput(amount);

  // Re-sync local input from DB only when the user isn't actively editing.
  useEffect(() => {
    if (focused || dirtyRef.current) return;
    setAmount(dbMyAmount != null ? String(Number(dbMyAmount)) : "");
  }, [dbMyAmount, focused]);

  // Auto-advance once both sides confirm matching amounts.
  useEffect(() => {
    if (bothConfirmed && amountsMatch(dbMyAmount, dbOtherAmount)) {
      onContinue?.();
    }
  }, [bothConfirmed, dbMyAmount, dbOtherAmount, onContinue]);

  const tryOpenConfirm = () => {
    if (parsedAmount == null) {
      toast({ title: "Enter a valid amount", description: "Use up to 2 decimal places, like 122.30.", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (parsedAmount == null) return;
    setBusy(true);
    const { error } = await supabase
      .from("deals")
      .update({
        [myAmountField]: parsedAmount,
        [myConfirmField]: true,
      } as any)
      .eq("id", deal.id);
    setBusy(false);
    setConfirmOpen(false);
    if (!error) dirtyRef.current = false;
    if (error) toast({ title: "Couldn't confirm", description: error.message, variant: "destructive" });
  };

  const handleUnconfirm = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("deals")
      .update({ [myConfirmField]: false } as any)
      .eq("id", deal.id);
    setBusy(false);
    if (error) toast({ title: "Couldn't unlock", description: error.message, variant: "destructive" });
  };

  // Fire-and-forget: clear my confirmation when I start editing again.
  const ensureUnconfirmed = async () => {
    if (!myConfirmed) return;
    await supabase
      .from("deals")
      .update({ [myConfirmField]: false } as any)
      .eq("id", deal.id);
  };

  const mismatch =
    myConfirmed && otherConfirmed && dbMyAmount != null && dbOtherAmount != null && !amountsMatch(dbMyAmount, dbOtherAmount);

  let statusText = "None have confirmed amount";
  if (bothConfirmed && !mismatch) statusText = "Both confirmed!";
  else if (mismatch) statusText = "Amounts don't match — adjust to agree";
  else if (myConfirmed) statusText = "You've confirmed — waiting for the other side";
  else if (otherConfirmed) statusText = `${otherName} confirmed — your turn`;

  // Sender/Receiver labels (sender = buyer who pays crypto).
  // creator_role is 'buyer' | 'seller'. Buyer = sender, Seller = receiver.
  const creatorIsSender = deal.creator_role === "buyer";
  const myRoleLabel = isCreator
    ? (creatorIsSender ? "Sender" : "Receiver")
    : (creatorIsSender ? "Receiver" : "Sender");
  const otherRoleLabel = myRoleLabel === "Sender" ? "Receiver" : "Sender";

  return (
    <div className="flex flex-1 flex-col min-h-0 -m-6">
      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-[30px] pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <section className="min-w-0">
            <h2 className="text-white text-[22px] font-bold tracking-tight">Enter Deal Amount</h2>
            <p className="mt-2 text-sm text-white/55">Enter the amount that you want the deal to be</p>
          </section>
          <section className="flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto sm:justify-start">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#88FF6A] text-black text-[10px] font-bold leading-none">!</span>
            <span className="text-sm text-white/55">Confirm deal amount below</span>
          </section>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center pt-6 md:pt-10">
          <div className="flex w-full max-w-[583px] flex-col">
            <span className="text-white text-[15px] font-semibold">Amount</span>
            <div className="mt-3 flex gap-3">
              <div className="min-w-0 flex-1">
                <div className={`w-full min-w-0 flex items-center gap-2 rounded-xl border bg-white/[0.03] px-4 h-12 transition-colors ${
                  myConfirmed
                    ? "border-white/10"
                    : "border-[#88FF6A]/60 focus-within:border-[#88FF6A]"
                }`}>
                  <input
                    inputMode="decimal"
                    aria-label="Enter amount"
                    placeholder="Enter amount"
                    value={amount}
                    onFocus={() => setFocused(true)}
                    onBlur={() => {
                      setFocused(false);
                      if (parsedAmount != null) setAmount(String(parsedAmount));
                    }}
                    onChange={(e) => {
                      dirtyRef.current = true;
                      setAmount(sanitizeAmountInput(e.target.value));
                      if (myConfirmed) {
                        // user is editing again — auto-unlock their confirmation
                        void ensureUnconfirmed();
                      }
                    }}
                    disabled={busy}
                    className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none disabled:opacity-60"
                  />
                  <span className="shrink-0 text-sm text-white/60">USD</span>
                </div>
              </div>
              {(() => {
                const sameAsConfirmed =
                  myConfirmed && dbMyAmount != null && parsedAmount != null && amountsMatch(parsedAmount, dbMyAmount);
                if (sameAsConfirmed) {
                  return (
                    <button
                      type="button"
                      onClick={handleUnconfirm}
                      disabled={busy}
                      className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-6 h-12 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                    >
                      Edit again
                    </button>
                  );
                }
                return (
                  <button
                    type="button"
                    onClick={tryOpenConfirm}
                    disabled={busy || parsedAmount == null}
                    className="shrink-0 rounded-xl px-6 h-12 text-sm font-medium text-white/80 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: parsedAmount != null && !busy ? "#88FF6A" : "rgba(255,255,255,0.12)", color: parsedAmount != null && !busy ? "#000" : undefined }}
                  >
                    Confirm
                  </button>
                );
              })()}
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <span className="text-white/55 text-[15px] font-semibold">{otherName}'s amount</span>
              <div className="flex gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 h-12">
                  {dbOtherAmount != null ? (
                    <span className="min-w-0 flex-1 truncate text-sm text-white">{formatAmount(dbOtherAmount)}</span>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-sm text-white/40">Waiting for {otherName}…</span>
                  )}
                  <span className="shrink-0 text-sm text-white/60">USD</span>
                </div>
                {/* spacer to align with the Confirm column above */}
                <div className="w-[112px] shrink-0" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-white/10 bg-[var(--color-bg-panel)] px-4 py-3 sm:px-[30px] sm:py-4 flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 px-5 h-10 text-sm font-medium text-white hover:bg-white/[0.1]"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-1 text-center">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <span className={`text-sm ${mismatch ? "text-[#ff8a7a]" : "text-white/55"}`}>{statusText}</span>
              <span className="inline-flex items-center gap-1.5 shrink-0">
                {otherConfirmed
                  ? <CheckCircle2 className="h-[17px] w-[17px] text-[#88FF6A]" />
                  : <Circle className="h-[17px] w-[17px] text-white/25" />}
                <span className="text-sm text-white">{otherName} ({otherRoleLabel})</span>
              </span>
              <span className="inline-flex items-center gap-1.5 shrink-0">
                {myConfirmed
                  ? <CheckCircle2 className="h-[17px] w-[17px] text-[#88FF6A]" />
                  : <Circle className="h-[17px] w-[17px] text-white/25" />}
                <span className="text-sm text-white">Me ({myRoleLabel})</span>
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onContinue}
          disabled={!bothConfirmed || mismatch}
          className="rounded-xl px-6 h-10 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: bothConfirmed && !mismatch ? "#88FF6A" : "rgba(255,255,255,0.08)", color: bothConfirmed && !mismatch ? "#000" : "rgba(255,255,255,0.6)" }}
        >
          Continue
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deal amount?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Once both parties confirm the same amount, the deal moves to the deposit step.
              </span>
              <span className="block rounded-md border border-border/50 bg-muted/30 p-3 text-foreground">
                <span className="block text-xs uppercase tracking-wide text-muted-foreground">Amount</span>
                <span className="block font-medium">${formatAmount(parsedAmount)} USD</span>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={busy}>
              Yes, confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DealAmountAgreementStep;