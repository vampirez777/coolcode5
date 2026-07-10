import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Settings panel for enrolling/unenrolling a TOTP authenticator app.
 * Uses Supabase Auth MFA (built-in encrypted secret storage).
 */
const MfaSettingsCard = () => {
  const [loading, setLoading] = useState(true);
  const [hasFactor, setHasFactor] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  // Enrollment flow state
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    setHasFactor((data?.totp || []).some((f) => f.status === "verified"));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const startEnroll = async () => {
    setEnrolling(true);
    setCode("");

    // Clean up any old unverified factors so we don't accumulate them
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.totp || []) {
      if (f.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${Date.now()}`,
    });
    if (error) {
      toast.error(error.message);
      setEnrolling(false);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
  };

  const verifyEnroll = async () => {
    if (!factorId || code.length !== 6) return;
    setVerifying(true);

    const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr || !challenge) {
      toast.error(chErr?.message || "Failed to start verification");
      setVerifying(false);
      return;
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (error) {
      toast.error(error.message || "Invalid code, try again");
      setCode("");
      setVerifying(false);
      return;
    }

    toast.success("Two-factor authentication enabled!");
    setEnrolling(false);
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode("");
    setVerifying(false);
    await refresh();
  };

  const cancelEnroll = async () => {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setEnrolling(false);
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode("");
  };

  const handleUnenroll = async () => {
    if (!confirm("Disable two-factor authentication? Your account will be less secure.")) return;
    setUnenrolling(true);
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.totp || []) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    toast.success("Two-factor authentication disabled");
    setUnenrolling(false);
    refresh();
  };

  const copySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  // Already enrolled
  if (hasFactor && !enrolling) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Two-factor authentication is enabled</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You'll be asked for a 6-digit code at login and before releasing funds.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleUnenroll} disabled={unenrolling} className="border-destructive/40 text-destructive hover:bg-destructive/10">
          {unenrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldOff className="h-4 w-4 mr-2" />Disable 2FA</>}
        </Button>
      </div>
    );
  }

  // Enrollment in progress (showing QR + verify)
  if (enrolling && qrCode) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-4 space-y-4">
        <p className="text-sm text-foreground">
          1. Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
        </p>
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-lg" dangerouslySetInnerHTML={{ __html: qrCode }} />
        </div>
        {secret && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Or enter this key manually:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-muted/40 px-2 py-1.5 rounded border border-border/40 break-all">{secret}</code>
              <Button size="icon" variant="outline" onClick={copySecret} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
        <div>
          <p className="text-sm text-foreground mb-2">2. Enter the 6-digit code shown in your app:</p>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode} disabled={verifying}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cancelEnroll} className="flex-1" disabled={verifying}>Cancel</Button>
          <Button onClick={verifyEnroll} disabled={code.length !== 6 || verifying} className="flex-1">
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Enable"}
          </Button>
        </div>
      </div>
    );
  }

  // Not enrolled — show enable button
  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Two-factor authentication</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add an extra layer of security with an authenticator app. Required when releasing funds once enabled.
          </p>
        </div>
      </div>
      <Button onClick={startEnroll} className="bg-primary text-primary-foreground">
        <ShieldCheck className="h-4 w-4 mr-2" /> Enable 2FA
      </Button>
    </div>
  );
};

export default MfaSettingsCard;
