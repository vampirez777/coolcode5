import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useModerator } from "@/hooks/useModerator";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import DealChatDialog from "@/components/admin/DealChatDialog";
import MagicInvitesTab from "@/components/admin/MagicInvitesTab";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, HandshakeIcon, Headphones, Search, MessageSquare, CheckCircle2,
  ShieldCheck, Lock, Send, Wand2,
} from "lucide-react";

/**
 * Worker (Moderator) Panel
 * - Sees Users (no emails) and Deals only
 * - Can confirm "funds received" on a deal (moves status awaiting_deposit/deposit_pending → deposited)
 * - Can chat in any deal
 * - Cannot ban users, change roles, see emails, or access admin-only tabs
 */
const Worker = () => {
  const { isModerator, loading } = useModerator();
  const navigate = useNavigate();

  const [users, setUsers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [chatDealId, setChatDealId] = useState<string | null>(null);
  const [busyDealId, setBusyDealId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const loadData = useCallback(async () => {
    const [profilesRes, dealsRes, ticketsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, username, display_name, avatar_url, created_at").order("created_at", { ascending: false }),
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
    ]);
    setUsers(profilesRes.data || []);
    setDeals(dealsRes.data || []);
    setTickets(ticketsRes.data || []);
  }, []);

  useEffect(() => {
    if (!loading && !isModerator) navigate("/dashboard");
    if (!loading && isModerator) loadData();
  }, [loading, isModerator, navigate, loadData]);

  const userLabel = (uid: string | null | undefined) => {
    if (!uid) return "—";
    const p = users.find((x: any) => x.user_id === uid);
    return p?.username || p?.display_name || `${uid.slice(0, 8)}…`;
  };

  const confirmFundsReceived = async (deal: any) => {
    setBusyDealId(deal.id);
    const { error } = await supabase
      .from("deals")
      .update({
        status: "deposited",
        deposit_confirmed_at: new Date().toISOString(),
      })
      .eq("id", deal.id);
    setBusyDealId(null);
    if (error) {
      toast({ title: "Couldn't confirm funds", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Funds confirmed received", description: "Buyer & seller have been notified." });
      loadData();
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const openTicket = async (ticket: any) => {
    setActiveTicket(ticket);
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setTicketMessages(data || []);
  };

  const sendReply = async () => {
    if (!activeTicket || !replyText.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSendingReply(true);
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: activeTicket.id,
      sender_id: user.id,
      message: replyText.trim(),
    });
    setSendingReply(false);
    if (error) {
      toast({ title: "Couldn't send reply", description: error.message, variant: "destructive" });
      return;
    }
    setReplyText("");
    openTicket(activeTicket);
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", ticketId);
    if (error) {
      toast({ title: "Couldn't update ticket", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Ticket ${status}` });
    loadData();
    if (activeTicket?.id === ticketId) setActiveTicket({ ...activeTicket, status });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }
  if (!isModerator) return null;

  return (
    <AppLayout>
      <div className="relative mb-7 overflow-hidden rounded-xl pb-5 pt-3">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 app-green-bars opacity-70" />
        <div className="pointer-events-none absolute right-0 top-0 h-44 w-[46%] rounded-full bg-primary/10 blur-3xl" />
        <h1 className="relative text-[32px] font-bold leading-tight text-foreground">Worker Panel</h1>
        <p className="relative mt-2 text-base font-medium text-muted-foreground">Moderator tools — review users & confirm deal funds</p>
      </div>

      <div className="space-y-6">

        <Tabs defaultValue="deals" className="space-y-4">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="deals"><HandshakeIcon className="h-4 w-4 mr-1.5" />Deals</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" />Users</TabsTrigger>
            <TabsTrigger value="support"><Headphones className="h-4 w-4 mr-1.5" />Support</TabsTrigger>
            <TabsTrigger value="magic-invites"><Wand2 className="h-4 w-4 mr-1.5" />Magic invites</TabsTrigger>
          </TabsList>

          {/* DEALS */}
          <TabsContent value="deals" className="space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left p-3 font-medium">Coin</th>
                        <th className="text-left p-3 font-medium">Amount</th>
                        <th className="text-left p-3 font-medium">Buyer</th>
                        <th className="text-left p-3 font-medium">Seller</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Created</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-muted-foreground">No deals yet</td>
                        </tr>
                      )}
                      {deals.map((d) => {
                        const buyerId = d.creator_role === "buyer" ? d.creator_id : d.other_user_id;
                        const sellerId = d.creator_role === "seller" ? d.creator_id : d.other_user_id;
                        const canConfirmFunds = ["awaiting_deposit", "deposit_pending"].includes(d.status);
                        return (
                          <tr key={d.id} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="p-3 text-foreground font-medium">
                              {d.coin || "—"}{d.coin_network ? ` (${d.coin_network})` : ""}
                            </td>
                            <td className="p-3 text-foreground">${d.amount?.toFixed(2) || "—"}</td>
                            <td className="p-3 text-foreground truncate max-w-[140px]">{userLabel(buyerId)}</td>
                            <td className="p-3 text-foreground truncate max-w-[140px]">{userLabel(sellerId)}</td>
                            <td className="p-3">
                              <Badge
                                variant={
                                  d.status === "completed"
                                    ? "default"
                                    : d.status === "cancelled" || d.status === "refunded"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="capitalize"
                              >
                                {d.status?.replace(/_/g, " ")}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(d.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1.5 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => setChatDealId(d.id)}
                                >
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Chat
                                </Button>
                                {canConfirmFunds && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                                    disabled={busyDealId === d.id}
                                    onClick={() => confirmFundsReceived(d)}
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    {busyDealId === d.id ? "Confirming…" : "Confirm Funds Received"}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* USERS — emails hidden */}
          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>

            <div className="rounded-lg border border-border/30 bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              User emails are hidden from moderators for privacy.
            </div>

            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left p-3 font-medium">Username</th>
                        <th className="text-left p-3 font-medium">Display name</th>
                        <th className="text-left p-3 font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-muted-foreground">No users</td>
                        </tr>
                      )}
                      {filteredUsers.map((u) => (
                        <tr key={u.user_id} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="p-3 font-medium text-foreground">{u.username || "—"}</td>
                          <td className="p-3 text-foreground">{u.display_name || "—"}</td>
                          <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUPPORT */}
          <TabsContent value="support" className="space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left p-3 font-medium">Subject</th>
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Created</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.length === 0 && (
                        <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No tickets</td></tr>
                      )}
                      {tickets.map((t) => (
                        <tr key={t.id} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="p-3 text-foreground font-medium truncate max-w-[280px]">{t.subject || "(no subject)"}</td>
                          <td className="p-3 text-foreground truncate max-w-[140px]">{userLabel(t.user_id)}</td>
                          <td className="p-3">
                            <Badge variant={t.status === "open" ? "secondary" : "default"} className="capitalize">
                              {t.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                          <td className="p-3 flex gap-1.5">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openTicket(t)}>
                              <MessageSquare className="h-3 w-3 mr-1" /> Open
                            </Button>
                            {t.status === "open" && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateTicketStatus(t.id, "closed")}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Close
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MAGIC INVITES */}
          <TabsContent value="magic-invites" className="space-y-4">
            <MagicInvitesTab />
          </TabsContent>
        </Tabs>

        <DealChatDialog dealId={chatDealId} onClose={() => setChatDealId(null)} />

        {/* Ticket reply dialog */}
        <Dialog open={!!activeTicket} onOpenChange={(o) => !o && setActiveTicket(null)}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground truncate">
                {activeTicket?.subject || "Support ticket"}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-72 overflow-y-auto space-y-2 border border-border/30 rounded-md p-3 bg-muted/20">
              {ticketMessages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
              )}
              {ticketMessages.map((m) => (
                <div key={m.id} className="text-sm">
                  <div className="text-xs text-muted-foreground">
                    {userLabel(m.sender_id)} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <div className="text-foreground whitespace-pre-wrap">{m.message}</div>
                </div>
              ))}
            </div>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply…"
              className="bg-background border-border"
              rows={3}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveTicket(null)}>Close</Button>
              <Button onClick={sendReply} disabled={sendingReply || !replyText.trim()} className="bg-primary text-primary-foreground">
                <Send className="h-4 w-4 mr-1" /> {sendingReply ? "Sending…" : "Send reply"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Worker;