import { useCallback, useEffect, useRef, useState } from "react";
import CaptchaDialog from "@/components/captcha/CaptchaDialog";
import { supabase } from "@/integrations/supabase/client";

interface PendingAction {
  fn: () => void | Promise<void>;
  reason?: string;
  title?: string;
  onCancel?: () => void;
}

/**
 * Hook that returns a `runWithCaptcha(fn, opts)` helper. Calling it opens the
 * captcha dialog; the wrapped fn runs only after the user passes verification.
 * Render the returned `gate` element somewhere in your tree.
 */
export function useCaptchaGate() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const isAuthedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      isAuthedRef.current = !!data.session?.user;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      isAuthedRef.current = !!session?.user;
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const runWithCaptcha = useCallback(
    (fn: () => void | Promise<void>, opts?: { reason?: string; title?: string; onCancel?: () => void }) => {
      // Authenticated users (including magic-invite users) bypass all
      // in-app verification prompts — run the action immediately.
      if (isAuthedRef.current) {
        void fn();
        return;
      }
      setPending({ fn, reason: opts?.reason, title: opts?.title, onCancel: opts?.onCancel });
      setOpen(true);
    },
    []
  );

  const handleVerified = useCallback(() => {
    const action = pending;
    setPending(null);
    if (action) {
      void action.fn();
    }
  }, [pending]);

  const gate = (
    <CaptchaDialog
      open={open}
      onClose={() => {
        setOpen(false);
        if (pending?.onCancel) pending.onCancel();
        setPending(null);
      }}
      onVerified={handleVerified}
      reason={pending?.reason}
      title={pending?.title}
    />
  );

  return { runWithCaptcha, gate };
}