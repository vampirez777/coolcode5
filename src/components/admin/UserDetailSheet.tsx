import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HandshakeIcon, Headphones, User as UserIcon, Mail, Calendar } from "lucide-react";

interface UserDetailSheetProps {
  userId: string | null;
  profiles: any[];
  authUsers: any[];
  onClose: () => void;
}

const UserDetailSheet = ({ userId, profiles, authUsers, onClose }: UserDetailSheetProps) => {
  const [deals, setDeals] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const profile = useMemo(
    () => profiles.find((p) => p.user_id === userId),
    [profiles, userId]
  );
  const authUser = useMemo(
    () => authUsers.find((a) => a.id === userId),
    [authUsers, userId]
  );

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("deals")
        .select("*")
        .or(`creator_id.eq.${userId},other_user_id.eq.${userId}`)
        .order("created_at", { ascending: false }),
      supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]).then(([dealsRes, ticketsRes]) => {
      setDeals(dealsRes.data || []);
      setTickets(ticketsRes.data || []);
      setLoading(false);
    });
  }, [userId]);

  const initials = (profile?.username || profile?.display_name || authUser?.email || "?")
    .slice(0, 2)
    .toUpperCase();

  const isBanned = authUser?.banned;

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
        </SheetHeader>

        {!userId ? null : (
          <div className="mt-6 space-y-6">
            {/* Profile header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-foreground truncate">
                    {profile?.username || profile?.display_name || "Unknown"}
                  </h3>
                  {isBanned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-primary">Active</Badge>
                  )}
                </div>
                {profile?.display_name && profile?.username && (
                  <p className="text-sm text-muted-foreground truncate">{profile.display_name}</p>
                )}
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{authUser?.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3 w-3" />
                    <span className="font-mono">{userId.slice(0, 8)}…</span>
                  </div>
                  {profile?.created_at && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-card border-border">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <HandshakeIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{deals.length}</p>
                    <p className="text-xs text-muted-foreground">Deals</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Headphones className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">{tickets.length}</p>
                    <p className="text-xs text-muted-foreground">Tickets</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Deals */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <HandshakeIcon className="h-4 w-4" /> Deals
              </h4>
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : deals.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No deals</p>
              ) : (
                <div className="space-y-2">
                  {deals.map((d) => (
                    <Card key={d.id} className="bg-card border-border">
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">
                            {d.coin || "—"}
                            {d.coin_network ? ` (${d.coin_network})` : ""} · ${d.amount?.toFixed(2) || "0.00"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {d.creator_id === userId ? "Buyer" : "Seller"} ·{" "}
                            {new Date(d.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            d.status === "completed"
                              ? "default"
                              : d.status === "cancelled"
                              ? "destructive"
                              : "secondary"
                          }
                          className="capitalize shrink-0"
                        >
                          {d.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Tickets */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Headphones className="h-4 w-4" /> Support Tickets
              </h4>
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : tickets.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No tickets</p>
              ) : (
                <div className="space-y-2">
                  {tickets.map((t) => (
                    <Card key={t.id} className="bg-card border-border">
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">
                            {t.subject || "No subject"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(t.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            t.status === "resolved"
                              ? "default"
                              : t.status === "closed"
                              ? "secondary"
                              : "destructive"
                          }
                          className="capitalize shrink-0"
                        >
                          {t.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default UserDetailSheet;
