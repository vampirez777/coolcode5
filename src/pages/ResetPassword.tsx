import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Also check if already in a recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="relative flex flex-col w-full min-h-screen">
        <div className="px-8 pt-8">
          <a href="/" className="inline-flex items-center gap-2">
            <img src="/images/logo.ico" alt="HalalMM" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold text-foreground">Halal MM</span>
          </a>
        </div>

        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-foreground mb-2">Reset Password</h1>
            <p className="text-muted-foreground mb-8">Enter your new password below.</p>

            {!ready ? (
              <p className="text-muted-foreground text-sm">Verifying your reset link…</p>
            ) : (
              <form onSubmit={handleReset} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                  <Input
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 bg-transparent border-border/50 text-foreground placeholder:text-muted-foreground/50 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                  <Input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-12 bg-transparent border-border/50 text-foreground placeholder:text-muted-foreground/50 rounded-lg"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90"
                >
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            )}

            <p className="mt-6 text-sm text-muted-foreground">
              <a href="/auth" className="text-primary hover:underline font-medium">Back to login</a>
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-[hsl(var(--primary)/0.3)] via-[hsl(var(--primary)/0.1)] to-transparent" />
          <div className="absolute bottom-0 left-1/4 w-1/2 h-32 bg-[hsl(var(--primary)/0.4)] blur-3xl rounded-full" />
        </div>

        <div className="relative z-10 px-8 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>All rights reserved, Halal MM 2026</span>
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-foreground">Terms &amp; Conditions</a>
            <a href="/privacy" className="hover:text-foreground">Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
