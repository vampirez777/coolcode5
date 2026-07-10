import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  /** Title shown above the code input */
  title?: string;
  /** Short copy shown below the title */
  description?: string;
}

/**
 * Prompts the current authenticated user for a fresh 6-digit TOTP code from
 * their authenticator app. On success, calls onVerified().
 *
 * Uses Supabase Auth MFA challenge+verify. If the user has multiple TOTP
 * factors, the first verified one is used.
 */
const MfaChallengeDialog = ({
  open,
  onClose,
  onVerified,
  title = "Two-Factor Verification",
  description = "Enter the 6-digit code from your authenticator app.",
}: Props) => {
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) {
      setCode("");
      setError(null);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        setError(error.message);
      } else {
        const verified = data?.totp?.find((f) => f.status === "verified");
        if (verified) setFactorId(verified.id);
        else setError("No verified authenticator app found.");
      }
      setLoading(false);
    })();
  }, [open]);

  const handleVerify = async () => {
    if (!factorId || code.length !== 6) return;
    setVerifying(true);
    setError(null);

    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeErr || !challenge) {
      setError(challengeErr?.message || "Failed to start challenge");
      setVerifying(false);
      return;
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyErr) {
      setError(verifyErr.message || "Invalid code");
      setCode("");
      setVerifying(false);
      return;
    }

    setVerifying(false);
    onVerified();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
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
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={verifying}>
                Cancel
              </Button>
              <Button
                onClick={handleVerify}
                disabled={code.length !== 6 || verifying || !factorId}
                className="flex-1"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MfaChallengeDialog;
