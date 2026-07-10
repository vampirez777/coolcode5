import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MessageAttachment from "@/components/deals/MessageAttachment";
import { uploadDealAttachment, IMAGE_ACCEPT_ATTR, isAllowedImage } from "@/lib/uploadDealAttachment";

interface DealChatDialogProps {
  dealId: string | null;
  onClose: () => void;
}

const DealChatDialog = ({ dealId, onClose }: DealChatDialogProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!dealId) return;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserIdRef.current = user?.id || null;

      const { data } = await supabase
        .from("deal_messages")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: true });
      setMessages(data || []);

      const senderIds = [...new Set((data || []).map((m: any) => m.sender_id))];
      if (senderIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", senderIds);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => {
          map[p.user_id] = p.username || p.display_name || p.user_id.slice(0, 8);
        });
        setProfiles(map);
      }
    };
    load();

    // Combined channel for realtime messages + presence (typing)
    const channel = supabase
      .channel(`deal-chat-admin-${dealId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deal_messages", filter: `deal_id=eq.${dealId}` },
        async (payload) => {
          const msg = payload.new as any;
          if (!profiles[msg.sender_id]) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("user_id, username, display_name")
              .eq("user_id", msg.sender_id)
              .maybeSingle();
            if (prof) {
              setProfiles((prev) => ({
                ...prev,
                [prof.user_id]: prof.username || prof.display_name || prof.user_id.slice(0, 8),
              }));
            }
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing: string[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.is_typing && p.user_id !== currentUserIdRef.current) {
              typing.push(p.display_name || p.user_id.slice(0, 8));
            }
          });
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            channel.track({ user_id: user.id, display_name: "Admin", is_typing: false });
          }
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [dealId]);

  // Scroll the chat container itself (not the page) to the bottom whenever
  // messages change. Using scrollTop on the container avoids the page-level
  // scroll jump that scrollIntoView causes inside an overflow container.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !currentUserIdRef.current) return;
    channelRef.current.track({
      user_id: currentUserIdRef.current,
      display_name: "Admin",
      is_typing: isTyping,
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !dealId) return;
    setSending(true);
    broadcastTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const { error } = await supabase.from("deal_messages").insert({
      deal_id: dealId,
      sender_id: user.id,
      message: newMessage.trim(),
    });
    if (error) {
      toast({ title: "Error sending message", description: error.message, variant: "destructive" });
    } else {
      setMessages((prev) => [
        ...prev,
        { deal_id: dealId, sender_id: user.id, message: newMessage.trim(), created_at: new Date().toISOString() },
      ]);
      setNewMessage("");
    }
    setSending(false);
  };

  const uploadAndSend = async (file: File) => {
    if (!dealId) return;
    if (!isAllowedImage(file)) {
      toast({
        title: "Unsupported file",
        description: "Only images (PNG, JPEG, WEBP, GIF, HEIC) are allowed.",
        variant: "destructive",
      });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUploading(true);
    try {
      const { path, type, name } = await uploadDealAttachment(file, dealId, user.id);
      const { error } = await supabase.from("deal_messages").insert({
        deal_id: dealId,
        sender_id: user.id,
        message: "",
        attachment_url: path,
        attachment_type: type,
        attachment_name: name,
      });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await uploadAndSend(file);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await uploadAndSend(file);
          return;
        }
      }
    }
  };

  return (
    <Dialog open={!!dealId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Deal Chat</DialogTitle>
        </DialogHeader>
        <div
          ref={scrollContainerRef}
          className="flex flex-col h-80 overflow-y-auto border border-border rounded-md p-3 space-y-2 bg-muted/20"
        >
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className="text-sm">
              <span className="font-semibold text-primary">{profiles[m.sender_id] || m.sender_id.slice(0, 8)}: </span>
              {m.message && <span className="text-foreground">{m.message}</span>}
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(m.created_at).toLocaleTimeString()}
              </span>
              {m.attachment_url && (
                <div className="mt-1 ml-1">
                  <MessageAttachment url={m.attachment_url} type={m.attachment_type} name={m.attachment_name} />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        {typingUsers.length > 0 && (
          <p className="text-xs text-muted-foreground italic animate-pulse">
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </p>
        )}
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} accept={IMAGE_ACCEPT_ATTR} />
          <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Attach image">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </Button>
          <Input
            placeholder="Type a message or paste an image..."
            value={newMessage}
            onChange={handleInputChange}
            onPaste={handlePaste}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="bg-card border-border"
          />
          <Button onClick={handleSend} disabled={sending} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DealChatDialog;
