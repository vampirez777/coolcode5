import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import AppLayout from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import DealChatDialog from "@/components/admin/DealChatDialog";
import AdminEscrowDialog from "@/components/admin/AdminEscrowDialog";
import AdminDisputesTab from "@/components/admin/AdminDisputesTab";
import AdminWalletsTab from "@/components/admin/AdminWalletsTab";
import AdminMaintenanceTab from "@/components/admin/AdminMaintenanceTab";
import AdminSecurityTab from "@/components/admin/AdminSecurityTab";
import AdminAccessRequestsTab from "@/components/admin/AdminAccessRequestsTab";
import MagicInvitesTab from "@/components/admin/MagicInvitesTab";
import AdminFeatureFlagsTab from "@/components/admin/AdminFeatureFlagsTab";
import AdminGiveawaysTab from "@/components/admin/AdminGiveawaysTab";
import AdminLiveAnnouncementsTab from "@/components/admin/AdminLiveAnnouncementsTab";
import AdminTermsAcceptanceTab from "@/components/admin/AdminTermsAcceptanceTab";
import AdminGlobalSecurityToggles from "@/components/admin/AdminGlobalSecurityToggles";
import UserDetailSheet from "@/components/admin/UserDetailSheet";
import AdminRoleSelect from "@/components/admin/AdminRoleSelect";
import {
  Users, HandshakeIcon, Headphones, BarChart3, Bell,
  Ban, CheckCircle, Search, Send, Eye, MessageSquare, Shield, AlertTriangle, Wallet, Wrench, ShieldCheck, KeyRound, Wand2, ToggleLeft, Gift, Megaphone, ScrollText, Lock,
} from "lucide-react";

