import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { markMagicInviteClaimApproved } from "@/lib/accessRequest";
import { AlertTriangle } from "lucide-react";

const MagicInviteClaim = () => {
  const params = useParams<{ token?: string }>();
  const [search] = useSearchParams();
  // Support both new (/deals/join?t=...) and legacy (/magic-invite/:token) URLs.
  const token = (search.get("t") || params.token || "").trim();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Verifying invite link…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || (!/^[A-Za-z0-9_-]{43}$/.test(token) && !/^[a-f0-9]{64}$/.test(token))) {
        setError("This invite link is malformed.");
        return;
      }
      try {
        // Honor the magic_invite_claim feature flag — admins can disable claims.
        const { data: flagRow } = await supabase
          .from("feature_flags")
          .select("enabled")
          .eq("flag_key", "magic_invite_claim")
          .maybeSingle();
        if (flagRow && flagRow.enabled === false) {
          setError("Magic invite claims are currently disabled by an administrator.");
          return;
        }

        // Sign out any existing LOCAL session first so we don't merge
        // identities with whoever is opening the link. Use scope: "local"
        // so we only kill THIS browser's session — never revoke the
        // creator's tokens on their other devices.
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});

        setStatus("Claiming your account…");
        const { data, error: fnErr } = await supabase.functions.invoke("magic-invite-claim", {
          body: { token },
        });
        if (cancelled) return;
        const d = data as { email?: string; token_hash?: string; deal_id?: string; error?: string } | null;
        if (fnErr || d?.error || !d?.email || !d?.token_hash) {
          setError(d?.error || fnErr?.message || "Could not claim this invite.");
          return;
        }

        setStatus("Signing you in…");
        // Try the modern "email" type first (used by newer Supabase SDKs
        // for token-hash flows); fall back to the legacy "magiclink" alias
        // if the server rejects it. Either should establish a session.
        type VerifyOtpResult = Awaited<ReturnType<typeof supabase.auth.verifyOtp>>;
        let verifyData: VerifyOtpResult["data"] | null = null;
        let vErr: VerifyOtpResult["error"] | null = null;
        {
          const r = await supabase.auth.verifyOtp({
            type: "email",
            token_hash: d.token_hash,
          });
          verifyData = r.data;
          vErr = r.error;
        }
        if ((!verifyData?.session || vErr) && !cancelled) {
          const r2 = await supabase.auth.verifyOtp({
            type: "magiclink",
            token_hash: d.token_hash,
          });
          verifyData = r2.data;
          vErr = r2.error;
        }
        if (cancelled) return;
        if (vErr || !verifyData?.session) {
          setError(vErr?.message || "Could not establish session");
          return;
        }

        // Belt-and-braces: explicitly persist the session before we
        // hard-navigate, so the next page load definitely reads it from
        // localStorage. Without this, fast browsers can fire the
        // navigation before supabase-js finishes writing.
        try {
          await supabase.auth.setSession({
            access_token: verifyData.session.access_token,
            refresh_token: verifyData.session.refresh_token,
          });
        } catch { /* non-fatal */ }

        markMagicInviteClaimApproved(d.deal_id);

        setStatus("All set — taking you to the deal…");
        // Hard-navigate so EntryGate, Deals page and any auth-aware
        // providers re-mount cleanly with the new session — avoids race
        // conditions where the SPA still holds the previous (signed-out)
        // state in memory.
        window.location.replace(`/deals?deal=${d.deal_id}`);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unexpected error");
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen w-full bg-background">
      {error && (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-8 shadow-2xl shadow-primary/5 text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5 ring-1 ring-destructive/30">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2 tracking-tight">Invite link unavailable</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MagicInviteClaim;