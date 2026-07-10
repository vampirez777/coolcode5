import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Wrench, Save } from "lucide-react";

const AdminMaintenanceTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    setEnabled(!!data?.maintenance_mode);
    setMessage(data?.maintenance_message || "");
    setUpdatedAt(data?.updated_at ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (overrides?: { enabled?: boolean }) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const nextEnabled = overrides?.enabled ?? enabled;
    const { data, error } = await supabase
      .from("app_settings")
      .upsert({
        id: 1,
        maintenance_mode: nextEnabled,
        maintenance_message: message.trim() || null,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      }, { onConflict: "id" })
      .select("maintenance_mode, maintenance_message, updated_at")
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setEnabled(!!data?.maintenance_mode);
    setMessage(data?.maintenance_message || "");
    setUpdatedAt(data?.updated_at ?? null);
    toast({
      title: nextEnabled ? "Maintenance mode enabled" : "Maintenance mode disabled",
      description: nextEnabled
        ? "Visitors now see the maintenance page. Admins still have full access."
        : "The site is live again for everyone.",
    });
  };

  const handleToggle = async (checked: boolean) => {
    setEnabled(checked);
    await save({ enabled: checked });
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground py-4">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" /> Maintenance Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border/50 bg-muted/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">Enable maintenance page</p>
                {enabled ? (
                  <Badge variant="destructive">Live</Badge>
                ) : (
                  <Badge variant="secondary">Off</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, all visitors see a maintenance screen with no branding.
                Admins always retain full access.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Custom message (optional)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="We're upgrading our escrow system. Back online shortly."
              rows={3}
              className="bg-background border-border resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Leave blank to use the default message.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString()}` : ""}
            </p>
            <Button onClick={() => save()} disabled={saving} size="sm" className="gap-2">
              <Save className="h-4 w-4" /> Save message
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMaintenanceTab;