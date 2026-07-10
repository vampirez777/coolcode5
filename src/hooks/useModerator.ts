import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true if the current user has the moderator OR admin role.
 * (Admins inherit moderator access.)
 */
export function useModerator() {
  const [isModerator, setIsModerator] = useState(false);
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
        setIsModerator(false);
        // Wait for INITIAL_SESSION via onAuthStateChange before resolving.
        return;
      }

      const [{ data: admin }, { data: staff }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: id, _role: "admin" }),
        supabase.rpc("is_moderator_or_admin", { _user_id: id }),
      ]);

      if (!mounted) return;
      setIsAdmin(!!admin);
      setIsModerator(!!staff);
      setLoading(false);
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.id) {
        if (!mounted) return;
        setIsAdmin(false);
        setIsModerator(false);
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

  return { isModerator, isAdmin, loading };
}