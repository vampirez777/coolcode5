import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Gift, Trash2, Plus, Users, Calendar, Save } from "lucide-react";

interface Giveaway {
  id: string;
  title: string;
  description: string | null;
  prize: string;
  image_url: string | null;
  winners_count: number;
  entry_requirements: string | null;
  winner_notes: string | null;
  ends_at: string;
  is_active: boolean;
  created_at: string;
}

const emptyDraft = {
  title: "",
  description: "",
  prize: "",
  image_url: "",
  winners_count: 1,
  entry_requirements: "",
  ends_at: "",
};

const AdminGiveawaysTab = () => {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [creating, setCreating] = useState(false);
  const [winnerEdits, setWinnerEdits] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data: gs } = await supabase
      .from("giveaways")
      .select("*")
      .order("created_at", { ascending: false });
    setGiveaways((gs as Giveaway[]) || []);

    const { data: entries } = await supabase
      .from("giveaway_entries")
      .select("giveaway_id");
    const counts: Record<string, number> = {};
    (entries || []).forEach((e: any) => {
      counts[e.giveaway_id] = (counts[e.giveaway_id] || 0) + 1;
    });
    setEntryCounts(counts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!draft.title.trim() || !draft.prize.trim() || !draft.ends_at) {
      toast({ title: "Title, prize and end date are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("giveaways").insert({
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      prize: draft.prize.trim(),
      image_url: draft.image_url.trim() || null,
      winners_count: Math.max(1, Number(draft.winners_count) || 1),
      entry_requirements: draft.entry_requirements.trim() || null,
      ends_at: new Date(draft.ends_at).toISOString(),
      is_active: true,
      created_by: user.id,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Couldn't create giveaway", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Giveaway created" });
    setDraft({ ...emptyDraft });
    load();
  };

  const toggleActive = async (g: Giveaway) => {
    const { error } = await supabase
      .from("giveaways")
      .update({ is_active: !g.is_active })
      .eq("id", g.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const saveWinner = async (g: Giveaway) => {
    const notes = winnerEdits[g.id] ?? g.winner_notes ?? "";
    const { error } = await supabase
      .from("giveaways")
      .update({ winner_notes: notes.trim() || null })
      .eq("id", g.id);
    if (error) {
      toast({ title: "Couldn't save winner", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Winner saved" });
    load();
  };

  const remove = async (g: Giveaway) => {
    if (!confirm(`Delete "${g.title}"? This removes all entries too.`)) return;
    const { error } = await supabase.from("giveaways").delete().eq("id", g.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Giveaway deleted" });
    load();
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4 text-primary" /> Create new giveaway
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-xs">Title</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. $100 USDT Giveaway"
              className="bg-background border-border"
            />
          </div>
          <div>
            <Label className="text-xs">Prize</Label>
            <Input
              value={draft.prize}
              onChange={(e) => setDraft({ ...draft, prize: e.target.value })}
              placeholder="$100 USDT"
              className="bg-background border-border"
            />
          </div>
          <div>
            <Label className="text-xs">Number of winners</Label>
            <Input
              type="number"
              min={1}
              value={draft.winners_count}
              onChange={(e) => setDraft({ ...draft, winners_count: Number(e.target.value) })}
              className="bg-background border-border"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Image URL (optional)</Label>
            <Input
              value={draft.image_url}
              onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
              placeholder="https://..."
              className="bg-background border-border"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
              className="bg-background border-border"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Entry requirements</Label>
            <Textarea
              value={draft.entry_requirements}
              onChange={(e) => setDraft({ ...draft, entry_requirements: e.target.value })}
              rows={3}
              placeholder="Users must have completed a deal OR enabled 2FA on their account."
              className="bg-background border-border"
            />
          </div>
          <div>
            <Label className="text-xs">Ends at</Label>
            <Input
              type="datetime-local"
              value={draft.ends_at}
              onChange={(e) => setDraft({ ...draft, ends_at: e.target.value })}
              className="bg-background border-border"
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleCreate} disabled={creating}>
              <Gift className="h-4 w-4 mr-2" /> {creating ? "Creating..." : "Create giveaway"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <div className="space-y-4">
        {giveaways.length === 0 ? (
          <p className="text-sm text-muted-foreground">No giveaways yet.</p>
        ) : (
          giveaways.map((g) => {
            const ended = new Date(g.ends_at) < new Date();
            const isLive = g.is_active && !ended;
            return (
              <Card key={g.id} className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{g.title}</h3>
                        {isLive ? (
                          <Badge variant="secondary" className="text-primary">Live</Badge>
                        ) : ended ? (
                          <Badge variant="outline">Ended</Badge>
                        ) : (
                          <Badge variant="outline">Paused</Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{g.prize}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{entryCounts[g.id] || 0} entries</span>
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Ends {new Date(g.ends_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={g.is_active} onCheckedChange={() => toggleActive(g)} />
                        <span className="text-xs text-muted-foreground">Active</span>
                      </div>
                      <Button size="sm" variant="destructive" className="h-7" onClick={() => remove(g)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Winner(s) — manual record</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={winnerEdits[g.id] ?? g.winner_notes ?? ""}
                        onChange={(e) => setWinnerEdits({ ...winnerEdits, [g.id]: e.target.value })}
                        placeholder="Username(s) of the winner(s)"
                        className="bg-background border-border h-8 text-xs"
                      />
                      <Button size="sm" variant="outline" className="h-8" onClick={() => saveWinner(g)}>
                        <Save className="h-3 w-3 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminGiveawaysTab;