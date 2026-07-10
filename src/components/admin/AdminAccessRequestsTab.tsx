import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Globe,
  Wifi,
  ServerCog,
  EyeOff,
  Loader2,
} from "lucide-react";

interface AccessRequest {
  id: string;
  browser_id: string;
  ip_hash: string | null;
  ip_address: string | null;
  country: string | null;
  user_agent: string | null;
  reason: string;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  is_datacenter: boolean;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const statusVariant: Record<AccessRequest["status"], "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const AdminAccessRequestsTab = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [active, setActive] = useState<AccessRequest | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Error loading requests", description: error.message, variant: "destructive" });
    } else {
      setRequests((data || []) as AccessRequest[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);

  const updateStatus = async (request: AccessRequest, status: "approved" | "rejected") => {
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("access_requests")
      .update({
        status,
        admin_notes: notes.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: u?.user?.id || null,
      })
      .eq("id", request.id);
    const unblockError = !error && status === "approved"
      ? (await supabase.from("gate_blocks").delete().eq("browser_id", request.browser_id)).error
      : null;
    setSubmitting(false);
    if (error || unblockError) {
      toast({ title: "Error", description: error?.message || unblockError?.message, variant: "destructive" });
    } else {
      toast({ title: status === "approved" ? "Request approved" : "Request rejected" });
      setActive(null);
      setNotes("");
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="capitalize h-8"
            >
              {f}
              {f === "pending" && requests.filter((r) => r.status === "pending").length > 0 && (
                <span className="ml-1.5 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">
                  {requests.filter((r) => r.status === "pending").length}
                </span>
              )}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No {filter === "all" ? "" : filter} access requests.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((r) => (
                <div key={r.id} className="p-4 flex items-start gap-4 hover:bg-muted/30">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={statusVariant[r.status]} className="capitalize">{r.status}</Badge>
                      {r.is_tor && <Badge variant="destructive" className="gap-1"><EyeOff className="h-3 w-3" />Tor</Badge>}
                      {r.is_proxy && <Badge variant="secondary" className="gap-1"><Wifi className="h-3 w-3" />Proxy</Badge>}
                      {r.is_vpn && <Badge variant="secondary" className="gap-1"><Wifi className="h-3 w-3" />VPN</Badge>}
                      {r.is_datacenter && <Badge variant="secondary" className="gap-1"><ServerCog className="h-3 w-3" />Datacenter</Badge>}
                      {r.country && <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" />{r.country}</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{r.reason}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                      <span className="font-mono">IP: {r.ip_address || (r.ip_hash ? "hashed" : "—")}</span>
                      <span>·</span>
                      <span className="font-mono">browser: {r.browser_id.slice(0, 8)}…</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setActive(r); setNotes(r.admin_notes || ""); }}>
                        View / Decide
                      </Button>
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => { setActive(r); setNotes(""); setTimeout(() => updateStatus(r, "approved"), 0); }}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { setActive(r); setNotes(""); setTimeout(() => updateStatus(r, "rejected"), 0); }}>
                            <XCircle className="h-3 w-3 mr-1" />Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(open) => { if (!open) { setActive(null); setNotes(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Access request</DialogTitle>
            <DialogDescription>
              Review the visitor's reason and decide whether to grant access on their browser.
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1.5 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={statusVariant[active.status]} className="capitalize">{active.status}</Badge>
                  {active.is_tor && <Badge variant="destructive">Tor</Badge>}
                  {active.is_proxy && <Badge variant="secondary">Proxy</Badge>}
                  {active.is_vpn && <Badge variant="secondary">VPN</Badge>}
                  {active.is_datacenter && <Badge variant="secondary">Datacenter</Badge>}
                  {active.country && <Badge variant="outline">{active.country}</Badge>}
                </div>
                <div className="text-muted-foreground">browser: <span className="font-mono">{active.browser_id}</span></div>
                <div className="text-muted-foreground">
                  IP address: <span className="font-mono text-foreground">{active.ip_address || "—"}</span>
                </div>
                <div className="text-muted-foreground">ip hash: <span className="font-mono">{active.ip_hash || "—"}</span></div>
                <div className="text-muted-foreground line-clamp-2">UA: {active.user_agent || "—"}</div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Reason given</p>
                <div className="rounded-lg border border-border/60 bg-background p-3 text-sm whitespace-pre-wrap">
                  {active.reason}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Admin notes (optional)</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes…"
                  className="min-h-[60px]"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              disabled={submitting || !active}
              onClick={() => active && updateStatus(active, "rejected")}
            >
              <XCircle className="h-4 w-4 mr-1.5" /> Reject
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={submitting || !active}
              onClick={() => active && updateStatus(active, "approved")}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAccessRequestsTab;