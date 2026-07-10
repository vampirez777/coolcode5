import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, ShieldAlert, KeyRound, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Step = "password" | "otp" | "done";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionKey: string;
  actionTitle: string;
  onDisabled: () => void;
}

const DisableSecurityActionDialog = ({
  open,
  onOpenChange,
  actionKey,
  actionTitle,
  onDisabled,
}: Props) => {
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string>("");

  useEffect(() => {
    if (!open) {
      // Small delay so closing animation doesn't show a reset state flash.
      const t = setTimeout(() => {
        setStep("password");
        setPassword("");
        setCode("");
        setMaskedEmail("");
        setLoading(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const submitPassword = async () => {
    if (!password) {
      toast.error("Enter your password");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("security-action-disable-start", {
        body: { password, action: actionKey },
      });
      if (error || !data?.ok) {
        const code = (data as any)?.error || error?.message;
        if (code === "invalid_password") toast.error("Incorrect password");
        else if (code === "send_failed") toast.error("Couldn't send the code. Try again.");
        else toast.error("Verification failed");
        return;
      }
      setMaskedEmail(data.email || "");
      setStep("otp");
      toast.success("Code sent to your email");
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("security-action-disable-confirm", {
        body: { code, action: actionKey },
      });
      if (error || !data?.ok) {
        const c = (data as any)?.error || error?.message;
        if (c === "invalid_code") toast.error("Incorrect code");
        else if (c === "code_expired") toast.error("Code expired. Start over.");
        else if (c === "too_many_attempts") {
          toast.error("Too many attempts. Start over.");
          setStep("password");
          setCode("");
        } else if (c === "no_pending_request") {
          toast.error("No active request. Start over.");
          setStep("password");
          setCode("");
        } else toast.error("Could not disable");
        return;
      }
      setStep("done");
      onDisabled();
      setTimeout(() => onOpenChange(false), 1300);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Disable {actionTitle}?</DialogTitle>
          <DialogDescription className="text-center">
            For your safety we ask for your password and an email code before turning off any
            security protection.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-1 mb-2">
          {(["password", "otp", "done"] as Step[]).map((s, i) => {
            const order = { password: 0, otp: 1, done: 2 } as const;
            const active = order[step] >= i;
            return (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  active ? "w-8 bg-primary" : "w-4 bg-muted"
                }`}
              />
            );
          })}
        </div>

        {step === "password" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex gap-3">
              <KeyRound className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Step 1 — Confirm it's you</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter your account password to continue.
                </p>
              </div>
            </div>
            <Input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submitPassword();
              }}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={loading}>
                Cancel
              </Button>
              <Button onClick={submitPassword} className="flex-1" disabled={loading || !password}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Step 2 — Email code</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{maskedEmail}</span>.
                  It expires in 10 minutes.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode} disabled={loading}>
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("password");
                  setCode("");
                }}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={submitOtp}
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={loading || code.length !== 6}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable protection"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="py-4 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">Protection disabled</p>
            <p className="text-xs text-muted-foreground">You can re-enable it anytime from settings.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DisableSecurityActionDialog;
