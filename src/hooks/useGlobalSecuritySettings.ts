import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GlobalSecuritySetting {
  setting_key: string;
  enabled: boolean;
  label?: string;
  description?: string | null;
  category?: string;
  updated_by?: string | null;
  updated_at?: string;
  created_at?: string;
}

/**
 * Read-only hook for global security toggles. Subscribes to realtime so admin
 * changes propagate immediately to every visitor (signed in or not).
 * If a key is missing from the table, the feature is treated as ENABLED by
 * default — matching "secure by default" behavior.
 */
export function useGlobalSecuritySettings() {
  const [settings, setSettings] = useState<Record<string, GlobalSecuritySetting>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Use the public RPC that only exposes (setting_key, enabled).
    // The underlying table is admin/moderator-only.
    const { data } = await supabase.rpc("get_public_security_flags");
    const map: Record<string, GlobalSecuritySetting> = {};
    (data || []).forEach((s: any) => {
      map[s.setting_key] = s as GlobalSecuritySetting;
    });
    setSettings(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`global_security_settings_changes_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "global_security_settings" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const isEnabled = useCallback(
    (key: string) => {
      const s = settings[key];
      return s ? s.enabled : true;
    },
    [settings],
  );

  return { settings, isEnabled, loading, reload: load };
}

/**
 * One-shot, non-reactive read of a single setting. Useful inside event
 * handlers that need the latest value at click-time without subscribing.
 * Defaults to `true` on any error.
 */
export async function fetchGlobalSecuritySetting(key: string): Promise<boolean> {
  const { data } = await supabase.rpc("get_public_security_flags");
  const row = (data || []).find((s: any) => s.setting_key === key);
  if (!row) return true;
  return !!row.enabled;
}