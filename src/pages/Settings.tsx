import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import MfaSettingsCard from "@/components/auth/MfaSettingsCard";
import SecurityActionsCard from "@/components/auth/SecurityActionsCard";

const Settings = () => {
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      setEmail(session.user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("user_id", session.user.id)
        .single();
      setUsername(profile?.username || "");
      setAvatarUrl(profile?.avatar_url || null);
    };
    load();
  }, []);

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", userId);
    setAvatarUrl(publicUrl + "?t=" + Date.now());
    toast.success("Photo uploaded!");
    setUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);

    // Check username uniqueness
    if (username.trim()) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username.trim())
        .neq("user_id", userId)
        .maybeSingle();
      if (existing) {
        toast.error("Username is already taken");
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim() || null })
      .eq("user_id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated!");
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      toast.error("Enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated!");
      setNewPassword("");
      setCurrentPassword("");
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl">
        <div className="relative mb-7 flex items-center justify-between overflow-hidden rounded-xl pb-5 pt-3">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 app-green-bars opacity-70" />
          <div className="pointer-events-none absolute right-0 top-0 h-44 w-[46%] rounded-full bg-primary/10 blur-3xl" />
          <h1 className="relative text-[32px] font-bold leading-tight text-foreground">Account Settings</h1>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Close
          </Button>
        </div>

        <div className="my-6 border-t border-border" />

        {/* Profile Photo */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profile Photo</h2>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <span className="text-xl text-muted-foreground font-medium">
                  {username ? username.charAt(0).toUpperCase() : "?"}
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadAvatar}
            />
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? "Uploading..." : "Upload new photo"}
            </Button>
          </div>
        </div>

        <div className="my-6 border-t border-border" />

        {/* Profile */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-card border-border/50"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Login email</label>
              <Input
                value={email}
                disabled
                className="bg-card border-border/50 opacity-70"
              />
              <p className="text-xs text-muted-foreground mt-1">
                To use a new address, enter it below, confirm with your current password, then enter the code we email you.
              </p>
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-primary text-primary-foreground font-semibold w-full"
            >
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>

        <div className="my-6 border-t border-border" />

        {/* Change Password */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Change Password</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Current password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-card border-border/50"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">New password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-card border-border/50"
                placeholder="••••••••"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={saving}
              className="bg-primary text-primary-foreground font-semibold w-full"
            >
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </div>

        <div className="my-6 border-t border-border" />

        {/* Two-Factor Authentication */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Security</h2>
          <MfaSettingsCard />
        </div>

        <div className="my-6 border-t border-border" />

        {/* Security Actions */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Security Actions</h2>
          <SecurityActionsCard />
        </div>
      </div>
    </AppLayout>
  );
};

export default Settings;
