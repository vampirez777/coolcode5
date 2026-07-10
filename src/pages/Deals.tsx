import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import StatsBar from "@/components/StatsBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EscrowStatus from "@/components/deals/EscrowStatus";
import DisputeButton from "@/components/deals/DisputeButton";
import MessageAttachment from "@/components/deals/MessageAttachment";
import DealStepGuide from "@/components/deals/DealStepGuide";
import DealProgressIndicator from "@/components/deals/DealProgressIndicator";
import CancelDealDialog from "@/components/deals/CancelDealDialog";
import DealFeeAndHoldBanner from "@/components/deals/DealFeeAndHoldBanner";
import DealChatPanel from "@/components/deals/DealChatPanel";
import RoleAssignmentStep from "@/components/deals/RoleAssignmentStep";
import DealDepositPanel from "@/components/deals/DealDepositPanel";
import DealPaymentReceivedPanel from "@/components/deals/DealPaymentReceivedPanel";
import DealDetailsStep from "@/components/deals/DealDetailsStep";
import DealAmountAgreementStep from "@/components/deals/DealAmountAgreementStep";
import { uploadDealAttachment, IMAGE_ACCEPT_ATTR, isAllowedImage } from "@/lib/uploadDealAttachment";
import MfaChallengeDialog from "@/components/auth/MfaChallengeDialog";
import { userHasVerifiedMfa } from "@/lib/mfa";
import { useCaptchaGate } from "@/hooks/useCaptchaGate";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import TermsAcceptDialog from "@/components/legal/TermsAcceptDialog";
import { logToSEvent } from "@/lib/tosLog";
import { fetchGlobalSecuritySetting } from "@/hooks/useGlobalSecuritySettings";
import { hasRecentMagicInviteClaim, isMagicInviteUser } from "@/lib/accessRequest";

const COINS = [
  { name: "Bitcoin", network: "Bitcoin", image: "/dash-source/image/image_url__2fbitcoin.webp_w_256_q_75" },
  { name: "Ethereum", network: "Ethereum", image: "/dash-source/image/image_url__2fethereum.webp_w_256_q_75" },
  { name: "Litecoin", network: "Litecoin", image: "/dash-source/image/image_url__2flitecoin.webp_w_256_q_75" },
  { name: "Solana", network: "Solana", image: "/dash-source/image/image_url__2fsolana.webp_w_256_q_75" },
  { name: "USDC", network: "Solana", image: "/dash-source/image/image_url__2fsolana_usdc.webp_w_256_q_75" },
  { name: "USDT", network: "Solana", image: "/dash-source/image/image_url__2fsolana_usdt.webp_w_256_q_75" },
  { name: "USDC", network: "Ethereum", image: "/dash-source/image/image_url__2fethereum_usdc.webp_w_256_q_75" },
  { name: "USDT", network: "Ethereum", image: "/dash-source/image/image_url__2fethereum_usdt.webp_w_256_q_75" },
  { name: "USDT", network: "BSC", image: "/dash-source/image/image_url__2fbsc_usdt.webp_w_256_q_75" },
];

const HeroBars = () => (
  <div aria-hidden="true" className="absolute inset-0 z-0 flex items-end overflow-hidden">
    {[111, 133.8, 151.6, 202, 151.6, 133.8, 111, 133.8, 151.6, 202, 151.6].map((height, index) => (
      <div key={index} className="dash-hero__bar shrink-0" style={{ "--dash-hero-bar-width": "95.55px", "--dash-hero-bar-height": `${height}px` } as CSSProperties} />
    ))}
  </div>
);

type ProfileSummary = { name: string; avatarUrl: string | null };

const UserAvatar = ({ profile, fallback }: { profile?: ProfileSummary | null; fallback: string }) => {
  const [failed, setFailed] = useState(false);
  const initial = (profile?.name || fallback || "U").charAt(0).toUpperCase();
  return profile?.avatarUrl && !failed ? (
    <img src={profile.avatarUrl} alt="" className="dash-avatar-img" loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <span className="dash-avatar-fallback">{initial}</span>
  );
};

type DealStep = "list" | "select_coin" | "enter_amount" | "select_role" | "select_user" | "details";
type CreatorRole = "buyer" | "seller";

const SYSTEM_MSG_PREFIXES = ["✅", "📦", "🎉", "↩️", "🚫", "⚠️"];
const isSystemMessage = (msg: any) =>
  !msg.attachment_url && typeof msg.message === "string" && SYSTEM_MSG_PREFIXES.some((p) => msg.message.startsWith(p));

