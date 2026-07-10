import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async (userId?: string) => {
      setLoading(true);

      const id = userId || (await supabase.auth.getSession()).data.session?.user?.id;
      if (!id) {
        if (!mounted) return;
        setIsAdmin(false);
        // Keep loading=true until onAuthStateChange fires with INITIAL_SESSION,
        // so admin-guarded pages don't redirect before the session is restored.
        return;
      }

      const { data } = await supabase.rpc("has_role", { _user_id: id, _role: "admin" });

      if (!mounted) return;
      setIsAdmin(!!data);
      setLoading(false);
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.id) {
        if (!mounted) return;
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      check(session.user.id);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading };
}
