import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calendar, Check, LogOut, ShieldCheck, Sparkles, X } from "lucide-react";
import MfaSettingsCard from "@/components/auth/MfaSettingsCard";
import { useAdmin } from "@/hooks/useAdmin";
import { useModerator } from "@/hooks/useModerator";
import { useStaff } from "@/hooks/useStaff";

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[10px] font-medium uppercase tracking-wider text-[#525252] mb-2.5">{children}</h3>
);

const Divider = () => <div className="mt-6 border-t border-[#FFFFFF14] pt-6" />;

const ProfileDialog = ({ open, onOpenChange }: ProfileDialogProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { isModerator } = useModerator();
  const { isStaff } = useStaff();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [memberSince, setMemberSince] = useState<string>("");
  const [memberNumber, setMemberNumber] = useState<string>("");
  const [deals, setDeals] = useState<any[]>([]);
  const [discordIdentity, setDiscordIdentity] = useState<{ username?: string; avatar?: string } | null>(null);
  const [hasPassword, setHasPassword] = useState(false);

  const [confirmTwoStep, setConfirmTwoStep] = useState(true);
  const [threshold, setThreshold] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      setUserId(uid);
      setEmail(session.user.email || "");

      // member number: deterministic 4-digit-ish number from uid
      const n = parseInt(uid.replace(/[^0-9]/g, "").slice(0, 6) || "0", 10) || 0;
      const num = (n % 9000) + 1000;
      setMemberNumber("#" + num.toLocaleString("en-US"));

      const created = new Date(session.user.created_at);
      setMemberSince(created.toLocaleDateString("en-US", { month: "short", year: "numeric" }));

      // discord identity (if linked via supabase auth)
      const identities = (session.user as any).identities || [];
      const dc = identities.find((i: any) => i.provider === "discord");
      if (dc) {
        const data = dc.identity_data || {};
        setDiscordIdentity({ username: data.user_name || data.preferred_username || data.full_name, avatar: data.avatar_url });
      } else {
        setDiscordIdentity(null);
      }

      // has password? Supabase auth users created via OAuth-only have no password
      const amrs = (session.user as any).app_metadata?.providers || [];
      setHasPassword(amrs.includes("email") || !!session.user.email_confirmed_at);

      const [{ data: profile }, { data: dealsData }, { data: prefs }] = await Promise.all([
        supabase.from("profiles").select("username, avatar_url").eq("user_id", uid).maybeSingle(),
        supabase.from("deals").select("amount,status,creator_id,other_user_id").or(`creator_id.eq.${uid},other_user_id.eq.${uid}`),
        supabase.from("user_security_prefs").select("require_confirm_prompt, personal_2fa_threshold_usd" as any).eq("user_id", uid).maybeSingle(),
      ]);
      setUsername(profile?.username || "");
      setAvatarUrl(profile?.avatar_url || null);
      setDeals(dealsData || []);
      const p: any = prefs || {};
      if (typeof p.require_confirm_prompt === "boolean") setConfirmTwoStep(p.require_confirm_prompt);
      if (p.personal_2fa_threshold_usd != null) setThreshold(String(p.personal_2fa_threshold_usd));
      else setThreshold("");
    };
    load();
  }, [open]);

  // ----- profile stats -----
  const completed = deals.filter((d) => d.status === "completed");
  const cancelled = deals.filter((d) => ["cancelled", "refunded"].includes(d.status));
  const sent = deals.filter((d) => d.creator_id === userId);
  const received = deals.filter((d) => d.other_user_id === userId);
  const totalVolume = completed.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const largest = completed.reduce((m, d) => Math.max(m, Number(d.amount) || 0), 0);
  const volumeSent = sent.filter((d) => d.status === "completed").reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const volumeReceived = received.filter((d) => d.status === "completed").reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const completionRate = deals.length ? Math.round((completed.length / deals.length) * 100) : 0;

  const fmtUsd = (n: number) => {
    if (n >= 1000) return "$" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return "$" + Math.round(n).toLocaleString();
  };

  // ----- actions -----
  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("File must be under 2MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", userId);
    setAvatarUrl(publicUrl + "?t=" + Date.now());
    toast.success("Photo uploaded");
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSavingProfile(true);
    if (username.trim()) {
      const { data: existing } = await supabase.from("profiles").select("user_id").eq("username", username.trim()).neq("user_id", userId).maybeSingle();
      if (existing) { toast.error("Username is already taken"); setSavingProfile(false); return; }
    }
    const { error } = await supabase.from("profiles").update({ username: username.trim() || null }).eq("user_id", userId);
    if (error) toast.error(error.message); else toast.success("Profile updated");
    setSavingProfile(false);
  };

  const toggleConfirmTwoStep = async () => {
    if (!userId) return;
    const next = !confirmTwoStep;
    setConfirmTwoStep(next);
    const { error } = await supabase
      .from("user_security_prefs")
      .upsert({ user_id: userId, require_confirm_prompt: next }, { onConflict: "user_id" });
    if (error) { toast.error(error.message); setConfirmTwoStep(!next); }
  };

  const handleSaveThreshold = async () => {
    if (!userId) return;
    setSavingThreshold(true);
    const value = threshold.trim() === "" ? null : Number(threshold);
    if (value != null && (isNaN(value) || value < 0 || value > 10_000_000)) {
      toast.error("Enter a value between 0 and 10,000,000"); setSavingThreshold(false); return;
    }
    const { error } = await supabase
      .from("user_security_prefs")
      .upsert({ user_id: userId, personal_2fa_threshold_usd: value } as any, { onConflict: "user_id" });
    if (error) toast.error(error.message);
    else toast.success(value == null ? "Using site default threshold" : "Threshold saved");
    setSavingThreshold(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); setNewPassword(""); setConfirmPassword(""); setHasPassword(true); }
    setSavingPassword(false);
  };

  const handleLinkDiscord = async () => {
    toast.error("Discord bot is currently down", {
      description: "Linking is temporarily unavailable while our Discord bot is offline for maintenance. Please try again later.",
    });
  };

  const handleUnlinkDiscord = async () => {
    toast.error("Discord bot is currently down", {
      description: "Unlinking is temporarily unavailable while our Discord bot is offline for maintenance. Please try again later.",
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onOpenChange(false);
    navigate("/auth");
  };

  // ----- pieces -----
  const DiscordIcon = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.79 14.79 0 0 0-.694 1.412 18.27 18.27 0 0 0-5.487 0A14.79 14.79 0 0 0 9.683 3 19.79 19.79 0 0 0 5.924 4.369C2.255 9.787 1.279 15.05 1.767 20.23a19.95 19.95 0 0 0 5.998 3.006c.485-.66.916-1.36 1.286-2.094a12.96 12.96 0 0 1-2.027-.97c.17-.124.336-.253.498-.385 3.93 1.79 8.18 1.79 12.06 0 .163.132.33.261.5.385-.65.39-1.33.717-2.029.97.37.734.8 1.434 1.286 2.094a19.93 19.93 0 0 0 6.002-3.006c.57-6.012-.97-11.226-4.023-15.86ZM9.349 16.5c-1.183 0-2.157-1.085-2.157-2.418 0-1.333.957-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.333-.957 2.418-2.157 2.418Zm5.302 0c-1.182 0-2.156-1.085-2.156-2.418 0-1.333.957-2.418 2.156-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.333-.948 2.418-2.157 2.418Z"/>
    </svg>
  );

  const [tab, setTab] = useState<"profile" | "settings">("profile");

  const tabBtn = (id: "profile" | "settings", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={
        "min-w-0 cursor-pointer justify-self-stretch whitespace-nowrap rounded-[7px] px-4 py-1.5 text-center text-[13px] font-medium transition-colors duration-150 " +
        (tab === id
          ? "bg-[#252525] text-[#F0F0F0] hover:bg-[#2e2e2e]"
          : "bg-transparent text-[#6b7280] hover:bg-white/[0.06] hover:text-[#d1d5db]")
      }
    >
      {label}
    </button>
  );

  const StatCard = ({ label, value, title }: { label: string; value: string | number; title?: string }) => (
    <div className="admin-user-profile__stat-card min-w-0 px-2 py-3 text-center rounded-xl border border-[#FFFFFF0F] bg-[#0D0D0D]">
      <div className="text-[10px] font-medium uppercase tracking-wider text-[#525252]" title={label}>{label}</div>
      <div className="mt-1.5 whitespace-nowrap text-lg font-semibold tabular-nums leading-none text-[#F0F0F0] sm:text-xl" title={title}>{value}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(100%,30rem)] min-w-[min(100%,20rem)] max-w-[30rem] bg-[#141414] border border-[#FFFFFF12] text-white p-0 rounded-2xl shadow-xl overflow-hidden [&>button.absolute]:hidden gap-0 flex flex-col"
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5">
            <div className="inline-grid max-w-full gap-1 rounded-[10px] bg-[#0D0D0D] p-1 [grid-template-columns:repeat(2,minmax(min-content,1fr))]">
              {tabBtn("profile", "Profile")}
              {tabBtn("settings", "Settings")}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-[#6b7280] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#e5e7eb] active:bg-white/[0.12]"
              aria-label="Close profile"
            >
              <X className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          </div>

          <h2 className="sr-only">User profile</h2>

          {/* Profile tab */}
          <TabsContent
            value="profile"
            className="dash-account-settings-modal-scroll mt-0 max-h-[min(74vh,600px)] min-h-0 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] px-4 pb-8 pt-2 sm:px-5 sm:pb-10"
          >
            <div className="flex gap-4">
              <div className="relative size-16 shrink-0">
                <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#090909] bg-[#D9D9D9]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xl font-bold text-black">
                      {(username || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-[#090909] bg-[#88FF6A]" title="Online" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-lg font-semibold text-white">
                  <span>{username || "User"}</span>{" "}
                  <span className="text-[11px] font-normal leading-snug text-[#9ca3af] tabular-nums">{memberNumber}</span>
                </p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] leading-snug text-[#9ca3af]">
                  <DiscordIcon className="h-[13px] w-[13px] shrink-0 text-[#5865F2]" />
                  <span className="break-words">@{discordIdentity?.username || username || "user"}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] leading-snug text-[#6b7280]">
                  <Calendar className="h-[11px] w-[11px]" strokeWidth={2} />
                  <span>Member since {memberSince}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-[#FFFFFF14] pt-6">
              <div className="grid w-full grid-cols-3 gap-2.5">
                <StatCard label="Total deals" value={deals.length} />
                <StatCard label="Volume (USD)" value={fmtUsd(totalVolume)} title={`$${totalVolume.toLocaleString()}`} />
                <StatCard label="Largest deal" value={fmtUsd(largest)} title={`$${largest.toLocaleString()}`} />
              </div>
              <div className="mt-2.5 grid w-full grid-cols-2 gap-2.5">
                <StatCard label="Deals sent" value={sent.length} />
                <StatCard label="Volume sent" value={fmtUsd(volumeSent)} title={`$${volumeSent.toLocaleString()}`} />
              </div>
              <div className="mt-2.5 grid w-full grid-cols-2 gap-2.5">
                <StatCard label="Deals received" value={received.length} />
                <StatCard label="Volume received" value={fmtUsd(volumeReceived)} title={`$${volumeReceived.toLocaleString()}`} />
              </div>

              <div className="admin-user-profile__stat-card mt-5 px-3 py-3 sm:mt-6 rounded-xl border border-[#FFFFFF0F] bg-[#0D0D0D]">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-white">Completion rate</div>
                  <span className="tabular-nums text-[10px] font-medium text-[#88FF6A]">{completionRate}%</span>
                </div>
                <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-[#252525]">
                  <div className="absolute top-0 left-0 h-full min-h-2 rounded-full bg-[#88FF6A]" style={{ width: `${completionRate}%` }} />
                </div>
                <div className="mt-2 flex justify-between gap-2 text-[11px] text-[#6b7280]">
                  <span>{completed.length} completed</span>
                  <span>{cancelled.length} cancelled</span>
                </div>
              </div>
            </div>

    {(isAdmin || isModerator || isStaff) && (
              <div className="mt-5 flex flex-col gap-2">
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="h-9 border-[#88FF6A]/40 bg-[#88FF6A]/10 text-[#88FF6A] hover:bg-[#88FF6A]/20 hover:text-[#88FF6A] text-[13px]"
                    onClick={() => { onOpenChange(false); navigate("/admin"); }}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Admin Panel
                  </Button>
                )}
                {isModerator && !isAdmin && (
                  <Button variant="outline" className="h-9 text-[13px]" onClick={() => { onOpenChange(false); navigate("/worker"); }}>
                    Moderator Panel
                  </Button>
                )}
                {isStaff && !isAdmin && (
                  <Button
                    variant="outline"
                    className="h-9 border-violet-400/40 bg-gradient-to-r from-violet-500/15 via-fuchsia-500/15 to-violet-500/15 text-violet-200 hover:from-violet-500/25 hover:via-fuchsia-500/25 hover:to-violet-500/25 hover:text-white text-[13px]"
                    onClick={() => { onOpenChange(false); navigate("/staff"); }}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-2" /> Staff Panel
                  </Button>
                )}
              </div>
            )}

            <div className="mt-3">
              <Button
                variant="outline"
                className="w-full h-9 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-[13px]"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5 mr-2" /> Log out
              </Button>
            </div>
          </TabsContent>

          {/* Settings tab */}
          <TabsContent
            value="settings"
            className="dash-account-settings-modal-scroll mt-0 max-h-[min(74vh,600px)] min-h-0 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] px-4 pb-8 pt-3 sm:px-5 sm:pb-10"
          >
            {/* PROFILE PHOTO */}
            <div>
              <SectionLabel>Profile Photo</SectionLabel>
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-full bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    : <span className="text-lg font-semibold">{(username || "U").charAt(0).toUpperCase()}</span>}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
                <Button
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 text-[13px] border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white px-4"
                >
                  {uploading ? "Uploading..." : "Upload new photo"}
                </Button>
              </div>
            </div>

            <Divider />

            {/* PROFILE */}
            <div>
              <SectionLabel>Profile</SectionLabel>
              <div className="space-y-3">
                <div>
                  <label className="text-[12px] text-white/65 mb-1 block">Username</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={handleSaveProfile}
                    className="bg-black/60 border-white/10 h-10 text-[13px]"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-white/65 mb-1 block">Login email</label>
                  <Input value={email} disabled className="bg-black/60 border-white/10 h-10 text-[13px] opacity-80" />
                  <p className="text-[11px] text-white/45 mt-2 leading-relaxed">
                    Changing your login email requires step-up verification. Set a password in the Password section below and enable two-factor authentication, then you can request a code to a new address.
                  </p>
                </div>
              </div>
              {savingProfile && <p className="text-xs text-white/40 mt-2">Saving…</p>}
            </div>

            <Divider />

            {/* CONFIRM TWO-STEP */}
            <button
              type="button"
              onClick={toggleConfirmTwoStep}
              className="w-full text-left flex items-start gap-3"
            >
              <span
                className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition
                  ${confirmTwoStep ? "bg-[#88FF6A] border-[#88FF6A]" : "bg-transparent border-white/30"}`}
              >
                {confirmTwoStep && <Check className="h-3.5 w-3.5 text-black" strokeWidth={3} />}
              </span>
              <span>
                <span className="block text-white font-medium text-[13px]">Confirm two-step</span>
                <span className="block mt-1 text-[11px] text-white/55 leading-relaxed">
                  When on, important deal actions use a short wait and a second "Are you sure?" before running. Turn off at your own risk.
                </span>
              </span>
            </button>

            <Divider />

            {/* RELEASE 2FA AMOUNT THRESHOLD */}
            <div>
              <SectionLabel>Release 2FA Amount Threshold</SectionLabel>
              <p className="text-[12px] text-white/55 leading-relaxed">
                {threshold === ""
                  ? "You have not set a personal threshold. Authenticator is required when agreed deal size is at or above $250 USD (the site default)."
                  : `Your personal threshold is $${Number(threshold).toLocaleString()} USD.`}
              </p>
              <div className="mt-3">
                <label className="text-[12px] text-white block mb-1">Your threshold (USD)</label>
                <p className="text-[11px] text-white/50 leading-relaxed mb-2">
                  Leave empty and save (with password or authenticator) to drop your personal threshold and use only the site default. When you save a non-empty amount, that USD value is your threshold. Maximum $10,000,000 USD per deal.
                </p>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="bg-black border-white/10 h-10 text-[13px]"
                  placeholder=""
                />
                <p className="text-[11px] text-white/45 mt-2 leading-relaxed">
                  Set a password above or enable two-factor authentication to change this setting.
                </p>
                <Button
                  onClick={handleSaveThreshold}
                  disabled={savingThreshold}
                  className="mt-3 w-full bg-[#7BC95C] hover:bg-[#88FF6A] text-black font-semibold h-10 text-[13px]"
                >
                  {savingThreshold ? "Saving..." : "Save threshold"}
                </Button>
              </div>
            </div>

            <Divider />

            {/* PASSWORD */}
            <div>
              <SectionLabel>Password</SectionLabel>
              <p className="text-[12px] text-white/65 mb-3">
                {hasPassword ? "Update your account password below." : "No password is set on this account yet. Set one now!"}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-[12px] text-white/65 block mb-1">New password</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-black border-white/10 h-10 text-[13px]" />
                </div>
                <div>
                  <label className="text-[12px] text-white/65 block mb-1">Confirm new password</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-black border-white/10 h-10 text-[13px]" />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="w-full bg-[#7BC95C] hover:bg-[#88FF6A] text-black font-semibold h-10 text-[13px]"
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </Button>
              </div>
            </div>

            <Divider />

            {/* DISCORD */}
            <div>
              <SectionLabel>Discord</SectionLabel>
              <p className="text-[12px] text-white/80 leading-relaxed">
                Link your Discord profile to show your Discord name and avatar to other users.
              </p>
              <p className="text-[11px] text-white/55 leading-relaxed mt-2">
                Set a password in the Password section above before you can unlink Discord, so you can still sign in.
              </p>
              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
                    {discordIdentity?.avatar
                      ? <img src={discordIdentity.avatar} alt="" className="h-full w-full object-cover" />
                      : (avatarUrl
                          ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                          : <DiscordIcon className="h-4 w-4 text-[#5865F2]" />)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">{discordIdentity?.username || username || "Not linked"}</p>
                    {discordIdentity?.username && <p className="text-[11px] text-white/55 truncate">@{discordIdentity.username}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={discordIdentity ? () => window.location.reload() : handleLinkDiscord}
                    className="h-9 text-[13px] border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white px-4"
                  >
                    {discordIdentity ? "Refresh" : "Link"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleUnlinkDiscord}
                    disabled={!discordIdentity || !hasPassword}
                    className="h-9 text-[13px] border-white/15 bg-transparent text-white/55 hover:bg-white/10 hover:text-white px-4 disabled:opacity-50"
                  >
                    Unlink
                  </Button>
                </div>
              </div>
            </div>

            <Divider />

            {/* TWO-FACTOR AUTHENTICATION */}
            <div>
              <SectionLabel>Two-Factor Authentication</SectionLabel>
              <p className="text-[12px] text-white/70 mb-3">Use an authenticator app for a second step at sign-in.</p>
              <MfaSettingsCard />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;