import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Wand2, Copy, Trash2, Loader2, Upload, ExternalLink, ImageIcon,
  CheckCircle2, Sparkles, RotateCcw,
} from "lucide-react";

/* ---------- Types ---------- */
interface DealRow {
  id: string;
  coin: string | null;
  amount: number | null;
  status: string;
  creator_id: string | null;
  other_user_id: string | null;
  creator_role: string;
}
interface ProfileLite {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}
interface DealWithProfiles { deal: DealRow; profiles: Record<string, ProfileLite> }
interface MagicLink {
  id: string;
  deal_id: string;
  target_user_id: string;
  target_role: "buyer" | "seller";
  created_by: string;
  revoked_at: string | null;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
  target_profile: ProfileLite | null;
  created_by_profile: ProfileLite | null;
  deal: { id: string; coin: string | null; amount: number | null; status: string } | null;
}

/* ---------- Component ---------- */
const MagicInvitesTab = () => {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [links, setLinks] = useState<MagicLink[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [open, setOpen] = useState(false);
  const [dealId, setDealId] = useState("");
  const [targetRole, setTargetRole] = useState<"buyer" | "seller">("seller");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarMode, setAvatarMode] = useState<"upload" | "url">("upload");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // Preset stats applied to the recipient's profile on claim.
  const [presetTotalDeals, setPresetTotalDeals] = useState("");
  const [presetTotalUsd, setPresetTotalUsd] = useState("");
  const [presetAvgDealMinutes, setPresetAvgDealMinutes] = useState("");
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Result state
  const [resultOpen, setResultOpen] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [dealsRes, profilesRes, linksRes] = await Promise.all([
      supabase
        .from("deals")
        .select("id, coin, amount, status, creator_id, other_user_id, creator_role")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url"),
      supabase.functions.invoke("magic-invite-list"),
    ]);
    const profMap: Record<string, ProfileLite> = {};
    (profilesRes.data || []).forEach((p) => { profMap[p.user_id] = p; });
    setDeals(dealsRes.data || []);
    setProfiles(profMap);
    setLinks((linksRes.data as { links?: MagicLink[] })?.links || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const userLabel = (uid: string | null | undefined) => {
    if (!uid) return "—";
    const p = profiles[uid];
    return p?.username || p?.display_name || `${uid.slice(0, 8)}…`;
  };

  const resetForm = () => {
    setDealId(""); setTargetRole("seller"); setUsername("");
    setDisplayName(""); setAvatarMode("upload"); setAvatarUrl("");
    setAvatarPreview(null);
    setPresetTotalDeals(""); setPresetTotalUsd(""); setPresetAvgDealMinutes("");
    if (fileRef.current) fileRef.current.value = "";
  };

  /** Upload an avatar image to a temporary path in the avatars bucket. */
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File must be under 2MB", variant: "destructive" });
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      toast({ title: "Not signed in", variant: "destructive" });
      return;
    }
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const tempId = crypto.randomUUID();
    // Storage RLS requires the first folder to equal auth.uid()
    const filePath = `${uid}/magic-invites/${tempId}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: false });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    setAvatarUrl(publicUrl);
    setAvatarPreview(publicUrl);
    toast({ title: "Photo uploaded" });
  };

  const onUrlChange = (v: string) => {
    setAvatarUrl(v);
    setAvatarPreview(v.trim() && /^https?:\/\//i.test(v.trim()) ? v.trim() : null);
  };

  const handleCreate = async () => {
    if (!dealId) return toast({ title: "Pick a deal first", variant: "destructive" });
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username.trim())) {
      return toast({
        title: "Invalid username",
        description: "3-30 chars: letters, numbers, _ and - only",
        variant: "destructive",
      });
    }
    setCreating(true);
    const presetAvgSeconds = presetAvgDealMinutes.trim()
      ? Math.max(0, Math.round(Number(presetAvgDealMinutes) * 60))
      : null;
    const { data, error } = await supabase.functions.invoke("magic-invite-create", {
      body: {
        deal_id: dealId,
        target_role: targetRole,
        username: username.trim(),
        display_name: displayName.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        preset_total_deals: presetTotalDeals.trim() ? Number(presetTotalDeals) : undefined,
        preset_total_usd: presetTotalUsd.trim() ? Number(presetTotalUsd) : undefined,
        preset_avg_deal_seconds: presetAvgSeconds ?? undefined,
      },
    });
    setCreating(false);
    const d = data as { url?: string; error?: string } | null;
    if (error || d?.error || !d?.url) {
      toast({
        title: "Could not create invite",
        description: d?.error || error?.message || "Unknown error",
        variant: "destructive",
      });
      return;
    }
    setGeneratedUrl(d.url);
    setOpen(false);
    setResultOpen(true);
    resetForm();
    loadData();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const toggleRevoke = async (id: string, currentlyRevoked: boolean) => {
    const action = currentlyRevoked ? "unrevoke" : "revoke";
    const { error } = await supabase.functions.invoke("magic-invite-revoke", {
      body: { id, action },
    });
    if (error) {
      toast({
        title: currentlyRevoked ? "Unrevoke failed" : "Revoke failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: currentlyRevoked ? "Invite re-enabled" : "Invite revoked" });
    loadData();
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Magic invite links
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
              Create a one-click link that auto-signs the recipient in as a
              pre-set user and joins them to a specific deal — no signup
              required on their end.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className="shrink-0">
            <Sparkles className="h-4 w-4 mr-1.5" />
            New invite link
          </Button>
        </CardHeader>
      </Card>

      {/* Existing links */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Deal</th>
                  <th className="text-left p-3 font-medium">Joins as</th>
                  <th className="text-left p-3 font-medium">Created by</th>
                  <th className="text-left p-3 font-medium">Uses</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 inline mr-2 animate-spin" /> Loading…
                    </td>
                  </tr>
                )}
                {!loading && links.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No magic invite links yet — click "New invite link" to create one.
                    </td>
                  </tr>
                )}
                {links.map((l) => (
                  <tr key={l.id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {l.target_profile?.avatar_url ? (
                          <img
                            src={l.target_profile.avatar_url}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium text-foreground">
                          {l.target_profile?.username || l.target_profile?.display_name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-foreground">
                      {l.deal ? (
                        <span>
                          {l.deal.coin || "Deal"}{" "}
                          <span className="text-muted-foreground">
                            ${l.deal.amount?.toFixed(2) || "—"}
                          </span>
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="capitalize">{l.target_role}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {l.created_by_profile?.username || `${l.created_by.slice(0, 8)}…`}
                    </td>
                    <td className="p-3 text-muted-foreground">{l.use_count}</td>
                    <td className="p-3">
                      {l.revoked_at ? (
                        <Badge variant="destructive">Revoked</Badge>
                      ) : l.use_count > 0 ? (
                        <Badge className="bg-primary/15 text-primary border-primary/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Claimed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {l.revoked_at ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleRevoke(l.id, true)}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" /> Unrevoke
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleRevoke(l.id, false)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Create magic invite link
            </DialogTitle>
            <DialogDescription>
              The recipient will land on the link and be signed in automatically
              as the user you configure here, then attached to the deal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Deal */}
            <div className="space-y-1.5">
              <Label>Deal</Label>
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger><SelectValue placeholder="Pick a deal" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.coin || "Deal"} · ${d.amount?.toFixed(2) || "—"} · {userLabel(d.creator_id)} ↔ {userLabel(d.other_user_id) || "vacant"} · {d.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target role */}
            <div className="space-y-1.5">
              <Label>Joins the deal as</Label>
              <Select value={targetRole} onValueChange={(v) => setTargetRole(v as "buyer" | "seller")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ahmed_buyer"
                maxLength={30}
              />
              <p className="text-[11px] text-muted-foreground">3-30 chars: letters, numbers, _ and -</p>
            </div>

            {/* Display name */}
            <div className="space-y-1.5">
              <Label>Display name <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Defaults to username"
                maxLength={60}
              />
            </div>

            {/* Avatar */}
            <div className="space-y-2">
              <Label>Profile picture <span className="text-muted-foreground">(optional)</span></Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={avatarMode === "upload" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAvatarMode("upload")}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                </Button>
                <Button
                  type="button"
                  variant={avatarMode === "url" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAvatarMode("url")}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Paste URL
                </Button>
              </div>
              {avatarMode === "upload" ? (
                <Input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} />
              ) : (
                <Input
                  value={avatarUrl}
                  onChange={(e) => onUrlChange(e.target.value)}
                  placeholder="https://example.com/avatar.png"
                />
              )}
              {avatarPreview && (
                <div className="flex items-center gap-2 pt-1">
                  <img
                    src={avatarPreview}
                    alt="preview"
                    className="h-12 w-12 rounded-full object-cover border border-border"
                  />
                  <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                    {avatarPreview}
                  </span>
                </div>
              )}
            </div>

            {/* Preset stats */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <Label className="text-sm">Preset stats <span className="text-muted-foreground">(optional)</span></Label>
              <p className="text-[11px] text-muted-foreground -mt-1">
                These numbers appear on the user's dashboard and deals page as soon as they claim the invite.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Total deals completed</Label>
                  <Input
                    inputMode="numeric"
                    placeholder="0"
                    value={presetTotalDeals}
                    onChange={(e) => setPresetTotalDeals(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Total USD value dealt</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={presetTotalUsd}
                    onChange={(e) => setPresetTotalUsd(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Avg. deal length (min)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    value={presetAvgDealMinutes}
                    onChange={(e) => setPresetAvgDealMinutes(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Creating…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1.5" /> Generate link</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result dialog — show the URL once */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Invite link ready
            </DialogTitle>
            <DialogDescription>
              Share this link with the person you want to add to the deal.
              They'll be signed in automatically — no password or signup needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="flex items-center gap-2">
              <Input value={generatedUrl} readOnly className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => copy(generatedUrl)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground leading-relaxed">
              ⚠️ This link works as long as it isn't revoked. Anyone who has it can claim
              the account, so share it through a private channel only.
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setResultOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MagicInvitesTab;