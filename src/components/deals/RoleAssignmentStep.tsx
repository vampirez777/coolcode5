import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, ArrowUp, ArrowDown, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Side = "sender" | "receiver";

interface RoleRow {
  id: string;
  deal_id: string;
  user_id: string;
  picked_role: Side;
  confirmed: boolean;
}

interface ParticipantInfo {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  dealId: string;
  userId: string;
  creatorId: string;
  otherUserId: string;
  getUsername: (uid: string) => string;
  onBack?: () => void;
}

const RoleAssignmentStep = ({ dealId, userId, creatorId, otherUserId, getUsername, onBack }: Props) => {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [participants, setParticipants] = useState<Record<string, ParticipantInfo>>({});
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const otherId = userId === creatorId ? otherUserId : creatorId;

  const myRow = rows.find((r) => r.user_id === userId);
  const otherRow = rows.find((r) => r.user_id === otherId);

  // Load + subscribe to role assignments + load profiles for both sides
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("deal_role_assignments")
        .select("*")
        .eq("deal_id", dealId);
      if (mounted) setRows((data || []) as RoleRow[]);
    };
    load();

    const ids = [creatorId, otherUserId].filter(Boolean);
    if (ids.length) {
      supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", ids)
        .then(({ data }) => {
          if (!mounted || !data) return;
          const map: Record<string, ParticipantInfo> = {};
          for (const p of data as any[]) map[p.user_id] = p;
          setParticipants(map);
        });
    }

    const channel = supabase
      .channel(`dra-${dealId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deal_role_assignments", filter: `deal_id=eq.${dealId}` },
        () => load()
      )
      .subscribe();

    // Polling fallback — if realtime misses an event, we still pick up the
    // other side's pick/confirm within ~3s.
    const pollId = window.setInterval(load, 3000);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      window.clearInterval(pollId);
    };
  }, [dealId, creatorId, otherUserId]);

  // Pick a side (sender / receiver). Upsert my row.
  const pick = async (side: Side) => {
    setBusy(true);
    try {
      // If I already have a row, update it; else insert.
      if (myRow) {
        const { error } = await supabase
          .from("deal_role_assignments")
          .update({ picked_role: side, confirmed: false })
          .eq("id", myRow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("deal_role_assignments")
          .insert({ deal_id: dealId, user_id: userId, picked_role: side, confirmed: false });
        if (error) throw error;
      }
    } catch (e: any) {
      toast({ title: "Couldn't update", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!myRow) {
      toast({ title: "Pick a side first", variant: "destructive" });
      return;
    }
    if (otherRow && otherRow.picked_role === myRow.picked_role) {
      toast({
        title: "Picks conflict",
        description: "Both of you picked the same side. One must be Sending and the other Receiving.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("deal_role_assignments")
        .update({ confirmed: true })
        .eq("id", myRow.id);
      if (error) throw error;
    } catch (e: any) {
      toast({ title: "Couldn't confirm", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const myProfile = participants[userId];
  const otherProfile = participants[otherId];

  const RoleButtons = ({
    side,
    onPick,
    disabled,
  }: {
    side: Side | null;
    onPick?: (s: Side) => void;
    disabled?: boolean;
  }) => (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onPick?.("sender")}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          side === "sender"
            ? "bg-primary text-primary-foreground"
            : "bg-muted/40 text-muted-foreground hover:bg-muted"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <ArrowUp className="h-4 w-4" /> Sending
      </button>
      <button
        type="button"
        onClick={() => onPick?.("receiver")}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          side === "receiver"
            ? "bg-primary/80 text-primary-foreground"
            : "bg-muted/40 text-muted-foreground hover:bg-muted"
        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <ArrowDown className="h-4 w-4" /> Receiving
      </button>
    </div>
  );

  const ParticipantCard = ({
    profile,
    isMe,
    label,
  }: {
    profile?: ParticipantInfo;
    isMe: boolean;
    label: string;
  }) => (
    <div className="flex flex-col items-center gap-3">
      <div className="w-32 h-32 rounded-2xl bg-muted/30 grid place-items-center p-3">
        <Avatar className="w-full h-full">
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={label} />}
          <AvatarFallback className="text-xl">
            {(label || "?").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <p className="text-base font-semibold text-foreground">{label}</p>
    </div>
  );

  const myLabel = "Me";
  const otherLabel = otherProfile?.username || otherProfile?.display_name || (otherId ? getUsername(otherId) : "Other");

  // Status footer text
  const bothConfirmed = !!(myRow?.confirmed && otherRow?.confirmed);
  const sameSidePicked =
    !!(myRow && otherRow && myRow.picked_role === otherRow.picked_role);

  let statusText = "None have confirmed roles";
  if (bothConfirmed && !sameSidePicked) statusText = "Both confirmed!";
  else if (myRow?.confirmed) statusText = "You've confirmed — waiting for the other side";
  else if (otherRow?.confirmed) statusText = "Other side confirmed — your turn";

  const myRoleLabel = myRow?.picked_role === "sender" ? "Sender" : myRow?.picked_role === "receiver" ? "Receiver" : "Not picked";
  const otherRoleLabel = otherRow?.picked_role === "sender" ? "Sender" : otherRow?.picked_role === "receiver" ? "Receiver" : "Not picked";

  return (
    <div className="rounded-xl border border-border/40 bg-card p-6">
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-bold text-foreground">Role Assignment</h2>
        <p className="text-sm text-muted-foreground">
          Each person chooses Sending or Receiving on their side. If either changes their pick, both confirmations reset until you agree again.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Left: me (always render the current viewer on the left) */}
        <div className="flex flex-col items-center gap-4 pr-4 border-r border-border/30">
          <ParticipantCard profile={myProfile} isMe label={myLabel} />
          <RoleButtons side={myRow?.picked_role ?? null} onPick={pick} disabled={busy} />
        </div>
        {/* Right: other side (read-only display) */}
        <div className="flex flex-col items-center gap-4 pl-4">
          <ParticipantCard profile={otherProfile} isMe={false} label={otherLabel} />
          <RoleButtons side={otherRow?.picked_role ?? null} disabled />
        </div>
      </div>

      {/* Conflict / status banner */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {sameSidePicked ? (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Conflict — both picked the same side. Adjust to continue.</span>
          </>
        ) : bothConfirmed ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-500">Both confirmed — moving to escrow…</span>
          </>
        ) : (
          <>
            <AlertCircle className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Please confirm your role assignment</span>
          </>
        )}
      </div>

      <div className="flex justify-center mt-3">
        <Button
          variant="secondary"
          onClick={confirm}
          disabled={busy || !myRow || sameSidePicked || myRow?.confirmed}
        >
          {myRow?.confirmed ? "Confirmed ✓" : "Confirm?"}
        </Button>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-border/30">
        {onBack ? (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        ) : <span />}

        <div className="flex flex-col items-center gap-1 text-xs">
          <span className="text-muted-foreground">{statusText}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              {otherRow?.confirmed
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                : <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />}
              <span className="text-muted-foreground">{otherLabel} <span className="opacity-60">({otherRoleLabel})</span></span>
            </span>
            <span className="flex items-center gap-1">
              {myRow?.confirmed
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                : <span className="h-2 w-2 rounded-full bg-muted-foreground/40 inline-block" />}
              <span className="text-muted-foreground">{myLabel} <span className="opacity-60">({myRoleLabel})</span></span>
            </span>
          </div>
        </div>

        <span />
      </div>
    </div>
  );
};

export default RoleAssignmentStep;