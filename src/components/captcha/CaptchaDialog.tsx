import { useEffect, useRef, useState } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ShieldCheck } from "lucide-react";
import { getCaptchaSitekey, verifyCaptchaToken } from "@/lib/captcha";
import { useToast } from "@/hooks/use-toast";

interface CaptchaDialogProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  /** Optional contextual reason shown above the widget (e.g. "creating a deal"). */
  reason?: string;
  /** Optional title override. */
  title?: string;
}

/**
 * Reusable robot-verification gate. Renders an hCaptcha widget inside a modal
 * and calls onVerified() once the token is successfully verified server-side.
 */
const CaptchaDialog = ({ open, onClose, onVerified, reason, title }: CaptchaDialogProps) => {
  const [sitekey, setSitekey] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<HCaptcha | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setError(null);
    getCaptchaSitekey()
      .then(setSitekey)
      .catch((e) =>
        setError(e?.message || "Could not load verification widget")
      );
  }, [open]);

  const handleToken = async (token: string) => {
    setVerifying(true);
    try {
      const ok = await verifyCaptchaToken(token);
      if (ok) {
        onVerified();
        onClose();
      } else {
        setError("Verification failed. Please try again.");
        widgetRef.current?.resetCaptcha();
        toast({
          title: "Verification failed",
          description: "Please complete the challenge again.",
          variant: "destructive",
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {title || "Verify you're human"}
          </DialogTitle>
          <DialogDescription>
            {reason
              ? `Quick security check before ${reason}.`
              : "Quick security check to keep HalalMiddleman.net safe from bots."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center min-h-[110px] py-2">
          {!sitekey && !error && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading challenge...
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          {sitekey && (
            <HCaptcha
              ref={widgetRef}
              sitekey={sitekey}
              onVerify={handleToken}
              onError={() => setError("Challenge errored. Please retry.")}
              onExpire={() => widgetRef.current?.resetCaptcha()}
              theme="dark"
            />
          )}
          {verifying && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CaptchaDialog;