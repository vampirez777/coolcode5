import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  RefreshCw,
  Loader2,
  Globe,
  Wifi,
  Ban,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SecurityEvent {
  id: string;
  event_type: string;
  success: boolean | null;
  ip_hash: string | null;
  country: string | null;
  is_vpn: boolean | null;
  is_proxy: boolean | null;
  is_tor: boolean | null;
  is_datacenter: boolean | null;
  user_agent: string | null;
  error_codes: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface GateBlock {
  id: string;
  browser_id: string;
  reason: string;
  risk_score: number;
  user_agent: string | null;
  ip_hash: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

type Filter = "all" | "captcha_success" | "captcha_failure" | "vpn_check";
type Window = "1h" | "24h" | "7d" | "30d";

const windowToHours: Record<Window, number> = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 };

const AdminSecurityTab = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [windowSel, setWindowSel] = useState<Window>("24h");
  const [blocks, setBlocks] = useState<GateBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - windowToHours[windowSel] * 3600 * 1000).toISOString();
    let query = supabase
      .from("security_events")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    if (filter !== "all") query = query.eq("event_type", filter);
    const { data } = await query;
    setEvents((data as SecurityEvent[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, windowSel]);

  const loadBlocks = async () => {
    setBlocksLoading(true);
    const { data } = await supabase
      .from("gate_blocks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setBlocks((data as GateBlock[]) || []);
    setBlocksLoading(false);
  };

  useEffect(() => {
    loadBlocks();
  }, []);

  const handleUnblock = async (block: GateBlock) => {
    setUnblocking(block.id);
    const { error } = await supabase.from("gate_blocks").delete().eq("id", block.id);
    setUnblocking(null);
    if (error) {
      toast({ title: "Could not unblock", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Browser unblocked" });
    setBlocks((prev) => prev.filter((b) => b.id !== block.id));
  };

  const stats = useMemo(() => {
    const cap = events.filter((e) => e.event_type.startsWith("captcha"));
    const ok = cap.filter((e) => e.success).length;
    const fail = cap.filter((e) => !e.success).length;
    const total = ok + fail;
    const failRate = total ? Math.round((fail / total) * 100) : 0;

    const vpn = events.filter((e) => e.event_type === "vpn_check");
    const flagged = vpn.filter((e) => e.is_vpn || e.is_proxy || e.is_tor).length;
    const vpnRate = vpn.length ? Math.round((flagged / vpn.length) * 100) : 0;

    return {
      ok,
      fail,
      failRate,
      vpnTotal: vpn.length,
      vpnFlagged: flagged,
      vpnRate,
    };
  }, [events]);

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Captcha passed"
          value={stats.ok}
          icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
          tone="emerald"
        />
        <StatCard
          label="Captcha failed"
          value={stats.fail}
          icon={<ShieldX className="h-4 w-4 text-destructive" />}
          tone="destructive"
          sub={`${stats.failRate}% fail rate`}
        />
        <StatCard
          label="VPN checks"
          value={stats.vpnTotal}
          icon={<Globe className="h-4 w-4 text-primary" />}
          tone="primary"
        />
        <StatCard
          label="Flagged as VPN"
          value={stats.vpnFlagged}
          icon={<ShieldAlert className="h-4 w-4 text-amber-500" />}
          tone="amber"
          sub={`${stats.vpnRate}% of checks`}
        />
      </div>

      {/* Access blocks ("Please try again later") */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              Access blocks
              <span className="text-xs font-normal text-muted-foreground">
                ({blocks.length})
              </span>
            </CardTitle>
            <Button size="sm" variant="outline" onClick={loadBlocks} disabled={blocksLoading}>
              {blocksLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Browsers flagged as risky during the entry verification flow. They
            see "Please try again later." until you remove the block here.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-medium">Blocked at</th>
                  <th className="text-left p-3 font-medium">Browser</th>
                  <th className="text-left p-3 font-medium">Reason</th>
                  <th className="text-left p-3 font-medium">Risk</th>
                  <th className="text-left p-3 font-medium">User agent</th>
                  <th className="text-right p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {blocks.length === 0 && !blocksLoading && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No active blocks. Risky visitors will appear here automatically.
                    </td>
                  </tr>
                )}
                {blocks.map((b) => (
                  <tr key={b.id} className="border-b border-border/30 hover:bg-muted/30 align-top">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono text-xs text-foreground">
                      {b.browser_id.slice(0, 12)}…
                    </td>
                    <td className="p-3">
                      <Badge variant="destructive" className="text-[10px]">{b.reason}</Badge>
                    </td>
                    <td className="p-3 text-foreground font-mono text-xs">{b.risk_score}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[260px] truncate">
                      {b.user_agent || "—"}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleUnblock(b)}
                        disabled={unblocking === b.id}
                      >
                        {unblocking === b.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><Trash2 className="h-3 w-3 mr-1" />Unblock</>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">Security event log</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <SelectTrigger className="w-[170px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  <SelectItem value="captcha_success">Captcha success</SelectItem>
                  <SelectItem value="captcha_failure">Captcha failure</SelectItem>
                  <SelectItem value="vpn_check">VPN checks</SelectItem>
                </SelectContent>
              </Select>
              <Select value={windowSel} onValueChange={(v) => setWindowSel(v as Window)}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last hour</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3 font-medium">When</th>
                  <th className="text-left p-3 font-medium">Event</th>
                  <th className="text-left p-3 font-medium">Result</th>
                  <th className="text-left p-3 font-medium">Country</th>
                  <th className="text-left p-3 font-medium">Flags</th>
                  <th className="text-left p-3 font-medium">IP hash</th>
                  <th className="text-left p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No events in this window.
                    </td>
                  </tr>
                )}
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-border/30 hover:bg-muted/30 align-top">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium text-foreground">{prettyType(e.event_type)}</td>
                    <td className="p-3">{resultBadge(e)}</td>
                    <td className="p-3 text-foreground">{e.country || "—"}</td>
                    <td className="p-3"><FlagPills e={e} /></td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {e.ip_hash ? e.ip_hash.slice(0, 12) + "…" : "—"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[260px]">
                      {(e.error_codes && e.error_codes.length > 0) && (
                        <span className="text-destructive">{e.error_codes.join(", ")}</span>
                      )}
                      {e.metadata && (
                        <span className="block truncate">{JSON.stringify(e.metadata)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ---------- helpers ---------- */

function prettyType(t: string) {
  switch (t) {
    case "captcha_success": return "Captcha success";
    case "captcha_failure": return "Captcha failure";
    case "vpn_check":       return "VPN check";
    default:                return t;
  }
}

function resultBadge(e: SecurityEvent) {
  if (e.event_type === "captcha_success") {
    return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Pass</Badge>;
  }
  if (e.event_type === "captcha_failure") {
    return <Badge variant="destructive">Fail</Badge>;
  }
  if (e.event_type === "vpn_check") {
    if (e.success === false) return <Badge variant="secondary">Lookup err</Badge>;
    if (e.is_vpn || e.is_proxy || e.is_tor) {
      return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">Flagged</Badge>;
    }
    return <Badge variant="secondary">Clean</Badge>;
  }
  return <Badge variant="secondary">—</Badge>;
}

function FlagPills({ e }: { e: SecurityEvent }) {
  if (e.event_type !== "vpn_check") return <span className="text-muted-foreground">—</span>;
  const pills: { label: string; on: boolean }[] = [
    { label: "VPN", on: !!e.is_vpn },
    { label: "Proxy", on: !!e.is_proxy },
    { label: "Tor", on: !!e.is_tor },
    { label: "DC", on: !!e.is_datacenter },
  ];
  const active = pills.filter((p) => p.on);
  if (active.length === 0) return <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Wifi className="h-3 w-3" />Clean</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {active.map((p) => (
        <span
          key={p.label}
          className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-500 border border-amber-500/30"
        >
          {p.label}
        </span>
      ))}
    </div>
  );
}

const toneMap = {
  emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  primary: "bg-primary/10 text-primary border-primary/20",
  amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
} as const;

function StatCard({
  label,
  value,
  icon,
  sub,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  sub?: string;
  tone: keyof typeof toneMap;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${toneMap[tone]}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
            {sub && <p className="text-[11px] text-muted-foreground/80 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminSecurityTab;