import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Eye } from "lucide-react";

interface AdminDisputesTabProps {
  disputes: any[];
  profiles: any[];
  onUpdated: () => void;
  onUserClick?: (userId: string) => void;
}

const AdminDisputesTab = ({ disputes, profiles, onUpdated, onUserClick }: AdminDisputesTabProps) => {
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const getUsername = (uid: string) => {
    const p = profiles.find((pr: any) => pr.user_id === uid);
    return p?.username || p?.display_name || uid?.slice(0, 8) || "—";
  };

  const handleResolve = async (status: "resolved" | "dismissed") => {
    if (!selectedDispute) return;
    setLoading(true);
    
    const { error } = await supabase.from("disputes").update({
      status,
      admin_notes: adminNotes.trim() || null,
      resolved_at: new Date().toISOString(),
    }).eq("id", selectedDispute.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // If resolved, revert deal status based on context; if dismissed, revert to previous
      if (status === "resolved") {
        // Send notification to user
        await supabase.from("notifications").insert({
          user_id: selectedDispute.raised_by,
          type: "dispute",
          title: "Dispute Resolved",
          body: adminNotes.trim() || "Your dispute has been resolved by admin.",
          deal_id: selectedDispute.deal_id,
        });
      } else {
        // Dismissed — revert deal to awaiting_deposit (or admin can handle manually)
        await supabase.from("deals").update({ status: "awaiting_deposit" }).eq("id", selectedDispute.deal_id);
        await supabase.from("notifications").insert({
          user_id: selectedDispute.raised_by,
          type: "dispute",
          title: "Dispute Dismissed",
          body: adminNotes.trim() || "Your dispute has been dismissed.",
          deal_id: selectedDispute.deal_id,
        });
      }
      toast({ title: `Dispute ${status}` });
      setSelectedDispute(null);
      setAdminNotes("");
      onUpdated();
    }
    setLoading(false);
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-medium">Deal</th>
                  <th className="text-left p-3 font-medium">Raised By</th>
                  <th className="text-left p-3 font-medium">Reason</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {disputes.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No disputes</td></tr>
                ) : disputes.map((d) => (
                  <tr key={d.id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="p-3 text-foreground font-mono text-xs">{d.deal_id?.slice(0, 8)}...</td>
                    <td className="p-3">
                      {onUserClick ? (
                        <button
                          type="button"
                          onClick={() => onUserClick(d.raised_by)}
                          className="text-primary hover:underline underline-offset-2"
                        >
                          {getUsername(d.raised_by)}
                        </button>
                      ) : (
                        <span className="text-foreground">{getUsername(d.raised_by)}</span>
                      )}
                    </td>
                    <td className="p-3 text-foreground text-xs max-w-[200px] truncate">{d.reason}</td>
                    <td className="p-3">
                      <Badge variant={d.status === "resolved" ? "default" : d.status === "dismissed" ? "secondary" : "destructive"} className="capitalize">
                        {d.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelectedDispute(d); setAdminNotes(d.admin_notes || ""); }}>
                        <Eye className="h-3 w-3 mr-1" /> Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Dispute</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/30 p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Raised by</span>
                  <span className="text-foreground">{getUsername(selectedDispute.raised_by)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deal</span>
                  <span className="font-mono text-xs text-foreground">{selectedDispute.deal_id?.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="destructive" className="capitalize">{selectedDispute.status}</Badge>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Reason:</p>
                <p className="text-sm text-foreground bg-muted/20 rounded-md p-3">{selectedDispute.reason}</p>
              </div>

              {selectedDispute.status === "open" ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Admin Notes / Resolution</label>
                    <Textarea
                      placeholder="Explain the resolution..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      className="bg-card border-border"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleResolve("resolved")} disabled={loading} className="flex-1 gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Resolve
                    </Button>
                    <Button variant="secondary" onClick={() => handleResolve("dismissed")} disabled={loading} className="flex-1 gap-1.5">
                      <XCircle className="h-4 w-4" /> Dismiss
                    </Button>
                  </div>
                </>
              ) : (
                <div>
                  {selectedDispute.admin_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Admin notes:</p>
                      <p className="text-sm text-foreground">{selectedDispute.admin_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDisputesTab;
