import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Gift, Trophy, Calendar, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { userHasVerifiedMfa } from "@/lib/mfa";

interface Giveaway {
  id: string;
  title: string;
  description: string | null;
  prize: string;
  image_url: string | null;
  winners_count: number;
  entry_requirements: string | null;
  ends_at: string;
  is_active: boolean;
}

const GiveawayPage = () => {
  const [loading, setLoading] = useState(true);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasCompletedDeal, setHasCompletedDeal] = useState(false);
  const [hasMfa, setHasMfa] = useState(false);
  const [myEntries, setMyEntries] = useState<Set<string>>(new Set());
  const [enteringId, setEnteringId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      // Live giveaways = active and not yet ended
      const nowIso = new Date().toISOString();
      const { data: gs } = await supabase
        .from("giveaways_public")
        .select("id,title,description,prize,image_url,winners_count,entry_requirements,ends_at,is_active")
        .eq("is_active", true)
        .gt("ends_at", nowIso)
        .order("ends_at", { ascending: true });
      setGiveaways((gs as Giveaway[]) || []);

      if (user) {
        // Eligibility checks (in parallel)
        const [{ data: completedDeal }, mfaOk, { data: entries }] = await Promise.all([
          supabase
            .from("deals")
            .select("id")
            .eq("status", "completed")
            .or(`creator_id.eq.${user.id},other_user_id.eq.${user.id}`)
            .limit(1)
            .maybeSingle(),
          userHasVerifiedMfa(),
          supabase
            .from("giveaway_entries")
            .select("giveaway_id")
            .eq("user_id", user.id),
        ]);
        setHasCompletedDeal(!!completedDeal);
        setHasMfa(mfaOk);
        setMyEntries(new Set((entries || []).map((e: any) => e.giveaway_id)));
      }
      setLoading(false);
    };
    load();
  }, []);

  const eligible = hasCompletedDeal || hasMfa;
  const eligibilityReason = hasCompletedDeal ? "completed_deal" : hasMfa ? "mfa_enabled" : null;

  const handleEnter = async (g: Giveaway) => {
    if (!userId) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    if (!eligibilityReason) {
      toast({
        title: "Not eligible yet",
        description: "Complete a deal or enable two-factor authentication first.",
        variant: "destructive",
      });
      return;
    }
    setEnteringId(g.id);
    const { error } = await supabase.from("giveaway_entries").insert({
      giveaway_id: g.id,
      user_id: userId,
      eligibility_reason: eligibilityReason,
    });
    setEnteringId(null);
    if (error) {
      toast({ title: "Couldn't enter", description: error.message, variant: "destructive" });
      return;
    }
    setMyEntries((prev) => new Set(prev).add(g.id));
    toast({ title: "You're in!", description: "Good luck — winners are picked manually by admins." });
  };

  return (
    <AppLayout>
      <div className="relative mb-7 overflow-hidden rounded-xl pb-5 pt-3">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 app-green-bars opacity-70" />
        <div className="pointer-events-none absolute right-0 top-0 h-44 w-[46%] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-[32px] font-bold leading-tight text-foreground">Giveaways</h1>
            <p className="mt-1 text-base font-medium text-muted-foreground">
              Win prizes from the Halal Middleman community.
            </p>
          </div>
        </div>
      </div>

      {/* Eligibility callout */}
      {!loading && (
        <Card className="mb-6 border-border bg-card">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck className={`h-5 w-5 mt-0.5 ${eligible ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {eligible ? "You're eligible to enter" : "You're not eligible yet"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hasCompletedDeal
                    ? "Verified by your completed deal history."
                    : hasMfa
                      ? "Verified by your enabled two-factor authentication."
                      : "Complete at least one deal on Halal Middleman, or enable two-factor authentication in your account settings, to enter giveaways."}
                </p>
              </div>
            </div>
            {!eligible && (
              <Button asChild variant="outline" className="self-start sm:self-auto">
                <Link to="/settings">Enable 2FA</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading giveaways...
        </div>
      ) : giveaways.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Trophy className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No current giveaways live</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              There aren't any active giveaways right now. Check back soon — new prizes drop regularly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {giveaways.map((g) => {
            const entered = myEntries.has(g.id);
            return (
              <Card key={g.id} className="overflow-hidden border-border bg-card">
                {g.image_url && (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img src={g.image_url} alt={g.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg text-foreground">{g.title}</CardTitle>
                    <Badge variant="secondary" className="text-primary shrink-0">{g.winners_count} winner{g.winners_count !== 1 ? "s" : ""}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Prize</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{g.prize}</p>
                  </div>
                  {g.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{g.description}</p>
                  )}
                  {g.entry_requirements && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requirements</p>
                      <p className="mt-1 text-sm text-foreground whitespace-pre-line">{g.entry_requirements}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Ends {new Date(g.ends_at).toLocaleString()}
                  </div>
                  <Button
                    className="w-full"
                    disabled={!eligible || entered || enteringId === g.id}
                    onClick={() => handleEnter(g)}
                  >
                    {entered ? (
                      <><CheckCircle2 className="mr-2 h-4 w-4" /> Entered</>
                    ) : enteringId === g.id ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entering...</>
                    ) : eligible ? (
                      "Enter giveaway"
                    ) : (
                      "Not eligible"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default GiveawayPage;