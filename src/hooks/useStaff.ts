import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Returns true if the user has the 'staff' role (or higher). */
export function useStaff() {
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const check = async (uid?: string) => {
      const id = uid || (await supabase.auth.getSession()).data.session?.user?.id;
      if (!id) { if (mounted) { setIsStaff(false); setLoading(false); } return; }
      const [{ data: s }, { data: a }, { data: m }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: id, _role: "staff" }),
        supabase.rpc("has_role", { _user_id: id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: id, _role: "moderator" }),
      ]);
      if (!mounted) return;
      setIsStaff(!!s || !!a || !!m);
      setLoading(false);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user?.id) { setIsStaff(false); setLoading(false); return; }
      check(session.user.id);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  return { isStaff, loading };
}
