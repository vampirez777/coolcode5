import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlag {
  id: string;
  flag_key: string;
  enabled: boolean;
  label: string;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Fetches all feature flags and exposes a helper to check one by key.
 * Subscribes to realtime changes so admin toggles propagate instantly.
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from("feature_flags").select("*");
    const map: Record<string, FeatureFlag> = {};
    (data || []).forEach((f: any) => {
      map[f.flag_key] = f as FeatureFlag;
    });
    setFlags(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`feature_flags_changes_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  /** Returns true if the feature is enabled (or flag not found = enabled by default). */
  const isEnabled = useCallback(
    (key: string) => {
      const f = flags[key];
      return f ? f.enabled : true;
    },
    [flags],
  );

  return { flags, isEnabled, loading, reload: load };
}