import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import MfaChallengeDialog from "@/components/auth/MfaChallengeDialog";
import { useCaptchaGate } from "@/hooks/useCaptchaGate";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { logToSEvent } from "@/lib/tosLog";
import { useGlobalSecuritySettings } from "@/hooks/useGlobalSecuritySettings";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const inviteDealId = searchParams.get("invite");
  const [isLogin, setIsLogin] = useState(!inviteDealId);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { isEnabled: isSecEnabled } = useGlobalSecuritySettings();
  const tosRequired = isSecEnabled("signup_tos_required");
  const [mfaOpen, setMfaOpen] = useState(false);
  const [pendingPostLogin, setPendingPostLogin] = useState<null | (() => void)>(null);
  const [inviteInfo, setInviteInfo] = useState<{
    creatorName: string;
    amount: number | null;
    coin: string | null;
    alreadyTaken: boolean;
  } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { runWithCaptcha, gate: captchaGate } = useCaptchaGate();
  const { isEnabled: isFeatureEnabled } = useFeatureFlags();

  const handleDiscordSignIn = () => {
    toast({
      title: "Discord login unavailable",
      description:
        "Our Discord bot which we use to operate logins is currently down, please login using Email & Password or proceed with Google Login.",
      variant: "destructive",
    });
  };

  const LOVABLE_AUTH_HOST = "https://digital-twin-show.lovable.app";

  const handleGoogleSignIn = async () => {
    const isOnLovableHost = window.location.origin === LOVABLE_AUTH_HOST;
    if (!isOnLovableHost) {
      const target = new URL(`${LOVABLE_AUTH_HOST}/auth`);
      target.searchParams.set("google", "1");
      if (inviteDealId) target.searchParams.set("invite", inviteDealId);
      window.location.href = target.toString();
      return;
    }
    const redirectTo = inviteDealId
      ? `${LOVABLE_AUTH_HOST}/auth?invite=${inviteDealId}`
      : `${LOVABLE_AUTH_HOST}/dashboard`;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectTo });
    if (result.error) {
      toast({ title: "Google sign-in failed", description: result.error.message, variant: "destructive" });
      return;
    }
    if (result.redirected) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && inviteDealId) {
      await attachToInvitedDeal(session.user.id);
      navigate("/deals");
    } else {
      navigate("/dashboard");
    }
  };

  useEffect(() => {
    if (!inviteDealId) return;
    (async () => {
      const { data: deal } = await supabase
        .from("deals")
        .select("creator_id, other_user_id, amount, coin")
        .eq("id", inviteDealId)
        .maybeSingle();
      if (!deal) {
        setInviteInfo({ creatorName: "Unknown", amount: null, coin: null, alreadyTaken: false });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("user_id", deal.creator_id)
        .maybeSingle();
      const rawName = profile?.username || profile?.display_name || "";
      const cleanName = rawName.includes("@") ? rawName.split("@")[0] : rawName;
      setInviteInfo({
        creatorName: cleanName || "A user",
        amount: deal.amount,
        coin: deal.coin,
        alreadyTaken: !!deal.other_user_id,
      });
    })();
  }, [inviteDealId]);

  const attachToInvitedDeal = async (userId: string) => {
    if (!inviteDealId) return;
    const { data: deal, error: fetchErr } = await supabase
      .from("deals")
      .select("id, creator_id, other_user_id")
      .eq("id", inviteDealId)
      .maybeSingle();
    if (fetchErr || !deal) {
      toast({ title: "Invite link invalid", description: "We couldn't find that deal.", variant: "destructive" });
      return;
    }
    if (deal.creator_id === userId) {
      toast({ title: "That's your own deal", description: "Share the link with the other party." });
      return;
    }
    if (deal.other_user_id && deal.other_user_id !== userId) {
      toast({ title: "Deal already has another party", variant: "destructive" });
      return;
    }
    const { error: updateErr } = await supabase
      .from("deals")
      .update({ other_user_id: userId })
      .eq("id", inviteDealId);
    if (updateErr) {
      toast({ title: "Couldn't join deal", description: updateErr.message, variant: "destructive" });
    } else {
      toast({ title: "Joined the deal!", description: "You've been added as the other party." });
    }
  };

  useEffect(() => {
    if (!inviteDealId) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await attachToInvitedDeal(session.user.id);
        navigate(`/deals`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteDealId]);

  useEffect(() => {
    if (searchParams.get("google") !== "1") return;
    if (window.location.origin !== LOVABLE_AUTH_HOST) return;
    handleGoogleSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const performAuth = async () => {
    if (forgotMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We sent you a password reset link." });
        setForgotMode(false);
      }
    } else if (isLogin) {
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        const finishLogin = async () => {
          toast({ title: "Welcome back!" });
          if (signInData.user && inviteDealId) {
            await attachToInvitedDeal(signInData.user.id);
            navigate("/deals");
          } else {
            navigate("/dashboard");
          }
        };
        if (aalData?.nextLevel === "aal2" && aalData.currentLevel === "aal1") {
          setPendingPostLogin(() => finishLogin);
          setMfaOpen(true);
        } else {
          await finishLogin();
        }
      }
    } else {
      if (!isFeatureEnabled("signups")) {
        toast({ title: "Signups disabled", description: "New account creation is currently turned off by an administrator.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (tosRequired && !agreedToTerms) {
        await logToSEvent({ context: "signup", accepted: false, attemptedWithoutAccept: true, email: email || null, username: username.trim().toLowerCase() || null });
        toast({ title: "Please accept the Terms of Service", description: "You must agree to the Terms of Service and Privacy Policy to create an account.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!username.trim() || username.trim().length < 3) {
        toast({ title: "Error", description: "Username must be at least 3 characters.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { data: usernameAvailable } = await (supabase as any).rpc("is_username_available", {
        _username: username.trim().toLowerCase(),
      });
      if (!usernameAvailable) {
        toast({ title: "Error", description: "Username is already taken.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { username: username.trim().toLowerCase(), display_name: username.trim() },
        },
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        await logToSEvent({ context: "signup", accepted: true, userId: signUpData.user?.id ?? null, email, username: username.trim().toLowerCase() });
        if (signUpData.user && inviteDealId && signUpData.session) {
          await attachToInvitedDeal(signUpData.user.id);
          toast({ title: "Account created & joined deal!" });
          navigate("/deals");
          setLoading(false);
          return;
        }
        toast({
          title: "Account created!",
          description: inviteDealId ? "Verify your email, then log back in to join the deal." : "Check your email to verify your account.",
        });
      }
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const reason = forgotMode ? "sending a password reset" : isLogin ? "signing in" : "creating your account";
    runWithCaptcha(performAuth, { reason, title: "Verify you're human", onCancel: () => setLoading(false) });
  };

  const barHeights = [111, 133.8, 151.6, 202, 151.6, 133.8, 111, 133.8, 151.6, 202, 151.6, 133.8, 111, 133.8, 151.6, 202, 151.6, 133.8, 111, 133.8, 151.6, 202];

  return (
    <div
      className="auth-page__shell relative min-h-dvh w-full overflow-hidden"
      style={{ ["--auth-legal-strip-height" as any]: "66px" }}
    >
      {captchaGate}

      <div className="relative z-[2] flex min-h-dvh w-full">
        {/* LEFT – form column */}
        <div
          className="auth-page__left relative flex w-full flex-1 flex-col px-4 pt-11 sm:px-8 sm:pt-12 lg:w-2/3 lg:px-16 lg:pt-14"
          style={{ paddingBottom: "calc(var(--auth-legal-strip-height) + 24px)" }}
        >
          <a href="/" className="inline-flex items-center gap-2 text-[20px] font-semibold tracking-[-0.01em] text-foreground hover:opacity-90">
            <img src="/images/logo.ico" alt="HalalMM" className="h-9 w-9 rounded-lg" />
            <span>Halal MM</span>
          </a>

          <div className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col">
            <div className="my-auto flex w-full flex-col py-2 sm:py-4">
              <h1 className="auth-form__title">
                {forgotMode ? "Reset Password" : isLogin ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="auth-form__subtitle mt-[18px]">
                {forgotMode
                  ? "Enter your email to receive a reset link."
                  : isLogin
                  ? "Enter credentials to access account."
                  : "Choose a username and get started."}
              </p>

              {inviteDealId && !forgotMode && inviteInfo && (
                <div className="mt-6 rounded-lg border border-primary/30 bg-primary/10 px-4 py-4 text-sm text-foreground">
                  <div className="flex items-start gap-3">
                    <img src="/images/logo.ico" alt="HalalMM" className="h-8 w-8 rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold mb-1">You've been invited to a deal</p>
                      {inviteInfo.alreadyTaken ? (
                        <p className="text-destructive text-xs">This deal already has another party joined.</p>
                      ) : (
                        <>
                          <p className="text-muted-foreground text-xs mb-2">
                            <span className="text-foreground font-medium">{inviteInfo.creatorName}</span> invited you to join their escrow deal
                            {inviteInfo.amount && inviteInfo.coin && (
                              <> for <span className="text-foreground font-medium">{inviteInfo.amount} {inviteInfo.coin}</span></>
                            )}
                            .
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isLogin ? "Log in" : "Sign up"} below to be added as the other party.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-[46px] flex flex-col gap-[26px]">
                {!isLogin && !forgotMode && (
                  <div>
                    <label className="auth-form__label">Username</label>
                    <Input
                      type="text"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      required
                      minLength={3}
                      maxLength={20}
                      className="auth-form__input w-full rounded-xl px-4 py-3 outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="auth-form__label">Email Address</label>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="auth-form__input w-full rounded-xl px-4 py-3 outline-none"
                  />
                </div>
                {!forgotMode && (
                  <div>
                    <label className="auth-form__label">Password</label>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="auth-form__input w-full rounded-xl px-4 py-3 outline-none"
                    />
                  </div>
                )}

                {isLogin && !forgotMode && (
                  <div className="flex items-center justify-between">
                    <label htmlFor="remember" className="flex cursor-pointer items-center gap-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(c) => setRememberMe(!!c)}
                        className="h-4 w-4 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="auth-form__checkbox-label">Remember Me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="auth-form__link-accent font-medium hover:opacity-90"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {!isLogin && !forgotMode && tosRequired && (
                  <label
                    htmlFor="agree-tos"
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-3 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Checkbox
                      id="agree-tos"
                      checked={agreedToTerms}
                      onCheckedChange={(c) => setAgreedToTerms(!!c)}
                      className="mt-0.5 border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-xs text-muted-foreground leading-snug">
                      I have read and agree to the{" "}
                      <Link to="/terms" target="_blank" className="text-primary underline underline-offset-2">Terms of Service</Link>{" "}
                      and{" "}
                      <Link to="/privacy" target="_blank" className="text-primary underline underline-offset-2">Privacy Policy</Link>.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-form__submit h-[44px] w-full rounded-[14px] disabled:opacity-60"
                >
                  {loading ? "Loading..." : forgotMode ? "Send Reset Link" : isLogin ? "Log In" : "Create Account"}
                </button>
              </form>

              {!forgotMode && (
                <div className="mt-6 flex flex-col items-stretch gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#FFFFFF22]" />
                    <span className="text-xs uppercase tracking-wider text-[#FFFFFF66]">or</span>
                    <div className="h-px flex-1 bg-[#FFFFFF22]" />
                  </div>
                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="h-[44px] w-full rounded-[14px] bg-white text-gray-800 font-medium text-sm hover:bg-gray-100 flex items-center justify-center gap-2 border border-border/50"
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                    </svg>
                    Continue with Google
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDiscordSignIn}
                    className="h-[44px] w-full rounded-[14px] border border-[#FFFFFF33] bg-[#1a1a1a] text-sm font-medium text-white hover:bg-[#222] flex items-center justify-center gap-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
                    </svg>
                    Continue with Discord
                  </Button>
                </div>
              )}

              <p className="auth-form__footer-link mt-8 block text-center hover:opacity-90">
                {forgotMode ? (
                  <button onClick={() => setForgotMode(false)} className="text-primary hover:underline font-medium">Back to login</button>
                ) : (
                  <>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
                      {isLogin ? "Sign up" : "Sign in"}
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT – mockup column */}
        <div className="auth-page__right-outer hidden w-1/3 shrink-0 items-center justify-center self-stretch lg:flex">
          <div className="auth-page__gradient-outer flex h-full w-full">
            <div className="auth-page__mock-column">
              <img
                src="/images/mock.webp"
                alt=""
                className="absolute inset-y-0 left-0 h-full w-auto min-w-[1212px] max-w-none object-cover object-left"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom green wave bars */}
      <div
        className="auth-page__bars pointer-events-none absolute inset-x-0 z-[1] flex w-full items-end overflow-hidden"
        style={{ bottom: "var(--auth-legal-strip-height, 66px)" }}
        aria-hidden="true"
      >
        {barHeights.map((h, i) => (
          <div key={i} className="auth-page__bar shrink-0" style={{ ["--auth-bar-height" as any]: `${h}px` }} />
        ))}
      </div>

      {/* Bottom legal strip */}
      <div className="absolute inset-x-0 bottom-0 z-[3] bg-background">
        <div className="flex h-[66px] items-center justify-between px-4 sm:px-8 lg:px-16 text-xs text-muted-foreground">
          <span>All rights reserved, Halal MM 2026</span>
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-foreground">Terms &amp; Conditions</a>
            <a href="/privacy" className="hover:text-foreground">Privacy Policy</a>
          </div>
        </div>
      </div>

      <MfaChallengeDialog
        open={mfaOpen}
        onClose={async () => {
          setMfaOpen(false);
          setPendingPostLogin(null);
          await supabase.auth.signOut();
        }}
        onVerified={async () => {
          setMfaOpen(false);
          if (pendingPostLogin) await pendingPostLogin();
          setPendingPostLogin(null);
        }}
        title="Verify it's you"
        description="Enter the 6-digit code from your authenticator app to finish signing in."
      />
    </div>
  );
};

export default Auth;
