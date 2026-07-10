import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Volume2, VolumeX } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useModerator } from "@/hooks/useModerator";
import { useStaff } from "@/hooks/useStaff";
import { useCaptchaGate } from "@/hooks/useCaptchaGate";
import ProfileDialog from "@/components/ProfileDialog";

const ALL_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", iconClass: "app-nav-icon--dashboard" },
  { label: "Deals", href: "/deals", iconClass: "app-nav-icon--deals" },
  { label: "Support", href: "/support", iconClass: "app-nav-icon--support" },
];

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [announcementVisible, setAnnouncementVisible] = useState(() => sessionStorage.getItem("dash-announcement-dismissed") !== "1");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isAdmin } = useAdmin();
  const { isModerator } = useModerator();
  const { isStaff } = useStaff();
  const navigate = useNavigate();
  const location = useLocation();
  const { gate: captchaGate } = useCaptchaGate();
  // Dashboard is now available to magic-invite users too.
  const navItems = [
    ...ALL_NAV_ITEMS,
    ...(isStaff ? [{ label: "Staff", href: "/staff", iconClass: "app-nav-icon--staff" }] : []),
  ];
  const logoHref = "/dashboard";

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("user_id", userId)
      .single();
    setUsername(data?.username || data?.display_name || "User");
    setAvatarUrl(data?.avatar_url || null);
    setAvatarFailed(false);
  }, []);

  const loadNotifications = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    const notifs = data || [];
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n: any) => !n.is_read).length);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) navigate("/auth");
      else {
        loadProfile(u.id);
        loadNotifications();
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) navigate("/auth");
      else {
        loadProfile(u.id);
        loadNotifications();
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, loadProfile, loadNotifications]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }, [soundEnabled]);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body?: string) => {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      new Notification(title, {
        body: body || undefined,
        icon: "/images/logo.ico",
      });
    }
  }, []);

  // Realtime notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-realtime-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const notif = payload.new as any;
          setNotifications(prev => [notif, ...prev]);
          setUnreadCount(prev => prev + 1);
          playNotificationSound();
          showBrowserNotification(notif.title, notif.body);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, playNotificationSound, showBrowserNotification]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotifClick = (notif: any) => {
    if (notif.deal_id) {
      navigate(`/deals?deal=${notif.deal_id}`);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  void notifications;
  void unreadCount;
  void markAllRead;
  void handleNotifClick;
  void timeAgo;

  if (!user) return null;

  const profileAvatar = avatarUrl && !avatarFailed ? (
    <img src={avatarUrl} alt="" className="dash-nav__avatar-img" onError={() => setAvatarFailed(true)} />
  ) : (
    <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#090909]">
      {username.charAt(0).toUpperCase()}
    </span>
  );

  void isAdmin; void isModerator;

  return (
    <div className="dashboard-layout dash-layout dash-layout-root">
      {announcementVisible && (
        <div className="relative shrink-0 border-b border-[#1C1C1C] bg-white/[0.05] px-4 py-2.5 pr-12 sm:px-6 sm:pr-14 lg:px-[72.5px] lg:pr-[calc(72.5px+2.25rem)]" role="region" aria-label="Announcement">
          <p className="mx-auto max-w-4xl whitespace-pre-wrap text-center text-sm leading-snug text-[#FFFFFFCC]">Always state deal details and usernames in on-site chat to prevent off-platform scams.</p>
          <button
            type="button"
            className="absolute right-3 top-1/2 z-[1] -translate-y-1/2 rounded p-1 text-[#FFFFFF80] transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#88FF6A66] sm:right-5 lg:right-[72.5px]"
            aria-label="Dismiss announcement"
            onClick={() => {
              sessionStorage.setItem("dash-announcement-dismissed", "1");
              setAnnouncementVisible(false);
            }}
          >
            <span className="block text-base leading-none" aria-hidden="true">×</span>
          </button>
        </div>
      )}
      <header className="dash-nav">
        <nav className="dash-nav__bar" aria-label="Main">
          <Link to={logoHref} className="dash-nav__logo-link">
            <img src="/dash-source/image/image_url__2flogo.webp_w_96_q_75" alt="" className="dash-nav__logo-img" loading="lazy" width="41" height="41" />
            <span className="dash-nav__brand-text">Halal MM</span>
          </Link>
          <div className="dash-nav__desktop-links">
            {navItems.map((item) => {
              const active = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  data-onboarding={item.href === "/support" ? "nav-support" : undefined}
                  className={`dash-nav__desktop-link ${active ? "dash-nav__desktop-link--active" : "dash-nav__desktop-link--inactive"}`}
                >
                  <span className={`inline-block shrink-0 dash-nav-icon app-nav-icon ${item.iconClass}`} aria-hidden="true" />
                  {item.label}
                  {active && <span className="dash-nav__link-indicator" aria-hidden="true" />}
                </Link>
              );
            })}
          </div>

          <div className="dash-nav__right-desktop">
            <div className="dash-nav__social-pair">
              <a href="https://t.me/halal" target="_blank" rel="noopener noreferrer" className="dash-nav__social-link" aria-label="Telegram">
                <img src="/dash-source/image/image_url__2ftelegram.webp_w_48_q_75" alt="" className="dash-nav__social-icon-desktop" />
              </a>
              <a href="https://discord.gg/SBVXrjjrGP" target="_blank" rel="noopener noreferrer" className="dash-nav__social-link" aria-label="Discord">
                <img src="/dash-source/image/image_url__2fdiscord.webp_w_48_q_75" alt="" className="dash-nav__social-icon-desktop" />
              </a>
            </div>
            <button
              type="button"
              className="dash-nav__sound-toggle"
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"}
              title={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"}
              onClick={() => setSoundEnabled((value) => !value)}
            >
              {soundEnabled ? <Volume2 className="dash-nav__sound-toggle-icon" /> : <VolumeX className="dash-nav__sound-toggle-icon" />}
            </button>
            <button type="button" className="dash-nav__settings-trigger dash-nav__nav-profile-btn outline-none" aria-label="Your profile" title="View your profile" data-onboarding="nav-profile" onClick={() => setProfileOpen(true)}>
              <div className="dash-nav__avatar-shell" aria-hidden="true">
                {profileAvatar}
              </div>
              <span className="dash-nav__user-name-desktop">{username}</span>
            </button>
          </div>

          <div className="dash-nav__mobile-bar">
            <div className="dash-nav__mobile-sound">
              <button type="button" className="dash-nav__sound-toggle" aria-pressed={soundEnabled} title={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"} aria-label={soundEnabled ? "Mute notification sounds" : "Unmute notification sounds"} onClick={() => setSoundEnabled((value) => !value)}>
                {soundEnabled ? <Volume2 className="dash-nav__sound-toggle-icon" /> : <VolumeX className="dash-nav__sound-toggle-icon" />}
              </button>
            </div>
            <button type="button" className="dash-nav__mobile-settings-btn outline-none" aria-label="Your profile" title="View your profile" data-onboarding="nav-profile" onClick={() => setProfileOpen(true)}>
              {profileAvatar}
            </button>
            <button type="button" className="dash-nav__menu-toggle" aria-expanded={mobileMenuOpen} aria-controls="dash-nav-mobile-panel" aria-label="Open menu" data-onboarding="nav-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
              <span className="inline-block shrink-0 bg-current dash-nav__menu-icon" style={{ width: 24, height: 24, maskImage: 'url("/icons/nav-menu-hamburger.svg")', maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center" }} aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      {mobileMenuOpen && (
        <div className="dash-nav__mobile-overlay-root" id="dash-nav-mobile-panel">
          <button className="dash-nav__mobile-backdrop" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} />
          <div className="dash-nav-mobile-drawer">
            <div className="dash-nav__drawer-header">
              <span className="dash-nav__drawer-title">Menu</span>
              <button type="button" className="dash-nav__drawer-close-btn" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)}>×</button>
            </div>
            <div className="dash-nav__drawer-links">
              {navItems.map((item) => {
                const active = location.pathname === item.href;
                return (
                  <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)} className={`dash-nav__drawer-link ${active ? "dash-nav__drawer-link--active" : ""}`}>
                    <span className={`app-nav-icon ${item.iconClass}`} aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="dash-nav__drawer-footer">
              <div className="dash-nav__social-pair">
                <a href="https://t.me/halal" target="_blank" rel="noopener noreferrer" className="dash-nav__social-link" aria-label="Telegram"><img src="/dash-source/image/image_url__2ftelegram.webp_w_48_q_75" alt="" className="dash-nav__social-icon-drawer" /></a>
                <a href="https://discord.gg/SBVXrjjrGP" target="_blank" rel="noopener noreferrer" className="dash-nav__social-link" aria-label="Discord"><img src="/dash-source/image/image_url__2fdiscord.webp_w_48_q_75" alt="" className="dash-nav__social-icon-drawer" /></a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dash-scroll">
        <div className="dash-scroll-inner">
          <main className="dash-main">{children}</main>
          <footer aria-label="Legal" className="shrink-0 border-t border-white/10 bg-[var(--color-bg-page)]">
            <div className="flex max-w-full flex-col items-center gap-2 py-2.5 text-center max-[639px]:mx-auto sm:gap-0 sm:py-5 sm:text-left sm:flex-row sm:flex-wrap sm:items-center sm:justify-between px-4 sm:px-6 lg:px-[72.5px]">
              <p className="max-w-full cursor-pointer font-[family-name:var(--font-inter),Inter,sans-serif] text-[13px] font-medium leading-5 tracking-[-0.01em] text-white/50 transition-colors hover:text-white sm:text-base sm:leading-[25px]">All rights reserved, Halal MM 2026</p>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 sm:justify-end">
                <Link className="cursor-pointer font-[family-name:var(--font-inter),Inter,sans-serif] text-[13px] font-medium leading-5 tracking-[-0.01em] text-white/50 transition-colors hover:text-white sm:text-base sm:leading-[25px]" to="/terms">Terms &amp; Conditions</Link>
                <Link className="cursor-pointer font-[family-name:var(--font-inter),Inter,sans-serif] text-[13px] font-medium leading-5 tracking-[-0.01em] text-white/50 transition-colors hover:text-white sm:text-base sm:leading-[25px]" to="/privacy">Privacy Policy</Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
      {captchaGate}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
};

export default AppLayout;