const Deals = () => {
  const [deals, setDeals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"open" | "new" | "details">("open");
  const [step, setStep] = useState<DealStep>("list");
  const [selectedCoin, setSelectedCoin] = useState<typeof COINS[0] | null>(null);
  const [currentDealId, setCurrentDealId] = useState<string | null>(null);
  const [currentDeal, setCurrentDeal] = useState<any>(null);
  const [searchUsername, setSearchUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [presetTotalDeals, setPresetTotalDeals] = useState<number | null>(null);
  const [presetTotalUsd, setPresetTotalUsd] = useState<number | null>(null);
  const [presetAvgSeconds, setPresetAvgSeconds] = useState<number | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileSummary>>({});
  const profilesMapRef = useRef<Record<string, ProfileSummary>>({});
  const pendingProfileFetches = useRef<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref to the chat scroll container — used to scroll messages to the
  // bottom without affecting the page scroll position.
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);
  const stepRef = useRef<DealStep>("list");
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isEnabled } = useFeatureFlags();
  const [creatorRole, setCreatorRole] = useState<CreatorRole>("buyer");
  const { runWithCaptcha, gate: captchaGate } = useCaptchaGate();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [tosDialogOpen, setTosDialogOpen] = useState(false);

  // Keep a ref to `step` so realtime handlers can read the latest value
  // without forcing channel re-subscription on every step change.
  useEffect(() => { stepRef.current = step; }, [step]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    if (!isEnabled("create_deals")) return;
    setActiveTab("new");
    setStep("select_coin");
    setSelectedCoin(null);
    setCurrentDealId(null);
    setCurrentDeal(null);
    setChatOpen(false);
  }, [searchParams, isEnabled]);

  useEffect(() => {
    loadDeals();
    // Also listen for auth state changes — important for magic-invite flows
    // where the session is restored AFTER this page mounts. Without this,
    // userId stays empty, no realtime subscription is established, and the
    // deal list stays stale until a manual refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadDeals();
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Keep a ref in sync with profilesMap for use inside getUsername without stale closure
  useEffect(() => {
    profilesMapRef.current = profilesMap;
  }, [profilesMap]);

  // Global realtime: refresh deals list when ANY deal involving this user changes
  // (e.g. someone joins via invite link, status flips, etc.)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`deals-global-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals", filter: `creator_id=eq.${userId}` },
        () => loadDeals()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals", filter: `other_user_id=eq.${userId}` },
        () => loadDeals()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Deep-link: when ?deal=ID is in URL, restore that deal at the right step.
  // Runs whenever the deals list or the URL changes.
  useEffect(() => {
    const dealParam = searchParams.get("deal");
    if (!dealParam) return;
    if (!userId && hasRecentMagicInviteClaim(dealParam)) return;
    if (currentDealId === dealParam) return; // already on it
    const found = deals.find((d) => d.id === dealParam);
    if (found) {
      openDealDetails(found, { skipUrlUpdate: true });
      return;
    }
    // Not in the cached list yet (e.g. magic-invite user just claimed and
    // the row hasn't propagated to the cached query). Fetch it directly so
    // the user lands on the deal immediately instead of staring at the
    // empty deals list.
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("deals")
        .select("*")
        .eq("id", dealParam)
        .maybeSingle();
      if (cancelled || !data) return;
      setDeals((prev) => (prev.some((d) => d.id === data.id) ? prev : [data, ...prev]));
      openDealDetails(data, { skipUrlUpdate: true });
    })();
    return () => { cancelled = true; };
  }, [searchParams, deals, userId]);

  // Realtime chat subscription + presence
  useEffect(() => {
    if (!currentDealId) return;
    loadChatMessages(currentDealId);

    const channel = supabase
      .channel(`deal-chat-user-${currentDealId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deal_messages", filter: `deal_id=eq.${currentDealId}` },
        (payload) => {
          const incoming = payload.new as any;
          setChatMessages(prev => {
            // Skip if we already have it (by id) or if it matches an optimistic temp message
            if (prev.some((m: any) => m.id === incoming.id)) return prev;
            const withoutTemp = prev.filter((m: any) =>
              !(m._optimistic &&
                m.sender_id === incoming.sender_id &&
                (m.message || "") === (incoming.message || "") &&
                (m.attachment_url || null) === (incoming.attachment_url || null))
            );
            return [...withoutTemp, incoming];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deals", filter: `id=eq.${currentDealId}` },
        (payload) => {
          const updated = payload.new as any;
          setCurrentDeal(updated);
          // If a new participant was assigned, fetch their username so the UI doesn't say "Unknown"
          if (updated.other_user_id && !profilesMapRef.current[updated.other_user_id]) {
            fetchAndCacheProfiles([updated.other_user_id]);
          }
          if (updated.creator_id && !profilesMapRef.current[updated.creator_id]) {
            fetchAndCacheProfiles([updated.creator_id]);
          }
          // If the creator was waiting on the "search user" screen and a
          // magic-invite user just joined, jump them straight into the
          // shared deal-details view so both sides see the role
          // assignment step at the same time.
          if (updated.other_user_id && stepRef.current === "select_user") {
            setStep("details");
            setActiveTab("details");
          }
          // Refresh deals list
          loadDeals();
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing: string[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.is_typing && p.user_id !== userId) {
              typing.push(p.display_name || p.user_id.slice(0, 8));
            }
          });
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && userId) {
          const displayName = profilesMap[userId]?.name || "User";
          channel.track({ user_id: userId, display_name: displayName, is_typing: false });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentDealId, userId]);

  // Polling fallback: while a deal is open, refetch the row every 3s so the
  // amount-agreement and role-assignment steps always reflect the other side's
  // latest input even if a realtime event was missed (mobile background tab,
  // dropped websocket, etc.). Cheap single-row query.
  useEffect(() => {
    if (!currentDealId) return;
    let cancelled = false;
    const tick = async () => {
      const { data } = await supabase
        .from("deals")
        .select("*")
        .eq("id", currentDealId)
        .maybeSingle();
      if (cancelled || !data) return;
      setCurrentDeal((prev: any) => {
        if (!prev) return data;
        // Shallow compare a few hot fields to avoid pointless re-renders
        const keys = [
          "status","amount_creator","amount_other",
          "amount_confirmed_by_creator","amount_confirmed_by_other",
          "deal_details_confirmed_by_creator","deal_details_confirmed_by_other",
          "creator_role","other_user_id","cancel_requested_by",
        ];
        const changed = keys.some((k) => prev[k] !== (data as any)[k]);
        return changed ? data : prev;
      });
    };
    const id = window.setInterval(tick, 3000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [currentDealId]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages]);

  const loadDeals = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setUserId(session.user.id);

    const { data } = await supabase
      .from("deals")
      .select("*")
      .or(`creator_id.eq.${session.user.id},other_user_id.eq.${session.user.id}`)
      .order("created_at", { ascending: false });
    setDeals(data || []);

    // Load my own preset stats (set when an admin/staff issued me a magic invite).
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("preset_total_deals, preset_total_usd, preset_avg_deal_seconds")
      .eq("user_id", session.user.id)
      .maybeSingle();
    setPresetTotalDeals((myProfile as any)?.preset_total_deals ?? null);
    setPresetTotalUsd((myProfile as any)?.preset_total_usd ?? null);
    setPresetAvgSeconds((myProfile as any)?.preset_avg_deal_seconds ?? null);

    // Load usernames
    const userIds = new Set<string>();
    (data || []).forEach(d => {
      if (d.creator_id) userIds.add(d.creator_id);
      if (d.other_user_id) userIds.add(d.other_user_id);
    });
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", Array.from(userIds));
      const map: Record<string, ProfileSummary> = {};
      (profiles || []).forEach(p => { map[p.user_id] = { name: p.username || p.display_name || "Unknown", avatarUrl: p.avatar_url || null }; });
      setProfilesMap(map);
    }
  };

  const loadChatMessages = async (dealId: string) => {
    const { data } = await supabase
      .from("deal_messages")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true });
    setChatMessages(data || []);
    // Make sure every sender's username is in the map
    const senderIds = Array.from(new Set((data || []).map((m: any) => m.sender_id))).filter(
      (uid) => uid && !profilesMapRef.current[uid]
    );
    if (senderIds.length > 0) fetchAndCacheProfiles(senderIds);
  };

  // Fetch profiles for the given user ids and merge into profilesMap.
  // Deduplicates in-flight fetches via pendingProfileFetches ref.
  const fetchAndCacheProfiles = useCallback(async (userIds: string[]) => {
    const toFetch = userIds.filter(
      (uid) => uid && !profilesMapRef.current[uid] && !pendingProfileFetches.current.has(uid)
    );
    if (toFetch.length === 0) return;
    toFetch.forEach((uid) => pendingProfileFetches.current.add(uid));
    const { data } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", toFetch);
    const additions: Record<string, ProfileSummary> = {};
    (data || []).forEach((p: any) => {
      additions[p.user_id] = { name: p.username || p.display_name || "Unknown", avatarUrl: p.avatar_url || null };
    });
    if (Object.keys(additions).length > 0) {
      setProfilesMap((prev) => ({ ...prev, ...additions }));
    }
    toFetch.forEach((uid) => pendingProfileFetches.current.delete(uid));
  }, []);

  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !userId) return;
    channelRef.current.track({
      user_id: userId,
      display_name: profilesMap[userId]?.name || "User",
      is_typing: isTyping,
    });
  }, [userId, profilesMap]);

  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !currentDealId || !userId) return;
    const text = chatInput.trim();
    setChatInput("");
    broadcastTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    // Optimistic insert for instant feedback
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    setChatMessages(prev => [...prev, {
      id: tempId,
      _optimistic: true,
      deal_id: currentDealId,
      sender_id: userId,
      message: text,
      created_at: new Date().toISOString(),
    }]);
    const { error } = await supabase.from("deal_messages").insert({
      deal_id: currentDealId,
      sender_id: userId,
      message: text,
    });
    if (error) {
      // Rollback optimistic message on failure
      setChatMessages(prev => prev.filter((m: any) => m.id !== tempId));
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    }
  };

  const uploadAndSendFile = async (file: File) => {
    if (!currentDealId || !userId) return;
    if (!isEnabled("deal_attachments")) {
      toast({
        title: "Attachments disabled",
        description: "File attachments are currently turned off by an administrator.",
        variant: "destructive",
      });
      return;
    }
    if (!isAllowedImage(file)) {
      toast({
        title: "Unsupported file",
        description: "Only images (PNG, JPEG, WEBP, GIF, HEIC) are allowed.",
        variant: "destructive",
      });
      return;
    }
    setUploadingFile(true);
    try {
      const { path, type, name } = await uploadDealAttachment(file, currentDealId, userId);
      const { error } = await supabase.from("deal_messages").insert({
        deal_id: currentDealId,
        sender_id: userId,
        message: "",
        attachment_url: path,
        attachment_type: type,
        attachment_name: name,
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadAndSendFile(file);
  };

  const handleChatPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await uploadAndSendFile(file);
          return;
        }
      }
    }
  };

  const completedDeals = deals.filter(d => d.status === "completed");
  const openDeals = deals.filter(d => !["completed", "cancelled"].includes(d.status));
  const totalValue = completedDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const [confirmingItem, setConfirmingItem] = useState(false);
  const [releaseMfaOpen, setReleaseMfaOpen] = useState(false);

  const performRelease = async () => {
    if (!currentDealId) return;
    setConfirmingItem(true);
    await supabase.from("deals").update({
      status: "item_delivered",
      item_delivered_at: new Date().toISOString(),
    }).eq("id", currentDealId);
    toast({ title: "Item confirmed!", description: "Funds are being released to the seller — you'll see a chat update once it's done." });
    setCurrentDeal((prev: any) => prev ? { ...prev, status: "item_delivered", item_delivered_at: new Date().toISOString() } : prev);
    loadDeals();
    setConfirmingItem(false);
  };

  const handleConfirmItemReceived = async () => {
    if (!currentDealId) return;
    // Require fresh 2FA challenge if user has it enabled
    const hasMfa = await userHasVerifiedMfa();
    if (hasMfa) {
      setReleaseMfaOpen(true);
      return;
    }
    await performRelease();
  };

  const handleMarkDepositSent = () => {
    if (!currentDealId) return;
    runWithCaptcha(
      async () => {
        setConfirmingItem(true);
        const { error } = await supabase
          .from("deals")
          .update({ status: "deposit_pending" })
          .eq("id", currentDealId);
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Thanks!", description: "We're verifying your deposit on-chain. You'll get a chat update once it's confirmed." });
          setCurrentDeal((prev: any) => prev ? { ...prev, status: "deposit_pending" } : prev);
          loadDeals();
        }
        setConfirmingItem(false);
      },
      { reason: "reporting your deposit", title: "Confirm deposit submission" }
    );
  };

  const handleMarkItemDelivered = async () => {
    if (!currentDealId || !userId) return;
    // Seller posts a chat message — does not change escrow status (buyer still confirms).
    await supabase.from("deal_messages").insert({
      deal_id: currentDealId,
      sender_id: userId,
      message: "📦 I've delivered the item. Please confirm receipt to release funds.",
    });
    toast({ title: "Buyer notified", description: "They'll confirm receipt to release funds." });
  };

  const handleNewDeal = () => {
    if (!isEnabled("create_deals")) {
      toast({
        title: "Feature disabled",
        description: "Creating new deals is currently turned off by an administrator.",
        variant: "destructive",
      });
      return;
    }
    setActiveTab("new");
    setStep("select_coin");
    setSelectedCoin(null);
    setCurrentDealId(null);
    setCurrentDeal(null);
    setChatOpen(false);
    setSearchParams({}, { replace: true });
  };

  const handleSelectCoin = (coin: typeof COINS[0]) => setSelectedCoin(coin);

  const [dealAmount, setDealAmount] = useState("");

  const handleCoinContinue = () => {
    if (!selectedCoin) return;
    // Amount is now agreed by both parties later (mutual confirmation in the
    // deal details), so skip the amount step entirely and proceed to ToS / user search.
    handleRoleContinue();
  };

  const handleAmountContinue = async () => {
    const amount = parseFloat(dealAmount);
    if (!amount || amount < 4) {
      toast({ title: "Invalid amount", description: "Minimum deal amount is $4.00 USD.", variant: "destructive" });
      return;
    }
    if (!selectedCoin) return;
    // Role is now decided mutually after the second user joins, via the
    // RoleAssignmentStep component. Skip the legacy buyer/seller picker
    // and go straight to ToS / deal creation.
    handleRoleContinue();
  };

  const proceedWithDealCreation = () => {
    if (!selectedCoin) return;
    runWithCaptcha(
      async () => {
        const { data, error } = await supabase
          .from("deals")
          .insert({
            creator_id: userId,
            coin: selectedCoin.name,
            coin_network: selectedCoin.network,
            status: "select_user",
            creator_role: creatorRole,
          } as any)
          .select()
          .single();
        if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
        setCurrentDealId(data.id);
        setCurrentDeal(data);
        setSearchParams({ deal: data.id }, { replace: true });
        setStep("select_user");
        setDealAmount("");
        loadDeals();
      },
      { reason: "creating a deal", title: "Confirm deal creation" }
    );
  };

  const handleRoleContinue = async () => {
    if (!selectedCoin) return;
    // Admins can disable the ToS popup globally for deal creation.
    const tosRequired = await fetchGlobalSecuritySetting("deal_create_tos_required");
    if (!tosRequired) {
      // Auto-log an "accepted" record so the audit trail still has an entry.
      await logToSEvent({
        context: "deal_create",
        accepted: true,
        userId,
        metadata: {
          coin: selectedCoin?.name,
          network: selectedCoin?.network,
          amount: null,
          tos_globally_disabled: true,
        },
      });
      proceedWithDealCreation();
      return;
    }
    setTosDialogOpen(true);
  };

  const handleTosAccept = async () => {
    setTosDialogOpen(false);
    await logToSEvent({
      context: "deal_create",
      accepted: true,
      userId,
      metadata: {
        coin: selectedCoin?.name,
        network: selectedCoin?.network,
        amount: null,
      },
    });
    proceedWithDealCreation();
  };

  const handleTosCancel = async () => {
    setTosDialogOpen(false);
    await logToSEvent({
      context: "deal_create",
      accepted: false,
      attemptedWithoutAccept: true,
      userId,
      metadata: {
        coin: selectedCoin?.name,
        network: selectedCoin?.network,
        amount: null,
      },
    });
    toast({
      title: "Deal not created",
      description: "You must accept the Terms of Service to open a deal.",
      variant: "destructive",
    });
  };

  const handleCancelDeal = () => {
    if (!currentDealId) return;
    setCancelDialogOpen(true);
  };

  const exitToList = () => {
    setStep("list");
    setActiveTab("open");
    setCurrentDealId(null);
    setCurrentDeal(null);
    setChatOpen(false);
    setSearchParams({}, { replace: true });
    loadDeals();
  };

  // Submit a cancellation request (or instant-cancel if no other party yet).
  const handleRequestCancellation = async () => {
    if (!currentDealId || !currentDeal) return;
    // No other party yet — cancel immediately (draft).
    if (!currentDeal.other_user_id) {
      const { error } = await supabase.from("deals").update({ status: "cancelled" }).eq("id", currentDealId);
      if (error) {
        toast({ title: "Couldn't cancel", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Deal cancelled" });
      exitToList();
      return;
    }
    const { error } = await supabase
      .from("deals")
      .update({ cancel_requested_by: userId, cancel_requested_at: new Date().toISOString() })
      .eq("id", currentDealId);
    if (error) {
      toast({ title: "Couldn't request cancellation", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cancellation requested", description: "The other party has been notified." });
  };

  // Approve the other party's cancellation request — actually cancels the deal.
  const handleApproveCancellation = async () => {
    if (!currentDealId || !currentDeal) return;
    // If no request exists and no other party, this is the instant-cancel path.
    if (!currentDeal.other_user_id) {
      const { error } = await supabase.from("deals").update({ status: "cancelled" }).eq("id", currentDealId);
      if (error) {
        toast({ title: "Couldn't cancel", description: error.message, variant: "destructive" });
        return;
      }
      exitToList();
      return;
    }
    if (!currentDeal.cancel_requested_by || currentDeal.cancel_requested_by === userId) {
      toast({ title: "Nothing to approve", description: "No pending cancellation request from the other party.", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("deals")
      .update({ status: "cancelled" })
      .eq("id", currentDealId);
    if (error) {
      toast({ title: "Couldn't cancel", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deal cancelled", description: "Both parties agreed — the deal is now closed." });
    exitToList();
  };

  // Decline the other party's request OR withdraw your own request.
  const handleDeclineCancellation = async () => {
    if (!currentDealId) return;
    const { error } = await supabase
      .from("deals")
      .update({ cancel_requested_by: null, cancel_requested_at: null })
      .eq("id", currentDealId);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cancellation declined", description: "The deal stays active." });
  };

  const handleSearchUser = async () => {
    if (!searchUsername.trim()) return;
    const { data } = await (supabase as any).rpc("find_profile_for_invite", {
      _username: searchUsername.trim(),
    });
    const matches = Array.isArray(data) ? data.filter((profile) => profile.user_id !== userId) : [];

    if (matches.length > 0) {
      const found = matches[0];
      
      const { data: updated, error: updErr } = await (supabase as any).rpc("assign_deal_counterparty", {
        _deal_id: currentDealId,
        _other_user_id: found.user_id,
      });

      if (updErr || !updated) {
        toast({ title: "Error", description: updErr?.message || "Failed to add user", variant: "destructive" });
        return;
      }

      // Optimistically add the new user's profile to the map so labels render correctly
      setProfilesMap(prev => ({
        ...prev,
        [found.user_id]: { name: found.username || found.display_name || "Unknown", avatarUrl: found.avatar_url || null },
      }));

      // Stay at select_user until both sides confirm roles via RoleAssignmentStep.
      // The DB trigger will flip to awaiting_deposit once they do.
      setCurrentDeal(updated);
      setStep("details");
      setActiveTab("details");
      toast({ title: "User added!", description: `Added ${found.username || found.display_name}. Confirm your roles to continue.` });
      loadDeals();
    } else {
      toast({ title: "Not found", description: "No user found with that username.", variant: "destructive" });
    }
  };

  const openDealDetails = (deal: any, opts?: { skipUrlUpdate?: boolean }) => {
    setCurrentDealId(deal.id);
    setCurrentDeal(deal);
    setChatOpen(false);
    if (!opts?.skipUrlUpdate) setSearchParams({ deal: deal.id }, { replace: true });
    // The "select_user" sub-step is the *search bar* UI for finding the
    // second participant. Once `other_user_id` exists (e.g. a magic-invite
    // user has joined), both parties should land directly on the deal
    // details view (which renders the role-assignment step until the DB
    // trigger flips the deal to awaiting_deposit).
    if (deal.status === "select_user" && !deal.other_user_id) {
      setStep("select_user");
      setActiveTab("new");
    } else {
      setStep("details");
      setActiveTab("details");
    }
  };

  const getUsername = (uid: string) => {
    if (!uid) return "Unknown";
    const cached = profilesMap[uid];
    if (cached) return cached.name;
    // Lazy-fetch missing profile (fire and forget — state update will re-render)
    fetchAndCacheProfiles([uid]);
    return "Loading…";
  };

  const getProfile = (uid?: string | null) => uid ? profilesMap[uid] || null : null;

  // Find coin metadata (for sidebar/list icon rendering) by coin name + network
  const findCoinMeta = (name?: string | null, network?: string | null) => {
    if (!name) return null;
    return COINS.find(c => c.name === name && (!network || c.network === network)) ||
           COINS.find(c => c.name === name) || null;
  };

  const [dealChatOpen, setDealChatOpen] = useState(false);

  // Sidebar: persistent Open Deals list shown on the left during the creation flow.
  // Highlights the deal currently being edited.
  const CreationSidebar = () => (
    <div className="deals-split-col deals-stacked-panel">
      <div className="deals-table__panel deals-table__panel-layout deals-table__panel--custom-radius" style={{ "--deals-table-radius": "12px" } as CSSProperties}>
        <div className="deals-table__title-row deals-table__title-bar--fixed" style={{ "--deals-title-bar-height": "61px" } as CSSProperties}>
          <div className="deals-table__title-heading"><h2 className="deals-table__title deals-table__title--white">Open Deals <span className="deals-table__title-count">({openDeals.length})</span></h2></div>
          <div className="deals-table__title-right-cluster"><p className="deals-table__select-hint deals-table__select-hint--muted">Select an open deal to continue</p></div>
        </div>
        <div className="deals-table__body-outer"><div className="deals-table__body-scroll deals-table__scroll--default-pad">
        <table className="deals-table__table deals-table__table-wrap">
          <thead>
            <tr className="deals-table__thead-row">
              <th className="deals-table__th deals-table__th--left deals-table__th--tl deals-table__th--involved-users"><span className="deals-table__involved-heading deals-table__involved-heading--wide">Involved User(s)</span><span className="deals-table__involved-heading deals-table__involved-heading--narrow">Other Party</span></th>
              <th className="deals-table__th deals-table__th--center">Coin</th>
              <th className="deals-table__th deals-table__th--left">Amount</th>
              <th className="deals-table__th deals-table__th--left deals-table__th--tr">Status</th>
            </tr>
          </thead>
          <tbody>
            {openDeals.length === 0 ? (
              <tr className="deals-table__tbody-empty"><td colSpan={4} className="deals-table__empty-td">No deals yet.</td></tr>
            ) : openDeals.map(d => {
              const meta = findCoinMeta(d.coin, d.coin_network);
              const other = d.creator_id === userId ? d.other_user_id : d.creator_id;
              const otherName = other ? getUsername(other) : "Unknown";
              const isActive = d.id === currentDealId;
              const statusLabel = d.status === "select_user" ? (d.other_user_id ? "Roles" : "Select User") : d.status.replace(/_/g, " ");
              return (
                <tr
                  key={d.id}
                  onClick={() => openDealDetails(d)}
                  className={`deals-table__data-row deals-table-row-unread deals-table__row--selectable ${isActive ? "deals-row-active" : ""}`}
                >
                  <td className="deals-table__td deals-table__cell-pad deals-table__td--involved-users">
                    <div className="deals-table__users-compact-other"><span className="deals-table__user-cell"><div className="deals-table__user-avatar"><UserAvatar profile={getProfile(other)} fallback={otherName} /></div><span className="deals-table__user-name-truncate">{otherName}</span></span></div>
                  </td>
                  <td className="deals-table__td deals-table__cell-pad"><div className="deals-table__cell-text deals-table__cell-inner deals-table__cell-inner--center">
                    {meta ? <div className="deals-table__coin deals-table__coin-wrap"><span className="deals-table__coin-inner deals-table__coin-inner-flex"><img src={meta.image} alt={meta.name} className="deals-table__coin-img object-contain" /></span></div> : "-"}
                  </div>
                  </td>
                  <td className="deals-table__td deals-table__cell-pad"><span className="deals-table__cell-text">{d.amount ? `$${d.amount}` : "-"}</span></td>
                  <td className="deals-table__td deals-table__cell-pad"><span className="deals-table__cell-text deals-table__amount-truncate">{statusLabel}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div></div>
        <div className="deals-table__footer-bar">
          Create another deal? <button type="button" onClick={handleNewDeal} className="deals-table__load-more deals-table__load-more--button">Click here</button>
        </div>
      </div>
      {currentDealId && (
      <div className="deals-live-chat-mount deals-live-chat-mount--wide">
        <button
          type="button"
          onClick={() => setDealChatOpen(v => !v)}
          className="deals-chat-toggle-btn"
        >
          <MessageCircle className="h-4 w-4 text-primary" />
          {dealChatOpen ? "Close Chat" : "Open Chat"}
        </button>
      </div>
      )}
    </div>
  );

  const CoinTile = ({ coin, active = false, onClick }: { coin: typeof COINS[0]; active?: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={`deals-coin-tile-btn ${active ? "deals-coin-tile-btn--selected" : ""}`} type="button">
      <div className="deals-coin-icon-cell"><img src={coin.image} alt="" className="coin-icon__img object-contain" width="67" height="67" loading="lazy" /></div>
      <div className="deals-coin-tile-labels"><span className="deals-coin-name">{coin.name}</span>{coin.network !== coin.name && <span className="deals-coin-network">{coin.network}</span>}</div>
    </button>
  );

  const DealHeaderBar = () => (
    <div className="deal-step-panel__header">
      <div className="flex min-w-0 items-center gap-2">
        {currentDealId && <p className="deal-step-panel__deal-number">Deal #{currentDealId.slice(0, 8)}</p>}
      </div>
      <button type="button" className="deal-step-panel__back" onClick={handleCancelDeal}>Cancel deal</button>
    </div>
  );

  return (
    <AppLayout>
      {captchaGate}
      <TermsAcceptDialog
        open={tosDialogOpen}
        context="deal_create"
        onAccept={handleTosAccept}
        onCancel={handleTosCancel}
      />
      <div className="deals-page-stack">
        <div className="relative flex min-w-0 w-full flex-col gap-8">
          <HeroBars />
          <div className="relative z-10 flex min-w-0 w-full flex-col gap-8">
            <div className="grid min-w-0 w-full gap-4 grid-cols-1">
              <div className="min-w-0 justify-self-stretch"><div><h1 className="dash-header__title text-[22px] font-semibold leading-tight tracking-[-0.02em] text-white lg:text-[25px] lg:leading-[20px]">Your Current Deals</h1><p className="dash-header__subtitle mt-[16px] text-[17px] font-medium leading-[20px] tracking-normal text-[#FFFFFF99]">Monitor your current deals and their status.</p></div></div>
            </div>

            <StatsBar
              totalCompleted={(presetTotalDeals ?? 0) + completedDeals.length}
              totalValue={(Number(presetTotalUsd) || 0) + totalValue}
              avgDealLength={presetAvgSeconds != null ? `${(presetAvgSeconds / 60).toFixed(1)} min` : "-"}
              ctaCard={
                <>
                  <div><h3 className="deals-support-panel__title">Make a support request</h3><p className="deals-support-panel__desc mt-0.5">Having trouble? Contact our staff</p><p className="mt-2 text-xs font-medium text-[#0a0a0a]/75">Open or select a deal on the Deals page before creating a support ticket.</p></div>
                  <button onClick={() => { window.location.href = "/support"; }} className="deals-support-panel__cta inline-flex items-center justify-center gap-2 rounded-lg text-white cursor-pointer hover:opacity-90" type="button">Make Request <img alt="" className="shrink-0" height="12" src="/dash-source/image/ui_arrow_external_up_right.svg" width="12" /></button>
                </>
              }
            />
          </div>
        </div>

        <div aria-hidden="true" className="dash-hairline-divider" />

      {/* Side-by-side: Open Deals + Coin selector (matches reference) */}
      {step === "list" && (
        <div className="deals-page-workspace">
          <div className="deals-page-main-grid">
            <div aria-label="Deals workspace" className="deals-stacked-tablist" role="tablist">
              <button aria-selected="true" className="deals-stacked-tab" id="deals-tab-open-list" role="tab" type="button">Open deals <span className="deals-stacked-tab__count">{openDeals.length}</span></button>
              <button aria-selected="false" className="deals-stacked-tab" id="deals-tab-deal-detail" role="tab" type="button" onClick={handleNewDeal}>New deal</button>
            </div>
            <div className="deals-split-col deals-stacked-panel">
              <div className="deals-table__panel deals-table__panel-layout deals-table__panel--custom-radius" style={{ "--deals-table-radius": "12px" } as CSSProperties}>
                <div className="deals-table__title-row deals-table__title-bar--fixed" style={{ "--deals-title-bar-height": "61px" } as CSSProperties}><div className="deals-table__title-heading"><h2 className="deals-table__title deals-table__title--white">Open Deals <span className="deals-table__title-count">({openDeals.length})</span></h2></div><div className="deals-table__title-right-cluster"><p className="deals-table__select-hint deals-table__select-hint--muted">Select an open deal to continue</p></div></div>
                <div className="deals-table__body-outer"><div className="deals-table__body-scroll deals-table__scroll--default-pad">
            <table className="deals-table__table deals-table__table-wrap">
              <thead>
                <tr className="deals-table__thead-row">
                  <th className="deals-table__th deals-table__th--left deals-table__th--tl deals-table__th--involved-users"><span className="deals-table__involved-heading deals-table__involved-heading--wide">Involved User(s)</span><span className="deals-table__involved-heading deals-table__involved-heading--narrow">Other Party</span></th>
                  <th className="deals-table__th deals-table__th--center">Coin</th>
                  <th className="deals-table__th deals-table__th--left">Amount</th>
                  <th className="deals-table__th deals-table__th--left deals-table__th--tr">Status</th>
                </tr>
              </thead>
              <tbody>
                {openDeals.length === 0 ? (
                  <tr className="deals-table__tbody-empty"><td colSpan={4} className="deals-table__empty-td">No deals yet.</td></tr>
                ) : openDeals.map(deal => (
                  <tr key={deal.id} className="deals-table__data-row deals-table-row-unread deals-table__row--selectable" onClick={() => openDealDetails(deal)} role="button" tabIndex={0}>
                    <td className="deals-table__td deals-table__cell-pad deals-table__td--involved-users"><div className="deals-table__users-compact-other"><span className="deals-table__user-cell"><div className="deals-table__user-avatar"><UserAvatar profile={getProfile(deal.creator_id === userId ? deal.other_user_id || "" : deal.creator_id)} fallback={getUsername(deal.creator_id === userId ? deal.other_user_id || "" : deal.creator_id)} /></div><span className="deals-table__user-name-truncate">{getUsername(deal.creator_id === userId ? deal.other_user_id || "" : deal.creator_id)}</span></span></div></td>
                    <td className="deals-table__td deals-table__cell-pad"><div className="deals-table__cell-text deals-table__cell-inner deals-table__cell-inner--center">{findCoinMeta(deal.coin, deal.coin_network) ? <div className="deals-table__coin deals-table__coin-wrap"><span className="deals-table__coin-inner deals-table__coin-inner-flex"><img src={findCoinMeta(deal.coin, deal.coin_network)!.image} alt={deal.coin || "Coin"} className="deals-table__coin-img object-contain" /></span></div> : deal.coin || "-"}</div></td>
                    <td className="deals-table__td deals-table__cell-pad"><span className="deals-table__cell-text">{deal.amount ? `$${deal.amount}` : "-"}</span></td>
                    <td className="deals-table__td deals-table__cell-pad"><span className="deals-table__cell-text deals-table__amount-truncate">{deal.status.replace(/_/g, " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
                </div></div>
                <div className="deals-table__footer-bar">Create another deal? <button className="deals-table__load-more deals-table__load-more--button" type="button" onClick={handleNewDeal}>Click here</button></div>
              </div>
              <div className="deals-live-chat-mount deals-live-chat-mount--wide" />
            </div>

          {/* Right: Coin selector (always visible) */}
          <div className="deals-detail-shell deals-stacked-panel">
            <div className="deals-detail-body"><div className="deal-flow-step-frame flex min-h-0 flex-1 flex-col" data-deal-flow-step="1-crypto"><div className="deal-step-panel"><div className="deal-step-panel__header"><div className="flex items-center gap-2" /><p className="deal-step-panel__label">Select a coin to create a new deal</p></div><div aria-hidden="true" className="deal-step-panel__divider" /><div className="flex min-h-0 flex-1 flex-col"><div className="deal-step-panel__scroll min-h-0 flex-1 overflow-y-auto pb-4"><div className="p-[30px]"><h2 className="dash-step__title text-white">Select desired cryptocurrency</h2><p className="dash-step__subtitle mt-3">Choose from the options below</p>
            <div className="deals-coin-picker-body"><div className="deals-coin-picker-grid">
              {COINS.map((coin, i) => (
                <CoinTile
                  key={i}
                  coin={coin}
                  onClick={() => {
                    if (!isEnabled("create_deals")) {
                      toast({ title: "Feature disabled", description: "Creating new deals is currently turned off by an administrator.", variant: "destructive" });
                      return;
                    }
                    setSelectedCoin(coin);
                    setActiveTab("new");
                    setStep("select_coin");
                  }}
                />
              ))}
            </div></div>
            </div></div><div className="deal-step-panel__footer shrink-0 border-t border-white/10 bg-[var(--color-bg-panel)] px-4 py-3 sm:p-[30px]"><div className="deal-step-panel__footer-back" /><div className="deal-step-panel__footer-continue"><button className="deal-step-panel__continue cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" type="button" onClick={handleCoinContinue} disabled={!selectedCoin}>Continue</button></div></div></div></div></div></div>
          </div>
          </div>
        </div>
      )}

      {/* Coin selection (standalone step) */}
      {activeTab === "new" && step === "select_coin" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <CreationSidebar />
          <div className="app-cloned-card flex flex-col">
            {currentDealId && <DealHeaderBar />}
            <div className="p-6">
              <h2 className="app-cloned-section-title">Select desired cryptocurrency</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Choose from the options below</p>
              <div className="app-coin-grid mt-6">
                {COINS.map((coin, i) => {
                  const active = selectedCoin === coin;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectCoin(coin)}
                      className={`app-coin-button flex flex-col items-center justify-center gap-2 p-4 transition-all ${
                        active ? "app-coin-button--active" : ""
                      }`}
                    >
                      <img src={coin.image} alt={coin.name} className="app-coin-img" />
                      <span className="mt-1 text-sm font-semibold text-foreground">{coin.name}</span>
                      {coin.network !== coin.name && <span className="text-xs font-medium text-muted-foreground">{coin.network}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between gap-4 border-t border-border/40 px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Minimum deal amount: <span className="font-semibold text-primary">$4.00 USD</span> for this asset.
              </p>
              <Button
                onClick={handleCoinContinue}
                disabled={!selectedCoin}
                className="app-cloned-btn-primary px-6 py-2 text-sm disabled:opacity-40"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enter amount */}
      {activeTab === "new" && step === "enter_amount" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <CreationSidebar />
          <div className="app-cloned-card flex flex-col">
            {currentDealId && <DealHeaderBar />}
            <div className="p-6">
              <h2 className="text-[22px] font-bold tracking-tight text-foreground">Enter deal amount</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Minimum deal amount: <span className="font-semibold text-primary">$4.00 USD</span>
              </p>
              <div className="mt-8 mx-auto max-w-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="4"
                    step="0.01"
                    value={dealAmount}
                    onChange={(e) => setDealAmount(e.target.value)}
                    placeholder="0.00"
                    className="app-cloned-input h-12 text-lg"
                    onKeyDown={(e) => e.key === "Enter" && handleAmountContinue()}
                  />
                  <span className="text-sm text-muted-foreground">USD</span>
                </div>
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between gap-4 border-t border-border/40 px-6 py-4">
              <Button variant="outline" className="rounded-lg" onClick={() => setStep("select_coin")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleAmountContinue}
                className="app-cloned-btn-primary px-6 py-2 text-sm"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add the other user */}
      {step === "select_user" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <CreationSidebar />
          <div className="app-cloned-card flex flex-col">
            <DealHeaderBar />
            <div className="p-6">
              <h2 className="text-[22px] font-bold tracking-tight text-foreground">Add the other user</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Search their username to add</p>
              <div className="mt-10 flex gap-3 max-w-2xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    placeholder="Search username.."
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    className="app-cloned-input h-12 pl-10 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                  />
                </div>
                <Button onClick={handleSearchUser} className="app-cloned-btn-primary h-12 px-8 text-sm">
                  Search
                </Button>
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between gap-4 border-t border-border/40 px-6 py-4">
              <Button
                variant="outline"
                className="rounded-lg"
                onClick={() => { setStep("list"); setActiveTab("open"); setCurrentDealId(null); setCurrentDeal(null); setChatOpen(false); setSearchParams({}, { replace: true }); }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">!</span>
                If you can't find the user, use this invite link{" "}
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/auth?invite=${currentDealId}`;
                    navigator.clipboard.writeText(link);
                    toast({ title: "Invite link copied!", description: link });
                  }}
                  className="text-foreground underline hover:text-primary"
                >
                  here
                </button>.
              </p>
              <Button className="app-cloned-btn-primary px-6 py-2 text-sm">
                Continue
              </Button>
            </div>
          </div>

          {dealChatOpen && (
            <div className="md:col-span-2">
              <DealChatPanel
                messages={chatMessages}
                userId={userId}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSend={sendMessage}
                onPaste={handleChatPaste}
                onFileSelected={handleFileSelected}
                uploadingFile={uploadingFile}
                typingUsers={typingUsers}
                getUsername={getUsername}
                scrollRef={chatScrollRef}
                dealCreatedAt={currentDeal?.created_at}
                height="h-72"
              />
            </div>
          )}
        </div>
      )}

      {/* Deal details with chat */}
      {step === "details" && currentDeal && (
        (() => {
          const isRoleStep =
            currentDeal.other_user_id &&
            ["select_user", "pending"].includes(currentDeal.status);
          const detailsBothConfirmed =
            !!currentDeal.deal_details_confirmed_by_creator &&
            !!currentDeal.deal_details_confirmed_by_other;
          const isDetailsStep =
            !isRoleStep &&
            currentDeal.other_user_id &&
            ["awaiting_deposit"].includes(currentDeal.status) &&
            !detailsBothConfirmed;
          const amountBothConfirmed =
            !!currentDeal.amount_confirmed_by_creator &&
            !!currentDeal.amount_confirmed_by_other &&
            currentDeal.amount_creator != null &&
            currentDeal.amount_other != null &&
            Number(currentDeal.amount_creator) === Number(currentDeal.amount_other);
          const isAmountStep =
            !isRoleStep &&
            !isDetailsStep &&
            currentDeal.other_user_id &&
            currentDeal.status === "awaiting_deposit" &&
            !amountBothConfirmed;
          const isDepositStep =
            ["awaiting_deposit", "deposit_pending"].includes(currentDeal.status) &&
            !isDetailsStep &&
            !isAmountStep;
          const isPaymentReceivedStep = ["deposited", "item_delivered"].includes(currentDeal.status);
          const creatorRoleVal = (currentDeal.creator_role || "buyer") as "buyer" | "seller";
          const isCreator = currentDeal.creator_id === userId;
          const isBuyer = (isCreator && creatorRoleVal === "buyer") || (!isCreator && creatorRoleVal === "seller");
          const meta = findCoinMeta(currentDeal.coin, currentDeal.coin_network);
          const otherId = isCreator ? currentDeal.other_user_id : currentDeal.creator_id;
          const otherName = otherId ? getUsername(otherId) : "Counterparty";
          const senderName = isBuyer ? "Me" : otherName;
          const receiverName = isBuyer ? otherName : "Me";
          return (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              {/* Left: Live Chat */}
              <DealChatPanel
                messages={chatMessages}
                userId={userId}
                chatInput={chatInput}
                setChatInput={setChatInput}
                onSend={sendMessage}
                onPaste={handleChatPaste}
                onChange={handleChatInputChange}
                onFileSelected={handleFileSelected}
                uploadingFile={uploadingFile}
                typingUsers={typingUsers}
                getUsername={getUsername}
                scrollRef={chatScrollRef}
                dealCreatedAt={currentDeal.created_at}
                onBack={isMagicInviteUser() ? undefined : exitToList}
                height="h-[34rem]"
              />

              {/* Right: Deal pane */}
              <div className="app-cloned-card flex flex-col">
                <DealHeaderBar />
                <div className="flex-1 min-h-0 flex flex-col p-6">
                  {isRoleStep ? (
                    <RoleAssignmentStep
                      dealId={currentDeal.id}
                      userId={userId}
                      creatorId={currentDeal.creator_id}
                      otherUserId={currentDeal.other_user_id}
                      getUsername={getUsername}
                    />
                  ) : isDetailsStep ? (
                    <DealDetailsStep
                      deal={currentDeal}
                      userId={userId}
                      getUsername={getUsername}
                      onBack={isMagicInviteUser() ? undefined : exitToList}
                      onContinue={() => { /* both confirmed → deposit panel renders on next deal refresh */ }}
                    />
                  ) : isAmountStep ? (
                    <DealAmountAgreementStep
                      deal={currentDeal}
                      userId={userId}
                      getUsername={getUsername}
                      onBack={isMagicInviteUser() ? undefined : exitToList}
                    />
                  ) : isDepositStep ? (
                    <DealDepositPanel
                      deal={currentDeal}
                      userId={userId}
                      coinMeta={meta}
                      senderName={senderName}
                      receiverName={receiverName}
                      isSender={isBuyer}
                      onMarkDepositSent={handleMarkDepositSent}
                      onRefresh={loadDeals}
                      loading={confirmingItem}
                    />
                  ) : isPaymentReceivedStep ? (
                    <DealPaymentReceivedPanel
                      deal={currentDeal}
                      isSender={isBuyer}
                      receiverName={isBuyer ? otherName : (typeof receiverName === "string" ? receiverName : "receiver")}
                      onRelease={handleConfirmItemReceived}
                      onBack={isMagicInviteUser() ? undefined : exitToList}
                      loading={confirmingItem}
                    />
                  ) : (
                    <div className="space-y-4">
                      <DealProgressIndicator deal={currentDeal} userId={userId} />
                      <EscrowStatus
                        deal={currentDeal}
                        userId={userId}
                        onConfirmItemReceived={handleConfirmItemReceived}
                        onMarkDepositSent={handleMarkDepositSent}
                        onMarkItemDelivered={handleMarkItemDelivered}
                        loading={confirmingItem}
                      />
                      <DealFeeAndHoldBanner deal={currentDeal} userId={userId} />
                    </div>
                  )}
                </div>
                {!["completed", "cancelled"].includes(currentDeal.status) && (
                  <div className="flex items-center justify-end gap-3 border-t border-border/40 px-6 py-3">
                    <DisputeButton dealId={currentDeal.id} userId={userId} dealStatus={currentDeal.status} />
                  </div>
                )}
              </div>
            </div>
          );
        })()
      )}
      </div>

      <MfaChallengeDialog
        open={releaseMfaOpen}
        onClose={() => setReleaseMfaOpen(false)}
        onVerified={async () => {
          setReleaseMfaOpen(false);
          await performRelease();
        }}
        title="Confirm release of funds"
        description="Enter your authenticator code to confirm releasing funds for this deal."
      />
      {currentDeal && (
        <CancelDealDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          deal={currentDeal}
          userId={userId}
          otherUsername={
            currentDeal.creator_id === userId
              ? currentDeal.other_user_id ? getUsername(currentDeal.other_user_id) : undefined
              : getUsername(currentDeal.creator_id)
          }
          onRequest={handleRequestCancellation}
          onApprove={handleApproveCancellation}
          onDecline={handleDeclineCancellation}
        />
      )}
    </AppLayout>
  );
};

export default Deals;
