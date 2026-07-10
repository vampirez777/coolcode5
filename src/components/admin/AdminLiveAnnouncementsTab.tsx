import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Megaphone, Send, Trash2, Info, CheckCircle2, AlertTriangle, AlertOctagon, Sparkles } from "lucide-react";

const VARIANTS = [
  { value: "info", label: "Info", icon: Info, classes: "text-primary" },
  { value: "success", label: "Success", icon: CheckCircle2, classes: "text-emerald-500" },
  { value: "warning", label: "Warning", icon: AlertTriangle, classes: "text-amber-500" },
  { value: "critical", label: "Critical", icon: AlertOctagon, classes: "text-destructive" },
] as const;

const PRESET_DURATIONS = [
  { ms: 5000, label: "5s" },
  { ms: 8000, label: "8s" },
  { ms: 15000, label: "15s" },
  { ms: 30000, label: "30s" },
  { ms: 60000, label: "60s" },
];

type Announcement = {
  id: string;
  title: string;
  body: string | null;
  variant: string;
  cta_label: string | null;
  cta_url: string | null;
  duration_ms: number;
  expires_at: string;
  created_at: string;
};

const AdminLiveAnnouncementsTab = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [variant, setVariant] = useState<string>("info");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [durationMs, setDurationMs] = useState(8000);
  const [activeMinutes, setActiveMinutes] = useState(5);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Announcement[]>([]);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("live_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setHistory((data as Announcement[]) || []);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleBroadcast = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSending(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");
      const expiresAt = new Date(Date.now() + activeMinutes * 60 * 1000).toISOString();
      const { error } = await supabase.from("live_announcements").insert({
        created_by: uid,
        title: title.trim(),
        body: body.trim() || null,
        variant,
        cta_label: ctaLabel.trim() || null,
        cta_url: ctaUrl.trim() || null,
        duration_ms: durationMs,
        expires_at: expiresAt,
      });
      if (error) throw error;
      toast.success("Announcement broadcasted to all live visitors");
      setTitle("");
      setBody("");
      setCtaLabel("");
      setCtaUrl("");
      loadHistory();
    } catch (e: any) {
      toast.error(e.message || "Failed to broadcast");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("live_announcements").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Announcement removed");
    loadHistory();
  };

  const previewVariant = VARIANTS.find((v) => v.value === variant) || VARIANTS[0];
  const PreviewIcon = previewVariant.icon;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Broadcast a popup notification
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Sends an instant pop-up to every visitor currently on the site. Admins only.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Style</Label>
            <Tabs value={variant} onValueChange={setVariant}>
              <TabsList className="grid w-full grid-cols-4 bg-muted/40">
                {VARIANTS.map((v) => {
                  const Icon = v.icon;
                  return (
                    <TabsTrigger key={v.value} value={v.value} className="gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${v.classes}`} />
                      <span className="hidden sm:inline">{v.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ann-title">Title *</Label>
            <Input
              id="ann-title"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Maintenance starts in 10 minutes"
              className="bg-background"
            />
            <p className="text-[11px] text-muted-foreground">{title.length}/100</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ann-body">Message</Label>
            <Textarea
              id="ann-body"
              maxLength={300}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Optional details shown below the title"
              rows={3}
              className="bg-background resize-none"
            />
            <p className="text-[11px] text-muted-foreground">{body.length}/300</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cta-label">CTA label (optional)</Label>
              <Input
                id="cta-label"
                maxLength={32}
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Learn more"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cta-url">CTA link</Label>
              <Input
                id="cta-url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="/deals or https://…"
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Visible for</Label>
              <span className="text-xs text-muted-foreground">{(durationMs / 1000).toFixed(0)} seconds</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_DURATIONS.map((p) => (
                <button
                  key={p.ms}
                  type="button"
                  onClick={() => setDurationMs(p.ms)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    durationMs === p.ms
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Active window</Label>
              <span className="text-xs text-muted-foreground">
                Visitors loading within {activeMinutes} minute{activeMinutes === 1 ? "" : "s"} will see it
              </span>
            </div>
            <Slider
              value={[activeMinutes]}
              min={1}
              max={30}
              step={1}
              onValueChange={(v) => setActiveMinutes(v[0])}
            />
          </div>

          <Button
            onClick={handleBroadcast}
            disabled={sending || !title.trim()}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Broadcasting..." : "Broadcast to live visitors"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Live preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-card/95 p-4 ring-1 ring-primary/20">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <PreviewIcon className={`h-5 w-5 ${previewVariant.classes}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Live announcement
                    </span>
                  </div>
                  <h4 className="mt-0.5 text-sm font-semibold text-foreground">
                    {title || "Your title appears here"}
                  </h4>
                  {(body || !title) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {body || "Optional supporting message shown to every live visitor."}
                    </p>
                  )}
                  {ctaLabel && ctaUrl && (
                    <span className="mt-2 inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      {ctaLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Recent broadcasts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">No announcements sent yet.</p>
            ) : (
              history.map((a) => {
                const expired = new Date(a.expires_at).getTime() <= Date.now();
                return (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-background/40 p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {a.variant}
                        </Badge>
                        {!expired ? (
                          <Badge className="bg-primary/15 text-primary text-[10px]">Live</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Ended</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(a.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-medium text-foreground">{a.title}</p>
                      {a.body && (
                        <p className="truncate text-[11px] text-muted-foreground">{a.body}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(a.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLiveAnnouncementsTab;