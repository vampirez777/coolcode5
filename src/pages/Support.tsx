import { useState, useEffect, type CSSProperties } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import StatsBar from "@/components/StatsBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCaptchaGate } from "@/hooks/useCaptchaGate";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const HeroBars = () => (
  <div aria-hidden="true" className="absolute inset-0 z-0 flex items-end overflow-hidden">
    {[111, 133.8, 151.6, 202, 151.6, 133.8, 111, 133.8, 151.6, 202, 151.6].map((height, index) => (
      <div key={index} className="dash-hero__bar shrink-0" style={{ "--dash-hero-bar-width": "95.55px", "--dash-hero-bar-height": `${height}px` } as CSSProperties} />
    ))}
  </div>
);

const Support = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { runWithCaptcha, gate } = useCaptchaGate();
  const { isEnabled } = useFeatureFlags();

  useEffect(() => {
    const load = async (uid: string) => {
      setUserId(uid);
      const { data: ticketsData } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setTickets(ticketsData || []);

      const { data: dealsData } = await supabase
        .from("deals")
        .select("*")
        .or(`creator_id.eq.${uid},other_user_id.eq.${uid}`);
      setDeals(dealsData || []);
    };
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) load(session.user.id);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) load(session.user.id);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!selectedTicket) { setMessages([]); return; }
    const loadMessages = async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", selectedTicket)
        .order("created_at", { ascending: true });
      setMessages(data || []);

      // Load profiles for senders
      const senderIds = new Set<string>();
      (data || []).forEach(m => senderIds.add(m.sender_id));
      if (senderIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", Array.from(senderIds));
        const map: Record<string, string> = {};
        (profiles || []).forEach(p => { map[p.user_id] = p.username || p.display_name || "Unknown"; });
        setProfilesMap(prev => ({ ...prev, ...map }));
      }
    };
    loadMessages();

    // Realtime: new messages for this ticket
    const channel = supabase
      .channel(`support-ticket-${selectedTicket}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${selectedTicket}` },
        async (payload) => {
          const incoming = payload.new as any;
          setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]);
          // Fetch sender profile if missing
          setProfilesMap(prev => {
            if (prev[incoming.sender_id]) return prev;
            supabase.from("profiles").select("user_id, username, display_name").eq("user_id", incoming.sender_id).maybeSingle().then(({ data }) => {
              if (data) {
                setProfilesMap(p => ({ ...p, [data.user_id]: data.username || data.display_name || "Unknown" }));
              }
            });
            return prev;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${selectedTicket}` },
        (payload) => {
          const updated = payload.new as any;
          setTickets(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket]);

  // Realtime on tickets list (new tickets created or status changed)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`support-tickets-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets", filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as any;
            setTickets(prev => prev.some(t => t.id === row.id) ? prev : [row, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as any;
            setTickets(prev => prev.map(t => t.id === row.id ? { ...t, ...row } : t));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const completedDeals = deals.filter(d => d.status === "completed");
  const totalValue = completedDeals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const createTicket = () => {
    if (!userId) return;
    if (!isEnabled("support_tickets")) {
      toast({
        title: "Support tickets disabled",
        description: "Opening new support tickets is currently turned off by an administrator.",
        variant: "destructive",
      });
      return;
    }
    runWithCaptcha(
      async () => {
        const activeDeal = deals.find(d => d.status === "in_progress");
        const { data, error } = await supabase
          .from("support_tickets")
          .insert({
            user_id: userId,
            deal_id: activeDeal?.id || null,
            subject: activeDeal ? `Support for deal ${activeDeal.id.slice(0, 8)}` : "General support request",
            status: "open",
          })
          .select()
          .single();

        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        } else if (data) {
          setTickets(prev => [data, ...prev]);
          setSelectedTicket(data.id);
          toast({ title: "Ticket created!" });
        }
      },
      { reason: "creating a support ticket", title: "Confirm support request" }
    );
  };

  const sendTicketMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !userId) return;
    const text = newMessage.trim();
    setNewMessage("");
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: selectedTicket,
      sender_id: userId,
      message: text,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setNewMessage(text);
    }
    // The realtime INSERT subscription will append the message, no optimistic insert needed.
  };

  return (
    <AppLayout>
      {gate}
      <div className="dash-support-page-stack">
        <div className="relative flex min-w-0 w-full flex-col gap-8">
          <HeroBars />
          <div className="relative z-10 flex min-w-0 w-full flex-col gap-8">
            <div className="grid min-w-0 w-full gap-4 grid-cols-1">
              <div className="min-w-0 justify-self-stretch"><div><h1 className="dash-header__title text-[22px] font-semibold leading-tight tracking-[-0.02em] text-white lg:text-[25px] lg:leading-[20px]">Support Tickets</h1><p className="dash-header__subtitle mt-[16px] text-[17px] font-medium leading-[20px] tracking-normal text-[#FFFFFF99]">View your current support tickets</p></div></div>
            </div>
            <StatsBar
              totalCompleted={completedDeals.length}
              totalValue={totalValue}
              avgDealLength="-"
              ctaCard={
                <>
                  <div><h3 className="deals-support-panel__title">Make a support request</h3><p className="deals-support-panel__desc mt-0.5">Having trouble? Contact our staff</p><p className="mt-2 text-xs font-medium text-[#0a0a0a]/75">Open or select a deal on the Deals page before creating a support ticket.</p></div>
                  <button onClick={createTicket} className="deals-support-panel__cta inline-flex items-center justify-center gap-2 rounded-lg text-white cursor-pointer hover:opacity-90" type="button">Make Request <img alt="" className="shrink-0" height="12" src="/dash-source/image/ui_arrow_external_up_right.svg" width="12" /></button>
                </>
              }
            />
          </div>
        </div>

      <div aria-hidden="true" className="dash-hairline-divider" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ticket list */}
        <div className="dash-support-tickets-panel p-5">
          <h2 className="dash-support-tickets-title mb-4">Support Tickets <span className="dash-support-tickets-count">({tickets.length})</span></h2>
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm mb-3">No tickets yet.</p>
              <Button onClick={createTicket} variant="outline" size="sm">Create a ticket</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTicket === ticket.id ? "border-primary bg-muted" : "border-border/30 hover:border-border"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{ticket.subject || `Ticket #${ticket.id.slice(0, 8)}`}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground capitalize">{ticket.status}</span>
                    <span className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className="dash-support-tickets-panel flex min-h-[300px] flex-col p-5">
          {selectedTicket ? (
            <>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {tickets.find(t => t.id === selectedTicket)?.subject || "Conversation"}
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground text-xs py-8">No messages yet. Send a message to start.</p>
                ) : messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_id === userId ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      msg.sender_id === userId ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      <p className="text-[10px] opacity-60 mb-0.5">{profilesMap[msg.sender_id] || "You"}</p>
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="app-cloned-input text-sm"
                  onKeyDown={(e) => e.key === "Enter" && sendTicketMessage()}
                />
                <Button size="icon" onClick={sendTicketMessage} className="app-cloned-btn-primary shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Select a support ticket to view the conversation</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </AppLayout>
  );
};

export default Support;
