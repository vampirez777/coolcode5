import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Circle, Lock } from "lucide-react";
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

const CATEGORIES = [
  "Roblox Limiteds",
  "CSGO Skins",
  "Ingame Items",
  "Currency Exchange",
  "Robux",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number];

interface Props {
  deal: any;
  userId: string;
  getUsername: (uid: string) => string;
  onContinue: () => void;
  onBack?: () => void;
}

const DealDetailsStep = ({ deal, userId, getUsername, onBack, onContinue }: Props) => {
  const { toast } = useToast();
  const isCreator = deal.creator_id === userId;
  const otherId = isCreator ? deal.other_user_id : deal.creator_id;
  const myConfirmField = isCreator ? "deal_details_confirmed_by_creator" : "deal_details_confirmed_by_other";
  const otherConfirmField = isCreator ? "deal_details_confirmed_by_other" : "deal_details_confirmed_by_creator";

  const myConfirmed: boolean = !!deal[myConfirmField];
  const otherConfirmed: boolean = !!deal[otherConfirmField];
  const bothConfirmed = myConfirmed && otherConfirmed;

  const editingBy: string | null = deal.deal_details_editing_by || null;
  const lockedByOther = !!editingBy && editingBy !== userId;
  const iHoldLock = editingBy === userId;

  const [category, setCategory] = useState<Category | null>(
    (deal.deal_category as Category) || null
  );
  const [description, setDescription] = useState<string>(deal.deal_description || "");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Sync local state from props whenever I am NOT actively holding the edit lock.
  // This makes the other side's picks/typing flow in live (after each persist).
  useEffect(() => {
    if (!iHoldLock) {
      setCategory((deal.deal_category as Category) || null);
      setDescription(deal.deal_description || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.deal_category, deal.deal_description, editingBy, userId]);

  const claimLock = async () => {
    if (iHoldLock) return true;
    if (lockedByOther) {
      toast({ title: "Locked", description: `${getUsername(otherId)} is editing right now.`, variant: "destructive" });
      return false;
    }
    const { error } = await supabase
      .from("deals")
      .update({ deal_details_editing_by: userId })
      .eq("id", deal.id);
    if (error) {
      toast({ title: "Couldn't take turn", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const persistDraft = async (next: { deal_category?: Category | null; deal_description?: string }) => {
    // Any edit invalidates BOTH previous confirmations.
    const { error } = await supabase
      .from("deals")
      .update({
        ...next,
        deal_details_confirmed_by_creator: false,
        deal_details_confirmed_by_other: false,
        deal_details_editing_by: userId,
      })
      .eq("id", deal.id);
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
  };

  const handlePickCategory = async (c: Category) => {
    if (readOnly) return;
    if (lockedByOther) {
      toast({ title: "Locked", description: `${getUsername(otherId)} is editing right now.`, variant: "destructive" });
      return;
    }
    if (!(await claimLock())) return;
    setCategory(c);
    await persistDraft({ deal_category: c });
  };

  const handleFocusDesc = async () => {
    if (readOnly || lockedByOther || iHoldLock) return;
    await claimLock();
  };

  const handleChangeDesc = (val: string) => {
    if (readOnly || lockedByOther) return;
    setDescription(val);
  };

  const handleBlurDesc = async () => {
    if (!iHoldLock) return;
    await persistDraft({ deal_description: description });
  };

  const tryOpenConfirm = () => {
    if (!category) {
      toast({ title: "Pick a category first", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Add a description", description: "Briefly describe what's being traded.", variant: "destructive" });
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("deals")
      .update({
        deal_category: category,
        deal_description: description,
        [myConfirmField]: true,
        deal_details_editing_by: null,
      } as any)
      .eq("id", deal.id);
    setBusy(false);
    setConfirmOpen(false);
    if (error) toast({ title: "Couldn't confirm", description: error.message, variant: "destructive" });
  };

  const handleUnconfirmToEdit = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("deals")
      .update({
        [myConfirmField]: false,
        deal_details_editing_by: userId,
      } as any)
      .eq("id", deal.id);
    setBusy(false);
    if (error) toast({ title: "Couldn't unlock", description: error.message, variant: "destructive" });
  };

  let statusText = "None have confirmed deal details";
  if (bothConfirmed) statusText = "Both confirmed!";
  else if (myConfirmed) statusText = "You've confirmed — waiting for the other side";
  else if (otherConfirmed) statusText = `${otherId ? getUsername(otherId) : "Other"} confirmed — your turn`;
  else if (lockedByOther) statusText = `${getUsername(otherId)} is editing right now…`;

  const otherName = otherId ? getUsername(otherId) : "Other";

  const readOnly = lockedByOther || myConfirmed;

  return (
    <div className="flex flex-1 flex-col min-h-0 -m-6">
      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-[30px] pb-4">
        <section className="min-w-0">
          <h2 className="text-white text-[22px] font-bold tracking-tight">Deal details</h2>
          <p className="mt-2 text-sm text-white/55">
            To avoid scams, please write out all deal details such as usernames being dealt with, amounts, types, etc.
          </p>
        </section>

        {lockedByOther && !myConfirmed && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
            <Lock className="h-3.5 w-3.5" />
            {otherName} is editing right now. You'll be able to edit or confirm once they're done.
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              type="button"
              disabled={readOnly || busy}
              onClick={() => handlePickCategory(c)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold border transition-colors ${
                active
                  ? "border-[#88FF6A] bg-[#88FF6A]/20 text-white"
                  : "border-white/15 bg-white/5 text-white/90 hover:opacity-90"
              } ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {c}
            </button>
          );
        })}
        </div>

        <label className="mt-4 block text-sm text-white/80">
        Deal description
        <textarea
          value={description}
          onChange={(e) => handleChangeDesc(e.target.value)}
          onFocus={handleFocusDesc}
          onBlur={handleBlurDesc}
          disabled={readOnly || busy}
          placeholder="Summary of what you are trading..."
          className="mt-2 w-full min-h-[140px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 resize-y focus:outline-none focus:border-[#88FF6A]/60 disabled:opacity-60"
        />
        </label>

        <div className="mt-8 flex flex-col items-center gap-3">
          {myConfirmed ? (
            <button
              type="button"
              onClick={handleUnconfirmToEdit}
              disabled={busy || bothConfirmed}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-8 text-sm font-semibold bg-white/10 text-white border border-white/15 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {bothConfirmed ? "Confirmed ✓" : "Confirmed ✓ — Edit again"}
            </button>
          ) : (
            <button
              type="button"
              onClick={tryOpenConfirm}
              disabled={busy || lockedByOther || !category || !description.trim()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl px-8 text-sm font-semibold bg-white text-black hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Confirm?
            </button>
          )}
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
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className="text-sm text-white/55">{statusText}</span>
            <span className="inline-flex items-center gap-1.5 shrink-0">
              {otherConfirmed
                ? <CheckCircle2 className="h-[17px] w-[17px] text-[#88FF6A]" />
                : <Circle className="h-[17px] w-[17px] text-white/25" />}
              <span className="text-sm text-white">{otherName}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 shrink-0">
              {myConfirmed
                ? <CheckCircle2 className="h-[17px] w-[17px] text-[#88FF6A]" />
                : <Circle className="h-[17px] w-[17px] text-white/25" />}
              <span className="text-sm text-white">Me</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onContinue}
          disabled={!bothConfirmed}
          className="rounded-xl px-6 h-10 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: bothConfirmed ? "#88FF6A" : "rgba(255,255,255,0.08)", color: bothConfirmed ? "#000" : "rgba(255,255,255,0.6)" }}
        >
          Continue
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm deal details?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Once both parties confirm, the deal moves to the deposit step. Editing again will reset both confirmations.
              </span>
              <span className="block rounded-md border border-border/50 bg-muted/30 p-3 text-foreground">
                <span className="block text-xs uppercase tracking-wide text-muted-foreground">Category</span>
                <span className="block font-medium">{category}</span>
                <span className="mt-2 block text-xs uppercase tracking-wide text-muted-foreground">Description</span>
                <span className="block whitespace-pre-wrap break-words text-sm">{description}</span>
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

export default DealDetailsStep;