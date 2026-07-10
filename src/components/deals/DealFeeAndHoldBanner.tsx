import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, TrendingUp, TrendingDown, Percent, X } from "lucide-react";

interface FeeHistoryRow {
  id: string;
  old_percent: number;
  new_percent: number;
  created_at: string;
}

interface Props {
  deal: any;
  userId: string;
}

/**
 * Shows two callouts to deal participants:
 *  1. An animated banner when the fee was recently changed (dismissible per-user).
 *  2. A persistent notice when the payout has been placed on a security hold.
 */
const DealFeeAndHoldBanner = ({ deal, userId }: Props) => {
  const [latestChange, setLatestChange] = useState<FeeHistoryRow | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isCreator = deal?.creator_id === userId;
  const seenColumn = isCreator ? "last_fee_change_seen_by_creator" : "last_fee_change_seen_by_other";
  const lastSeen: string | null = deal?.[seenColumn] ?? null;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!deal?.id) return;
      const { data } = await supabase
        .from("fee_history")
        .select("id, old_percent, new_percent, created_at")
        .eq("deal_id", deal.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setLatestChange((data as FeeHistoryRow) || null);
    };
    load();
    return () => { cancelled = true; };
  }, [deal?.id, deal?.fee_percent]);

  const showFeeBanner = useMemo(() => {
    if (dismissed || !latestChange) return false;
    if (!lastSeen) return true;
    return new Date(latestChange.created_at) > new Date(lastSeen);
  }, [dismissed, latestChange, lastSeen]);

  const dismissFeeBanner = async () => {
    setDismissed(true);
    if (!deal?.id) return;
    await supabase
      .from("deals")
      .update({ [seenColumn]: new Date().toISOString() } as any)
      .eq("id", deal.id);
  };

  const feeIncreased = latestChange ? latestChange.new_percent > latestChange.old_percent : false;
  const feeAmount = deal?.amount && latestChange
    ? Math.round(Number(deal.amount) * latestChange.new_percent) / 100
    : null;

  return (
    <div className="space-y-3">
      {showFeeBanner && latestChange && (
        <Card
          className={`relative overflow-hidden border-2 p-4 animate-in fade-in slide-in-from-top-2 duration-500 ${
            feeIncreased
              ? "border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-card to-card"
              : "border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card"
          }`}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feeIncreased ? "bg-amber-500/20 text-amber-500" : "bg-primary/20 text-primary"}`}>
              {feeIncreased ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground">
                  Deal fee {feeIncreased ? "increased" : "updated"} by an administrator
                </h3>
                <Badge variant="secondary" className="text-primary">
                  {latestChange.old_percent}% → {latestChange.new_percent}%
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The new fee on this deal is{" "}
                <span className="font-semibold text-foreground">{latestChange.new_percent}%</span>
                {feeAmount !== null && (
                  <> (<span className="text-foreground">${feeAmount.toFixed(2)}</span> on a ${Number(deal.amount).toFixed(2)} deal)</>
                )}
                . Updated {new Date(latestChange.created_at).toLocaleString()}.
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={dismissFeeBanner}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {deal?.payout_hold && (
        <Card className="relative overflow-hidden border-2 border-destructive/50 bg-gradient-to-br from-destructive/10 via-card to-card p-4">
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-destructive/15 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/20 text-destructive">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                Payout on security hold
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Our security team has temporarily paused the release of funds while we review this transaction.
                {deal.payout_hold_reason && (
                  <>
                    {" "}Reason given: <span className="text-foreground italic">"{deal.payout_hold_reason}"</span>.
                  </>
                )}
                {" "}A support ticket has been opened — please reply there if you have any information that can help.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DealFeeAndHoldBanner;