const Admin = () => {
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, deals: 0, activeDeals: 0, tickets: 0 });
  const [search, setSearch] = useState("");
  const [chatDealId, setChatDealId] = useState<string | null>(null);
  const [escrowDeal, setEscrowDeal] = useState<any | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // Notification form
  const [notifUserId, setNotifUserId] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifAll, setNotifAll] = useState(false);

  const loadData = useCallback(async () => {
    const [profilesRes, dealsRes, ticketsRes, authRes, disputesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      supabase.functions.invoke("admin-users", { body: { action: "list" } }),
      supabase.from("disputes").select("*").order("created_at", { ascending: false }),
    ]);
    const p = profilesRes.data || [];
    const d = dealsRes.data || [];
    const t = ticketsRes.data || [];
    const au = authRes.data || [];
    const disp = disputesRes.data || [];
    setUsers(p);
    setAuthUsers(au);
    setDeals(d);
    setTickets(t);
    setDisputes(disp);
    setStats({
      users: p.length,
      deals: d.length,
      activeDeals: d.filter((x: any) => ["awaiting_deposit", "deposited", "item_delivered", "disputed"].includes(x.status)).length,
      tickets: t.filter((x: any) => x.status === "open").length,
    });
  }, []);

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/dashboard");
    if (!loading && isAdmin) loadData();
  }, [loading, isAdmin, navigate, loadData]);

  const handleSendNotification = async () => {
    if (!notifTitle.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    try {
      if (notifAll) {
        const inserts = users.map((u) => ({
          user_id: u.user_id,
          type: "admin",
          title: notifTitle,
          body: notifBody || null,
        }));
        const { error } = await supabase.from("notifications").insert(inserts);
        if (error) throw error;
        toast({ title: `Notification sent to ${users.length} users` });
      } else {
        if (!notifUserId.trim()) {
          toast({ title: "Select a user or check 'All users'", variant: "destructive" });
          return;
        }
        const { error } = await supabase.from("notifications").insert({
          user_id: notifUserId,
          type: "admin",
          title: notifTitle,
          body: notifBody || null,
        });
        if (error) throw error;
        toast({ title: "Notification sent" });
      }
      setNotifTitle("");
      setNotifBody("");
      setNotifUserId("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const updateDealStatus = async (dealId: string, status: string) => {
    await supabase.from("deals").update({ status }).eq("id", dealId);
    loadData();
    toast({ title: `Deal ${status}` });
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    await supabase.from("support_tickets").update({ status }).eq("id", ticketId);
    loadData();
    toast({ title: `Ticket ${status}` });
  };

  const handleBanToggle = async (userId: string, currentlyBanned: boolean) => {
    const action = currentlyBanned ? "unban" : "ban";
    const { error } = await supabase.functions.invoke("admin-users", {
      body: { action, userId },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: currentlyBanned ? "User unbanned" : "User banned" });
      loadData();
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (authUsers.find((a: any) => a.id === u.user_id)?.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // Resolve a user_id to a friendly label: username → display_name → email → short id
  const userLabel = (userId: string | null | undefined) => {
    if (!userId) return "—";
    const profile = users.find((p: any) => p.user_id === userId);
    const auth = authUsers.find((a: any) => a.id === userId);
    return (
      profile?.username ||
      profile?.display_name ||
      auth?.email ||
      `${userId.slice(0, 8)}…`
    );
  };

  // Render a clickable username that opens the user detail sheet
  const UserLink = ({ userId }: { userId: string | null | undefined }) => {
    if (!userId) return <span className="text-muted-foreground">—</span>;
    return (
      <button
        type="button"
        onClick={() => setDetailUserId(userId)}
        className="text-primary hover:underline underline-offset-2 text-left truncate max-w-[140px]"
      >
        {userLabel(userId)}
      </button>
    );
  };

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div></AppLayout>;
  if (!isAdmin) return null;

  return (
    <AppLayout>
      <div className="relative mb-7 overflow-hidden rounded-xl pb-5 pt-3">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 app-green-bars opacity-70" />
        <div className="pointer-events-none absolute right-0 top-0 h-44 w-[46%] rounded-full bg-primary/10 blur-3xl" />
        <h1 className="relative text-[32px] font-bold leading-tight text-foreground">Admin Panel</h1>
        <p className="relative mt-2 text-base font-medium text-muted-foreground">Manage your platform</p>
      </div>

      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats.users, icon: Users },
            { label: "Total Deals", value: stats.deals, icon: HandshakeIcon },
            { label: "Active Deals", value: stats.activeDeals, icon: CheckCircle },
            { label: "Open Tickets", value: stats.tickets, icon: Headphones },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="bg-card border border-border w-max flex-nowrap">
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" />Users</TabsTrigger>
            <TabsTrigger value="deals"><HandshakeIcon className="h-4 w-4 mr-1.5" />Deals</TabsTrigger>
            <TabsTrigger value="support"><Headphones className="h-4 w-4 mr-1.5" />Support</TabsTrigger>
            <TabsTrigger value="disputes"><AlertTriangle className="h-4 w-4 mr-1.5" />Disputes{disputes.filter(d => d.status === "open").length > 0 && <span className="ml-1 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">{disputes.filter(d => d.status === "open").length}</span>}</TabsTrigger>
            <TabsTrigger value="wallets"><Wallet className="h-4 w-4 mr-1.5" />Wallets</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1.5" />Notify</TabsTrigger>
            <TabsTrigger value="maintenance"><Wrench className="h-4 w-4 mr-1.5" />Site</TabsTrigger>
            <TabsTrigger value="security"><ShieldCheck className="h-4 w-4 mr-1.5" />Security</TabsTrigger>
            <TabsTrigger value="access"><KeyRound className="h-4 w-4 mr-1.5" />Access</TabsTrigger>
            <TabsTrigger value="magic-invites"><Wand2 className="h-4 w-4 mr-1.5" />Magic invites</TabsTrigger>
            <TabsTrigger value="features"><ToggleLeft className="h-4 w-4 mr-1.5" />Features</TabsTrigger>
            <TabsTrigger value="sec-toggles"><Lock className="h-4 w-4 mr-1.5" />Security toggles</TabsTrigger>
            <TabsTrigger value="giveaways"><Gift className="h-4 w-4 mr-1.5" />Giveaways</TabsTrigger>
            <TabsTrigger value="live-announce"><Megaphone className="h-4 w-4 mr-1.5" />Live popup</TabsTrigger>
            <TabsTrigger value="tos"><ScrollText className="h-4 w-4 mr-1.5" />ToS log</TabsTrigger>
          </TabsList>
          </div>

          {/* Users Tab */}
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
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left p-3 font-medium">Username</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Display Name</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Role</th>
                        <th className="text-left p-3 font-medium">Joined</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const authUser = authUsers.find((a: any) => a.id === u.user_id);
                        const isBanned = authUser?.banned || false;
                        const userRoles: string[] = authUser?.roles || [];
                        return (
                          <tr key={u.id} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="p-3 font-medium"><UserLink userId={u.user_id} /></td>
                            <td className="p-3 text-muted-foreground text-xs">{authUser?.email || "—"}</td>
                            <td className="p-3 text-foreground">{u.display_name || "—"}</td>
                            <td className="p-3">
                              {isBanned ? (
                                <Badge variant="destructive">Banned</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-primary">Active</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <AdminRoleSelect
                                userId={u.user_id}
                                currentRoles={userRoles}
                                onChanged={loadData}
                              />
                            </td>
                            <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                variant={isBanned ? "outline" : "destructive"}
                                className="h-7 text-xs"
                                onClick={() => handleBanToggle(u.user_id, isBanned)}
                              >
                                {isBanned ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" />Unban</>
                                ) : (
                                  <><Ban className="h-3 w-3 mr-1" />Ban</>
                                )}
                              </Button>
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

          {/* Deals Tab */}
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
                      {deals.map((d) => (
                        <tr key={d.id} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="p-3 text-foreground font-medium">{d.coin || "—"}{d.coin_network ? ` (${d.coin_network})` : ""}</td>
                          <td className="p-3 text-foreground">${d.amount?.toFixed(2) || "—"}</td>
                          <td className="p-3"><UserLink userId={d.creator_id} /></td>
                          <td className="p-3"><UserLink userId={d.other_user_id} /></td>
                          <td className="p-3">
                            <Badge variant={d.status === "completed" ? "default" : d.status === "cancelled" ? "destructive" : "secondary"}>
                              {d.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                          <td className="p-3 flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setChatDealId(d.id)}>
                              <MessageSquare className="h-3 w-3 mr-1" />Chat
                            </Button>
                            {["awaiting_deposit", "deposit_pending", "deposited", "item_delivered", "disputed"].includes(d.status) && (
                              <Button size="sm" variant="outline" className="h-7 text-xs border-primary/50 text-primary" onClick={() => setEscrowDeal(d)}>
                                <Shield className="h-3 w-3 mr-1" />Escrow
                              </Button>
                            )}
                            {d.status !== "completed" && d.status !== "cancelled" && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateDealStatus(d.id, "completed")}>
                                  <CheckCircle className="h-3 w-3 mr-1" />Complete
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => updateDealStatus(d.id, "cancelled")}>
                                  <Ban className="h-3 w-3 mr-1" />Cancel
                                </Button>
                              </>
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

          {/* Support Tab */}
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
                      {tickets.map((t) => (
                        <tr key={t.id} className="border-b border-border/30 hover:bg-muted/30">
                          <td className="p-3 text-foreground font-medium">{t.subject || "No subject"}</td>
                          <td className="p-3"><UserLink userId={t.user_id} /></td>
                          <td className="p-3">
                            <Badge variant={t.status === "resolved" ? "default" : t.status === "closed" ? "secondary" : "destructive"}>
                              {t.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                          <td className="p-3 flex gap-1">
                            {t.status === "open" && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateTicketStatus(t.id, "resolved")}>
                                  <CheckCircle className="h-3 w-3 mr-1" />Resolve
                                </Button>
                                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => updateTicketStatus(t.id, "closed")}>
                                  Close
                                </Button>
                              </>
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

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="space-y-4">
            <AdminDisputesTab disputes={disputes} profiles={users} onUpdated={loadData} onUserClick={setDetailUserId} />
          </TabsContent>

          {/* Wallets Tab */}
          <TabsContent value="wallets" className="space-y-4">
            <AdminWalletsTab />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Send Notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifAll}
                      onChange={(e) => setNotifAll(e.target.checked)}
                      className="rounded border-border"
                    />
                    Send to all users
                  </label>
                </div>
                {!notifAll && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Select User</label>
                    <select
                      value={notifUserId}
                      onChange={(e) => setNotifUserId(e.target.value)}
                      className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm"
                    >
                      <option value="">Choose a user...</option>
                      {users.map((u) => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.username || u.display_name || u.user_id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Input
                  placeholder="Notification title"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  className="bg-card border-border"
                />
                <Textarea
                  placeholder="Notification body (optional)"
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                  className="bg-card border-border"
                  rows={3}
                />
                <Button onClick={handleSendNotification} className="gap-2">
                  <Send className="h-4 w-4" /> Send Notification
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-4">
            <AdminMaintenanceTab />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <AdminSecurityTab />
          </TabsContent>

          {/* Access Requests Tab */}
          <TabsContent value="access" className="space-y-4">
            <AdminAccessRequestsTab />
          </TabsContent>

          {/* Magic Invites Tab */}
          <TabsContent value="magic-invites" className="space-y-4">
            <MagicInvitesTab />
          </TabsContent>

          {/* Feature Flags Tab (admin-only) */}
          <TabsContent value="features" className="space-y-4">
            <AdminFeatureFlagsTab />
          </TabsContent>
          <TabsContent value="sec-toggles" className="space-y-4">
            <AdminGlobalSecurityToggles />
          </TabsContent>
          <TabsContent value="giveaways" className="space-y-4">
            <AdminGiveawaysTab />
          </TabsContent>
          <TabsContent value="live-announce" className="space-y-4">
            <AdminLiveAnnouncementsTab />
          </TabsContent>
          <TabsContent value="tos" className="space-y-4">
            <AdminTermsAcceptanceTab />
          </TabsContent>
        </Tabs>

        <DealChatDialog dealId={chatDealId} onClose={() => setChatDealId(null)} />
        <AdminEscrowDialog deal={escrowDeal} onClose={() => setEscrowDeal(null)} onUpdated={() => { setEscrowDeal(null); loadData(); }} />
        <UserDetailSheet
          userId={detailUserId}
          profiles={users}
          authUsers={authUsers}
          onClose={() => setDetailUserId(null)}
        />
      </div>
    </AppLayout>
  );
};

export default Admin;
