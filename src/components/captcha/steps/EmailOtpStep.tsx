import { useEffect, useState } from "react";
import { Mail, Loader2, ArrowLeft, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { sendVpnOtp, verifyVpnOtp } from "@/lib/captcha";
import StepShell from "./StepShell";

interface Props {
  step: number;
  total: number;
  onSuccess: () => void;
}

const EmailOtpStep = ({ step, total, onSuccess }: Props) => {
  const [phase, setPhase] = useState<"enter-email" | "enter-code">("enter-email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((x) => Math.max(0, x - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const startCooldown = (seconds = 30) => {
    setResendCooldown(Math.max(30, seconds));
  };

  const handleSend = async () => {
    if (!validEmail || busy || resendCooldown > 0) return;
    setBusy(true); setError(null);
    const res = await sendVpnOtp(email);
    setBusy(false);
    if (!res.ok) {
      if (res.error === "rate_limited") {
        startCooldown(res.retryAfter);
        setPhase("enter-code");
        setError(
          "We've already sent you a code recently. Check your inbox (and spam folder) — you can resend once the timer ends."
        );
      } else if (res.error === "invalid_email") {
        setError("That email address doesn't look right.");
      } else if (res.error === "network_error") {
        setError("Network issue — check your connection and try again.");
      } else if (res.error === "email_temporarily_unavailable" || res.error === "send_failed" || res.error === "try_again_later") {
        setError("Email delivery is busy right now. Please wait a minute, then resend the code.");
        startCooldown(60);
      } else {
        setError("We couldn't send a code right now. Please wait a minute, then try again.");
        startCooldown(60);
      }
      return;
    }
    setPhase("enter-code");
    startCooldown();
  };

  const handleVerify = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy(true); setError(null);
    const ok = await verifyVpnOtp(email, value);
    setBusy(false);
    if (ok) {
      onSuccess();
    } else {
      setError("Wrong or expired code. Try again or request a new one.");
      setCode("");
    }
  };

  if (phase === "enter-email") {
    return (
      <StepShell
        step={step}
        total={total}
        icon={<Mail className="h-8 w-8 text-primary" />}
        title="Confirm your email"
        description="Because you're on a VPN, we'll send a one-time code to verify you're a real person. This email isn't stored long-term and won't sign you in."
      >
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="space-y-3 text-left"
        >
          <label className="text-xs font-medium text-muted-foreground block">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="pl-9 h-12"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={!validEmail || busy || resendCooldown > 0}
            className="w-full"
            size="lg"
          >
            {busy ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending code…</>
            ) : resendCooldown > 0 ? (
              `Try again in ${resendCooldown}s`
            ) : (
              <><Send className="h-4 w-4 mr-2" />Send verification code</>
            )}
          </Button>
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70 pt-1">
            <ShieldCheck className="h-3 w-3" />
            <span>Code-only check • No account created • No password</span>
          </div>
        </form>
      </StepShell>
    );
  }

  return (
    <StepShell
      step={step}
      total={total}
      icon={<Mail className="h-8 w-8 text-primary" />}
      title="Enter the 6-digit code"
      description="We just sent your one-time code. Check your inbox (and spam folder)."
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate font-medium text-foreground">{email}</span>
          <button
            type="button"
            onClick={() => { setPhase("enter-email"); setCode(""); setError(null); }}
            className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" /> Edit
          </button>
        </div>

        <div className="flex justify-center pt-1">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(v) => { setCode(v); if (v.length === 6) handleVerify(v); }}
            disabled={busy}
          >
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
        {busy && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive text-center animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}

        <div className="flex items-center justify-center text-xs pt-1">
          <button
            type="button"
            onClick={handleSend}
            disabled={resendCooldown > 0 || busy}
            className="text-primary hover:underline disabled:opacity-50 disabled:no-underline font-medium"
          >
            {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Didn't get it? Resend code"}
          </button>
        </div>
      </div>
    </StepShell>
  );
};

export default EmailOtpStep;
