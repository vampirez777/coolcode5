import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck,
  ShieldOff,
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  Lock,
  Globe,
  ScrollText,
  HandshakeIcon,
  Bot,
  Ban,
  ShieldQuestion,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useGlobalSecuritySettings,
  type GlobalSecuritySetting,
} from "@/hooks/useGlobalSecuritySettings";

/* Visual metadata per category & per known key. */
const CATEGORY_META: Record<string, { label: string; icon: typeof Globe; tone: string }> = {
  entry: { label: "Entry / Verification gate", icon: Globe, tone: "from-primary/15 to-primary/5 text-primary" },
  auth: { label: "Authentication", icon: Lock, tone: "from-blue-500/15 to-blue-500/5 text-blue-500" },
  deals: { label: "Deals", icon: HandshakeIcon, tone: "from-amber-500/15 to-amber-500/5 text-amber-500" },
  release: { label: "Release & sensitive actions", icon: ShieldCheck, tone: "from-emerald-500/15 to-emerald-500/5 text-emerald-500" },
  general: { label: "General", icon: ShieldCheck, tone: "from-primary/15 to-primary/5 text-primary" },
};

const KEY_ICONS: Record<string, typeof ShieldCheck> = {
  entry_captcha: Bot,
  entry_vpn_check: Globe,
  entry_quiz: ShieldQuestion,
  entry_risk_blocking: Ban,
  signup_tos_required: ScrollText,
  deal_create_tos_required: ScrollText,
  user_security_prefs_enforced: ShieldCheck,
};

const AdminGlobalSecurityToggles = () => {
  const { settings, loading, reload } = useGlobalSecuritySettings();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState<"enable" | "disable" | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | {
    type: "single" | "bulk-disable" | "bulk-enable";
    setting?: GlobalSecuritySetting;
    next?: boolean;
  }>(null);

  const list = useMemo(
    () => Object.values(settings).sort((a, b) => a.label.localeCompare(b.label)),
    [settings],
  );

  const grouped = useMemo(() => {
    const map: Record<string, GlobalSecuritySetting[]> = {};
    list.forEach((s) => {
      const k = s.category || "general";
      (map[k] ||= []).push(s);
    });
    return map;
  }, [list]);

  const enabledCount = list.filter((s) => s.enabled).length;
  const total = list.length;
  const allOn = total > 0 && enabledCount === total;
  const allOff = total > 0 && enabledCount === 0;

  const writeSingle = async (setting: GlobalSecuritySetting, next: boolean) => {
    setSavingKey(setting.setting_key);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("global_security_settings")
      .update({ enabled: next, updated_by: user?.id ?? null })
      .eq("setting_key", setting.setting_key);
    setSavingKey(null);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: next ? "Protection re-enabled" : "Protection disabled",
      description: setting.label,
    });
  };

  const writeBulk = async (next: boolean) => {
    setBulkBusy(next ? "enable" : "disable");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("global_security_settings")
      .update({ enabled: next, updated_by: user?.id ?? null })
      .neq("setting_key", "__none__"); // affect every row
    setBulkBusy(null);
    if (error) {
      toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: next ? "All protections enabled" : "All protections disabled",
      description: next
        ? "Every security feature has been turned back on."
        : "Every security feature is now disabled. Re-enable as soon as possible.",
    });
  };

  const requestToggle = (setting: GlobalSecuritySetting, next: boolean) => {
    // Disabling needs confirmation; enabling can be instant.
    if (!next) {
      setConfirmAction({ type: "single", setting, next });
      return;
    }
    void writeSingle(setting, next);
  };

  const handleConfirm = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (!action) return;
    if (action.type === "single" && action.setting) {
      await writeSingle(action.setting, action.next ?? false);
    } else if (action.type === "bulk-disable") {
      await writeBulk(false);
    } else if (action.type === "bulk-enable") {
      await writeBulk(true);
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero / control panel */}
      <Card className="overflow-hidden border-border bg-gradient-to-br from-primary/10 via-card to-card relative">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
        <CardContent className="relative p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-foreground">Global security toggles</h2>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide text-primary">
                    Admin only
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  Turn site-wide protections on or off for everyone in real time. Use individual
                  switches below, or the master controls on the right. Changes take effect immediately
                  for all visitors — no redeploy needed.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-stretch md:items-end gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-3xl font-bold leading-none tabular-nums text-foreground">
                    {enabledCount}
                    <span className="text-base font-medium text-muted-foreground">/{total || "—"}</span>
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
                    protections active
                  </div>
                </div>
                <Button size="icon" variant="outline" onClick={reload} disabled={loading} className="h-9 w-9">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
                  onClick={() => setConfirmAction({ type: "bulk-enable" })}
                  disabled={bulkBusy !== null || allOn || total === 0}
                >
                  {bulkBusy === "enable" ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4 mr-1.5" />
                  )}
                  Enable all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirmAction({ type: "bulk-disable" })}
                  disabled={bulkBusy !== null || allOff || total === 0}
                >
                  {bulkBusy === "disable" ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <PowerOff className="h-4 w-4 mr-1.5" />
                  )}
                  Disable all
                </Button>
              </div>
            </div>
          </div>

          {/* Status bar */}
          {total > 0 && (
            <div className="mt-5 h-2 w-full rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-primary transition-all duration-500"
                style={{ width: `${(enabledCount / total) * 100}%` }}
              />
            </div>
          )}
          {allOff && total > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                <span className="font-semibold">All protections are OFF.</span> The site is currently
                running without entry verification or ToS gating. Re-enable as soon as the maintenance
                window ends.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading state */}
      {loading ? (
        <Card className="bg-card border-border">
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading security toggles…
          </CardContent>
        </Card>
      ) : list.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No security toggles defined yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, items]) => {
            const meta = CATEGORY_META[cat] || CATEGORY_META.general;
            const Icon = meta.icon;
            const onCount = items.filter((i) => i.enabled).length;
            return (
              <Card key={cat} className="bg-card border-border overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${meta.tone}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-foreground">{meta.label}</span>
                    </div>
                    <span className="text-xs font-normal text-muted-foreground tabular-nums">
                      {onCount}/{items.length} on
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40">
                    {items.map((s) => {
                      const RowIcon = KEY_ICONS[s.setting_key] || ShieldCheck;
                      const saving = savingKey === s.setting_key;
                      return (
                        <div
                          key={s.setting_key}
                          className={`flex items-start gap-4 p-4 transition-colors ${
                            s.enabled ? "bg-transparent" : "bg-destructive/[0.04]"
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                              s.enabled
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {s.enabled ? <RowIcon className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground">{s.label}</p>
                              {s.enabled ? (
                                <Badge variant="secondary" className="text-[10px] text-primary">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="text-[10px]">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            {s.description && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {s.description}
                              </p>
                            )}
                            <p className="text-[10px] font-mono text-muted-foreground/70 mt-1.5">
                              {s.setting_key}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            <Switch
                              checked={s.enabled}
                              disabled={saving || bulkBusy !== null}
                              onCheckedChange={(v) => requestToggle(s, v)}
                              aria-label={s.label}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
        Tip: Disabling protections reduces friction for users but exposes the platform to bots,
        VPN abuse and ToS-circumvention. Re-enable as soon as you are done.
      </p>

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "bulk-disable"
                ? "Disable ALL security protections?"
                : confirmAction?.type === "bulk-enable"
                ? "Re-enable all security protections?"
                : `Disable “${confirmAction?.setting?.label}”?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "bulk-disable"
                ? "This turns off every entry check, ToS gate and risk block for everyone, immediately. Only do this for emergencies or maintenance."
                : confirmAction?.type === "bulk-enable"
                ? "This restores every protection to ON for all users, immediately."
                : "Users will no longer pass through this check until you re-enable it. The change applies immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmAction?.type === "bulk-enable"
                  ? ""
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {confirmAction?.type === "bulk-enable" ? "Yes, enable all" : "Yes, disable"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminGlobalSecurityToggles;