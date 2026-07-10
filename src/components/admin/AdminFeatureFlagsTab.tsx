import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ToggleLeft, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { FeatureFlag } from "@/hooks/useFeatureFlags";

/**
 * Admin-only tab to enable/disable user-facing features in real time.
 * RLS guarantees only admins can write; moderators have no write access.
 */
const AdminFeatureFlagsTab = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feature_flags")
      .select("*")
      .order("label", { ascending: true });
    if (error) {
      toast({ title: "Couldn't load flags", description: error.message, variant: "destructive" });
    } else {
      setFlags((data || []) as FeatureFlag[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`feature_flags_admin_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggle = async (flag: FeatureFlag, next: boolean) => {
    setSavingKey(flag.flag_key);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("feature_flags")
      .update({ enabled: next, updated_by: user?.id ?? null })
      .eq("id", flag.id);
    setSavingKey(null);
    if (error) {
      toast({ title: "Couldn't update flag", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: `${flag.label} ${next ? "enabled" : "disabled"}`,
      description: next ? "Users can use this feature again." : "Users will no longer see this feature.",
    });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ToggleLeft className="h-5 w-5 text-primary" />
          Feature flags
          <Badge variant="secondary" className="ml-2 text-[10px] uppercase tracking-wide">Admin only</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Disable features for all users instantly. Changes take effect in real time without a redeploy.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : flags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No feature flags defined.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{flag.label}</p>
                    {flag.enabled ? (
                      <Badge variant="secondary" className="text-primary text-[10px]">Enabled</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">Disabled</Badge>
                    )}
                  </div>
                  {flag.description && (
                    <p className="text-xs text-muted-foreground mt-1">{flag.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{flag.flag_key}</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {savingKey === flag.flag_key && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                  <Switch
                    checked={flag.enabled}
                    disabled={savingKey === flag.flag_key}
                    onCheckedChange={(v) => toggle(flag, v)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminFeatureFlagsTab;