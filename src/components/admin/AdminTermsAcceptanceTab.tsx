import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ScrollText,
  Search,
  RefreshCw,
  UserCheck,
  HandshakeIcon,
} from "lucide-react";

type ToSRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  username: string | null;
  context: string;
  accepted: boolean;
  attempted_without_accept: boolean;
  tos_version: string;
  created_at: string;
  user_agent: string | null;
};

const AdminTermsAcceptanceTab = () => {
  const [rows, setRows] = useState<ToSRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tos_acceptances")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setRows((data as ToSRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = rows.length;
    const accepted = rows.filter((r) => r.accepted).length;
    const attempted = rows.filter((r) => r.attempted_without_accept).length;
    const signups = rows.filter((r) => r.context === "signup").length;
    const deals = rows.filter((r) => r.context === "deal_create").length;
    return { total, accepted, attempted, signups, deals };
  }, [rows]);

  const filterRows = (r: ToSRow) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (r.email || "").toLowerCase().includes(q) ||
      (r.username || "").toLowerCase().includes(q) ||
      (r.user_id || "").toLowerCase().includes(q)
    );
  };

  const filtered = rows.filter(filterRows);
  const acceptedRows = filtered.filter((r) => r.accepted);
  const attemptedRows = filtered.filter((r) => r.attempted_without_accept);

  const renderTable = (data: ToSRow[], emptyText: string) => (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Context</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Version</th>
                  <th className="text-left p-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="p-3 text-foreground font-medium">
                      {r.username || (r.user_id ? `${r.user_id.slice(0, 8)}…` : "—")}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{r.email || "—"}</td>
                    <td className="p-3">
                      {r.context === "signup" ? (
                        <Badge variant="secondary" className="gap-1">
                          <UserCheck className="h-3 w-3" />Signup
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <HandshakeIcon className="h-3 w-3" />Deal
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {r.accepted ? (
                        <Badge className="gap-1 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20">
                          <CheckCircle2 className="h-3 w-3" />Agreed
                        </Badge>
                      ) : r.attempted_without_accept ? (
                        <Badge variant="destructive" className="gap-1">
                          <ShieldAlert className="h-3 w-3" />Tried without agreeing
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <XCircle className="h-3 w-3" />Declined
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{r.tos_version}</td>
                    <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <CardHeader className="relative pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                <ScrollText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Terms of Service log</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audit trail of every signup and deal-creation acceptance attempt.
                </p>
              </div>
            </div>
          </CardHeader>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total events", value: stats.total, icon: ScrollText, tone: "text-foreground" },
          { label: "Agreed", value: stats.accepted, icon: CheckCircle2, tone: "text-primary" },
          { label: "Tried without agreeing", value: stats.attempted, icon: ShieldAlert, tone: "text-destructive" },
          { label: "Signups", value: stats.signups, icon: UserCheck, tone: "text-foreground" },
          { label: "Deals", value: stats.deals, icon: HandshakeIcon, tone: "text-foreground" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted/40 flex items-center justify-center">
                <s.icon className={`h-4 w-4 ${s.tone}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-xl font-bold ${s.tone}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, username, or user id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-3">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="all">
            All <span className="ml-1.5 text-xs text-muted-foreground">{filtered.length}</span>
          </TabsTrigger>
          <TabsTrigger value="agreed">
            Agreed <span className="ml-1.5 text-xs text-muted-foreground">{acceptedRows.length}</span>
          </TabsTrigger>
          <TabsTrigger value="attempted">
            Tried without agreeing
            {attemptedRows.length > 0 && (
              <span className="ml-1.5 text-xs bg-destructive text-destructive-foreground rounded-full px-1.5">
                {attemptedRows.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderTable(filtered, "No ToS events recorded yet.")}</TabsContent>
        <TabsContent value="agreed">{renderTable(acceptedRows, "No accepted events yet.")}</TabsContent>
        <TabsContent value="attempted">
          {renderTable(
            attemptedRows,
            "Nobody has tried to register or create a deal without agreeing — perfect.",
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTermsAcceptanceTab;