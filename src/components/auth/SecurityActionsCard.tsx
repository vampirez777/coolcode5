import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Bot, AlertTriangle, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_SECURITY_PREFS,
  loadSecurityPrefs,
  saveSecurityPrefs,
  type SecurityPrefs,
} from "@/lib/securityPrefs";
import DisableSecurityActionDialog from "./DisableSecurityActionDialog";

type RowKey = keyof SecurityPrefs;

const ROWS: Array<{
  key: RowKey;
  title: string;
  desc: string;
  icon: typeof ShieldCheck;
  accent: string;
}> = [
  {
    key: "require_2fa_on_release",
    title: "2FA when releasing funds",
    desc: "Require a 6-digit authenticator code before funds are released to the seller.",
    icon: ShieldCheck,
    accent: "from-primary/20 to-primary/5 text-primary",
  },
  {
    key: "require_captcha_on_release",
    title: "Captcha when releasing",
    desc: "Show a captcha challenge before any release action to block bots and scripts.",
    icon: Bot,
    accent: "from-blue-500/20 to-blue-500/5 text-blue-500",
  },
  {
    key: "require_confirm_prompt",
    title: "\"Are you sure?\" prompt",
    desc: "Show a confirmation dialog before destructive or important actions like releasing, cancelling, or paying.",
    icon: AlertTriangle,
    accent: "from-amber-500/20 to-amber-500/5 text-amber-500",
  },
];

const SecurityActionsCard = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<SecurityPrefs>(DEFAULT_SECURITY_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<RowKey | null>(null);
  const [disableTarget, setDisableTarget] = useState<RowKey | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
      const loaded = await loadSecurityPrefs(session.user.id);
      setPrefs(loaded);
      setLoading(false);
    })();
  }, []);

  const toggle = async (key: RowKey, next: boolean) => {
    if (!userId) return;
    // Disabling a protection requires password + email OTP confirmation.
    if (!next) {
      setDisableTarget(key);
      return;
    }
    const previous = prefs;
    const updated = { ...prefs, [key]: next };
    setPrefs(updated);
    setSaving(key);
    try {
      await saveSecurityPrefs(userId, updated);
      toast.success(next ? "Protection enabled" : "Protection disabled", {
        description: ROWS.find((r) => r.key === key)?.title,
      });
    } catch (e: any) {
      setPrefs(previous);
      toast.error(e?.message || "Failed to update preference");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading security actions…
      </div>
    );
  }

  const enabledCount = Object.values(prefs).filter(Boolean).length;
  const total = ROWS.length;

  return (
    <div className="space-y-4">
      {/* Header / score */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-4">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Security actions</p>
              <p className="text-xs text-muted-foreground">
                Choose the checks we run on your account before sensitive actions.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-2xl font-bold leading-none text-foreground tabular-nums">
              {enabledCount}<span className="text-base font-medium text-muted-foreground">/{total}</span>
            </span>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">protections on</span>
          </div>
        </div>
      </div>

      {/* Toggle rows */}
      <div className="space-y-2">
        {ROWS.map(({ key, title, desc, icon: Icon, accent }) => {
          const value = prefs[key];
          const isSaving = saving === key;
          return (
            <div
              key={key}
              className={`group relative flex items-start gap-4 rounded-lg border p-4 transition-all ${
                value
                  ? "border-primary/30 bg-primary/[0.04]"
                  : "border-border/50 bg-card hover:border-border"
              }`}
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  {value ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Off
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
              <div className="flex items-center pt-0.5">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin text-muted-foreground" />
                ) : null}
                <Switch
                  checked={value}
                  disabled={isSaving}
                  onCheckedChange={(v) => toggle(key, v)}
                  aria-label={title}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
        Tip: We keep these on by default. Turning them off reduces friction but increases risk if your
        device or session is compromised.
      </p>

      {disableTarget && (
        <DisableSecurityActionDialog
          open={!!disableTarget}
          onOpenChange={(o) => {
            if (!o) setDisableTarget(null);
          }}
          actionKey={disableTarget}
          actionTitle={ROWS.find((r) => r.key === disableTarget)?.title || "this protection"}
          onDisabled={() => {
            setPrefs((p) => ({ ...p, [disableTarget]: false }));
          }}
        />
      )}
    </div>
  );
};

export default SecurityActionsCard;
