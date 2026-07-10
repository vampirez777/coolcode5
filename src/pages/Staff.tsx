import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import MagicInvitesTab from "@/components/admin/MagicInvitesTab";
import { useStaff } from "@/hooks/useStaff";
import { Sparkles, Wand2, ShieldCheck } from "lucide-react";

const Staff = () => {
  const { isStaff, loading } = useStaff();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isStaff) navigate("/dashboard", { replace: true });
  }, [isStaff, loading, navigate]);

  if (loading || !isStaff) return null;

  return (
    <AppLayout>
      <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-violet-500/20 blur-[120px]" />
          <div className="absolute -top-20 right-0 h-[360px] w-[360px] rounded-full bg-fuchsia-500/15 blur-[120px]" />
          <div className="absolute top-40 left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-8 animate-fade-in">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-6 sm:p-8 shadow-[0_10px_40px_-15px_rgba(139,92,246,0.45)]">
            <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
              <div className="absolute inset-x-0 -top-1/2 h-full bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.25),transparent_60%)]" />
            </div>
            <div className="pointer-events-none absolute -top-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-300/60 to-transparent" />

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 blur-md opacity-70 animate-pulse" />
                  <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 ring-1 ring-white/20">
                    <Sparkles className="h-6 w-6 text-white drop-shadow" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                    <ShieldCheck className="h-3 w-3" /> Staff Access
                  </div>
                  <h1 className="mt-2 bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                    Staff Panel
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-white/60">
                    Craft magic invite links that onboard new users in a single click. You only see and manage the invites you've created.
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70 backdrop-blur">
                <Wand2 className="h-3.5 w-3.5 text-violet-300" />
                Magic invites
              </div>
            </div>
          </div>

          {/* Content card */}
          <div className="relative rounded-2xl border border-white/10 bg-[#0b0b0f]/70 p-1 shadow-2xl backdrop-blur">
            <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500/20 via-transparent to-fuchsia-500/20 opacity-60 blur-sm" />
            <div className="relative rounded-[15px] bg-[#0b0b0f]/90 p-4 sm:p-6">
              <MagicInvitesTab />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Staff;
