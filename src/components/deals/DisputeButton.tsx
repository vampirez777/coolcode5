import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { useCaptchaGate } from "@/hooks/useCaptchaGate";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface DisputeButtonProps {
  dealId: string;
  userId: string;
  dealStatus: string;
}

const DisputeButton = ({ dealId, userId, dealStatus }: DisputeButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingDispute, setExistingDispute] = useState<any>(null);
  const { runWithCaptcha, gate } = useCaptchaGate();
  const { isEnabled } = useFeatureFlags();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("disputes")
        .select("*")
        .eq("deal_id", dealId)
        .eq("raised_by", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setExistingDispute(data);
    };
    load();
  }, [dealId, userId, open]);

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast({ title: "Please provide a reason", variant: "destructive" });
      return;
    }
    if (!isEnabled("dispute_creation")) {
      toast({
        title: "Disputes disabled",
        description: "Opening new disputes is currently turned off by an administrator.",
        variant: "destructive",
      });
      return;
    }
    runWithCaptcha(
      async () => {
        setLoading(true);
        const { error } = await supabase.from("disputes").insert({
          deal_id: dealId,
          raised_by: userId,
          reason: reason.trim(),
        });
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Dispute raised", description: "An admin will review your dispute shortly." });
          setReason("");
          setOpen(false);
        }
        setLoading(false);
      },
      { reason: "raising a dispute", title: "Confirm dispute" }
    );
  };

  // Don't show on completed/cancelled deals
  if (["completed", "cancelled"].includes(dealStatus) && dealStatus !== "disputed") {
    if (!existingDispute) return null;
  }

  return (
    <>
    {gate}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          {existingDispute ? "View Dispute" : "Raise Dispute"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> Deal Dispute
          </DialogTitle>
        </DialogHeader>

        {existingDispute ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={
                  existingDispute.status === "resolved" ? "default" :
                  existingDispute.status === "dismissed" ? "secondary" : "destructive"
                } className="capitalize">
                  {existingDispute.status === "open" && <Clock className="h-3 w-3 mr-1" />}
                  {existingDispute.status === "resolved" && <CheckCircle className="h-3 w-3 mr-1" />}
                  {existingDispute.status === "dismissed" && <XCircle className="h-3 w-3 mr-1" />}
                  {existingDispute.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Your reason:</p>
                <p className="text-sm text-foreground">{existingDispute.reason}</p>
              </div>
              {existingDispute.admin_notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Admin response:</p>
                  <p className="text-sm text-foreground">{existingDispute.admin_notes}</p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                Raised: {new Date(existingDispute.created_at).toLocaleString()}
                {existingDispute.resolved_at && ` • Resolved: ${new Date(existingDispute.resolved_at).toLocaleString()}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Describe why you're disputing this deal. An admin will review and respond.
            </p>
            <Textarea
              placeholder="Explain the issue (e.g. item not received, wrong item, scam attempt)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="bg-card border-border"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleSubmit} disabled={loading} className="gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Submit Dispute
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default DisputeButton;
