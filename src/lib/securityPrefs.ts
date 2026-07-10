import { supabase } from "@/integrations/supabase/client";

export type SecurityPrefs = {
  require_2fa_on_release: boolean;
  require_captcha_on_release: boolean;
  require_confirm_prompt: boolean;
};

export const DEFAULT_SECURITY_PREFS: SecurityPrefs = {
  require_2fa_on_release: true,
  require_captcha_on_release: true,
  require_confirm_prompt: true,
};

export async function loadSecurityPrefs(userId: string): Promise<SecurityPrefs> {
  const { data } = await supabase
    .from("user_security_prefs")
    .select("require_2fa_on_release, require_captcha_on_release, require_confirm_prompt")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_SECURITY_PREFS };
  return {
    require_2fa_on_release: data.require_2fa_on_release ?? true,
    require_captcha_on_release: data.require_captcha_on_release ?? true,
    require_confirm_prompt: data.require_confirm_prompt ?? true,
  };
}

export async function saveSecurityPrefs(userId: string, prefs: SecurityPrefs) {
  const { error } = await supabase
    .from("user_security_prefs")
    .upsert(
      { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}
