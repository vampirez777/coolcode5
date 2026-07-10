import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true if the current user has at least one verified TOTP factor.
 * Returns false if no verified factor or if not signed in / on error.
 */
export async function userHasVerifiedMfa(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return false;
  return (data.totp || []).some((f) => f.status === "verified");
}
