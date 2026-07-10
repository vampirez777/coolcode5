import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceState {
  enabled: boolean;
  message: string | null;
  loading: boolean;
}

export function useMaintenance(): MaintenanceState {
  const [state, setState] = useState<MaintenanceState>({
    enabled: false,
    message: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("maintenance_mode, maintenance_message")
        .eq("id", 1)
        .maybeSingle();
      if (!mounted) return;
      // FAIL-CLOSED: if the settings row can't be read for ANY reason
      // (network error, RLS denial, row missing), assume maintenance is ON.
      // This prevents bypass attempts that block the request.
      if (error || !data) {
        setState({
          enabled: true,
          message: data?.maintenance_message ?? null,
          loading: false,
        });
        return;
      }
      setState({
        enabled: !!data.maintenance_mode,
        message: data.maintenance_message ?? null,
        loading: false,
      });
    };

    load();

    const channel = supabase
      .channel(`app_settings_changes_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (!row) return;
          setState({
            enabled: !!row.maintenance_mode,
            message: row.maintenance_message ?? null,
            loading: false,
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}