import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import StatsBar from "@/components/StatsBar";

const HeroBars = () => (
  <div aria-hidden="true" className="absolute inset-0 z-0 flex items-end overflow-hidden">
    {[111, 133.8, 151.6, 202, 151.6, 133.8, 111, 133.8, 151.6, 202, 151.6, 133.8, 111, 133.8, 151.6].map((height, index) => (
      <div key={index} className="dash-hero__bar shrink-0" style={{ "--dash-hero-bar-width": "95.55px", "--dash-hero-bar-height": `${height}px` } as CSSProperties} />
    ))}
  </div>
);

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

const Dashboard = () => {
  const [username, setUsername] = useState("User");
  const [currentProfile, setCurrentProfile] = useState<ProfileSummary | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileSummary>>({});
  const [userId, setUserId] = useState("");
  const [dashboardTab, setDashboardTab] = useState<"open" | "closed">("open");
  const [chartRange, setChartRange] = useState(7);
  const [chartMenuOpen, setChartMenuOpen] = useState(false);
  const [chartCustomizing, setChartCustomizing] = useState(false);
  const [presetTotalDeals, setPresetTotalDeals] = useState<number | null>(null);
  const [presetTotalUsd, setPresetTotalUsd] = useState<number | null>(null);
  const [presetAvgSeconds, setPresetAvgSeconds] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const [{ data: profile }, { data: dealsData }] = await Promise.all([
        supabase.from("profiles").select("username, display_name, avatar_url, preset_total_deals, preset_total_usd, preset_avg_deal_seconds").eq("user_id", session.user.id).maybeSingle(),
        supabase
          .from("deals")
          .select("*")
          .or(`creator_id.eq.${session.user.id},other_user_id.eq.${session.user.id}`)
          .order("created_at", { ascending: false }),
      ]);

      const ownProfile = { name: profile?.username || profile?.display_name || "User", avatarUrl: profile?.avatar_url || null };
      setUsername(ownProfile.name);
      setCurrentProfile(ownProfile);
      setDeals(dealsData || []);
      setPresetTotalDeals((profile as any)?.preset_total_deals ?? null);
      setPresetTotalUsd((profile as any)?.preset_total_usd ?? null);
      setPresetAvgSeconds((profile as any)?.preset_avg_deal_seconds ?? null);

      const ids = new Set<string>();
      (dealsData || []).forEach((deal: any) => {
        if (deal.creator_id) ids.add(deal.creator_id);
        if (deal.other_user_id) ids.add(deal.other_user_id);
      });
      if (ids.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", Array.from(ids));
        const map: Record<string, ProfileSummary> = {};
        (profiles || []).forEach((p: any) => { map[p.user_id] = { name: p.username || p.display_name || "Unknown", avatarUrl: p.avatar_url || null }; });
        setProfilesMap(map);
      }
    };
    load();
  }, []);

  const completedDeals = deals.filter((deal) => deal.status === "completed");
  const openDeals = deals.filter((deal) => !["completed", "cancelled", "refunded"].includes(deal.status));
  const closedDeals = deals.filter((deal) => ["completed", "cancelled", "refunded"].includes(deal.status));
  const totalValue = completedDeals.reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0);

  const getProfile = (id?: string | null) => id ? profilesMap[id] || { name: "Loading…", avatarUrl: null } : { name: "Waiting", avatarUrl: null };
  const getUsername = (id?: string | null) => getProfile(id).name;
  const getOtherId = (deal: any) => deal.creator_id === userId ? deal.other_user_id : deal.creator_id;
  const getOtherParty = (deal: any) => getUsername(getOtherId(deal));
  const findCoinMeta = (name?: string | null, network?: string | null) => COINS.find(c => c.name === name && (!network || c.network === network)) || COINS.find(c => c.name === name) || null;
  const chartData = Array.from({ length: chartRange }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (chartRange - 1 - index));
    const key = date.toDateString();
    const dayDeals = completedDeals.filter((deal) => new Date(deal.completed_at || deal.updated_at || deal.created_at).toDateString() === key);
    const lengths = dayDeals
      .map((deal) => {
        const start = new Date(deal.created_at).getTime();
        const end = new Date(deal.completed_at || deal.updated_at || deal.created_at).getTime();
        return Math.max(0, (end - start) / 1000);
      })
      .filter((seconds) => Number.isFinite(seconds));
    const avgLength = lengths.length ? lengths.reduce((sum, value) => sum + value, 0) / lengths.length : 0;
    return {
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: dayDeals.length,
      avgLength: Number(avgLength.toFixed(2)),
    };
  });
  const maxCompleted = Math.max(1, ...chartData.map((d) => d.completed));
  const maxLength = Math.max(0.5, ...chartData.map((d) => d.avgLength));

  const DealsTable = ({ title, rows }: { title: string; rows: any[] }) => (
    <div className="deals-table__panel deals-table__panel-layout deals-table__panel--rounded-xl">
      <div className="deals-table__title-row deals-table__title-row--padded">
        <div className="deals-table__title-heading">
          <h2 className="deals-table__title deals-table__title--white">{title}<span className="deals-table__title-count">({rows.length})</span></h2>
        </div>
      </div>
      <div className="deals-table__body-outer">
        <div className="deals-table__body-scroll deals-table__scroll--default-pad dash-table-fixed-height">
        <table className="deals-table__table deals-table__table-wrap">
          <thead>
            <tr className="deals-table__thead-row">
              <th className="deals-table__th deals-table__th--left deals-table__th--tl deals-table__th--involved-users"><span className="deals-table__involved-heading deals-table__involved-heading--wide">Involved User(s)</span><span className="deals-table__involved-heading deals-table__involved-heading--narrow">Other Party</span></th>
              <th className="deals-table__th deals-table__th--center">Coin</th>
              <th className="deals-table__th deals-table__th--left">Amount</th>
              <th className="deals-table__th deals-table__th--left deals-table__th--status-col">Status</th>
              <th className="deals-table__th deals-table__th--center deals-table__th--tr deals-table__view-col">View</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="deals-table__tbody-empty"><td colSpan={5} className="deals-table__empty-td">No deals yet.</td></tr>
            ) : rows.slice(0, 6).map((deal) => (
              <tr key={deal.id} className="deals-table__data-row deals-table-row-unread deals-table__row--selectable" role="button" onClick={() => { window.location.href = `/deals?deal=${deal.id}`; }}>
                <td className="deals-table__td deals-table__cell-pad deals-table__td--involved-users">
                  <div className="deals-table__users-grid deals-table__users-grid--involved-pair">
                    <span className="deals-table__user-cell"><div className="deals-table__user-avatar"><UserAvatar profile={getProfile(getOtherId(deal))} fallback={getOtherParty(deal)} /></div><span className="deals-table__user-name-truncate">{getOtherParty(deal)}</span></span>
                    <span className="deals-table__user-cell"><div className="deals-table__user-avatar"><UserAvatar profile={currentProfile} fallback="Me" /></div><span className="deals-table__user-name-truncate deals-table__user-name--self">Me</span></span>
                  </div>
                  <div className="deals-table__users-compact-other"><span className="deals-table__user-cell"><div className="deals-table__user-avatar"><UserAvatar profile={getProfile(getOtherId(deal))} fallback={getOtherParty(deal)} /></div><span className="deals-table__user-name-truncate">{getOtherParty(deal)}</span></span></div>
                </td>
                <td className="deals-table__td deals-table__cell-pad"><div className="deals-table__cell-text deals-table__cell-inner deals-table__cell-inner--center">{findCoinMeta(deal.coin, deal.coin_network) ? <div className="deals-table__coin deals-table__coin-wrap"><span className="deals-table__coin-inner deals-table__coin-inner-flex"><img src={findCoinMeta(deal.coin, deal.coin_network)!.image} alt={deal.coin || "Coin"} className="deals-table__coin-img object-contain" loading="lazy" /></span></div> : deal.coin || "-"}</div></td>
                <td className="deals-table__td deals-table__cell-pad"><span className="deals-table__cell-text">{deal.amount ? `$${Number(deal.amount).toLocaleString()}` : "-"}</span></td>
                <td className="deals-table__td deals-table__cell-pad deals-table__status-cell"><span className="deals-table__cell-text deals-table__amount-truncate">{String(deal.status || "pending").replace(/_/g, " ")}</span></td>
                <td className="deals-table__td deals-table__cell-pad deals-table__view-col"><div className="deals-table__view-cell"><Link className="deals-table__view-link-btn" to={`/deals?deal=${deal.id}`}>View</Link></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <div className="deals-table__footer-bar">
        Create another deal? <Link className="deals-table__load-more" to="/deals?new=1">Click here</Link>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="dash-dashboard-stack">
        <div className="relative flex min-w-0 w-full flex-col gap-8">
          <HeroBars />
          <div className="relative z-10 flex min-w-0 w-full flex-col gap-8">
            <div className="grid min-w-0 w-full gap-4 grid-cols-1">
              <div className="min-w-0 justify-self-stretch">
                <div>
                  <h1 className="dash-header__title text-[22px] font-semibold leading-tight tracking-[-0.02em] text-white lg:text-[25px] lg:leading-[20px]">Welcome Back, {username}</h1>
                  <p className="dash-header__subtitle mt-[16px] text-[17px] font-medium leading-[20px] tracking-normal text-[#FFFFFF99]">Here's an overview of your deals and activity.</p>
                </div>
              </div>
            </div>

            <StatsBar
              totalCompleted={(presetTotalDeals ?? 0) + completedDeals.length}
              totalValue={(Number(presetTotalUsd) || 0) + totalValue}
              avgDealLength={presetAvgSeconds != null ? `${(presetAvgSeconds / 60).toFixed(1)} min` : "-"}
              ctaClassName="dashboard-get-started-cell"
              ctaCard={
                <>
                  <div>
                    <h3 className="dash-promo-gradient-panel__title">Get Started Now</h3>
                    <p className="dash-promo-gradient-panel__desc mt-0.5">Head to the deals page</p>
                  </div>
                  <Link to="/deals?new=1" className="dash-promo-gradient-panel__cta inline-flex items-center justify-center gap-2 rounded-lg text-white cursor-pointer hover:opacity-90" data-onboarding="dashboard-get-started">
                    Create Deal <img alt="" className="shrink-0" height="12" src="/dash-source/image/ui_arrow_external_up_right.svg" width="12" />
                  </Link>
                </>
              }
            />
          </div>
        </div>
        <div aria-hidden="true" className="dash-hairline-divider" />
        <div className="dash-tap-none dash-chart-card min-w-0 w-full select-none p-4 lg:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 md:max-w-[min(100%,28rem)] md:shrink-0">
              <div className="flex items-center gap-2"><span className="text-[#88FF6A]"><img alt="" className="shrink-0" height="17" src="/dash-source/image/kpi_total_deals_completed.svg" width="17" /></span><h2 className="dash-chart__title text-lg font-semibold text-white">Deals per day</h2></div>
              <p className="dash-chart__font-body mt-1 text-sm text-[#FFFFFFB2]">Completed deals finished on each day (last 7 days)</p>
            </div>
            <div className="dash-chart-toolbar md:min-h-0 md:flex-1">
              <div className="dash-chart-toolbar__legends"><span className="dash-chart-toolbar__legend"><span aria-hidden="true" className="dash-chart-toolbar__legend-dot bg-[#88FF6A]" /><span className="dash-chart-toolbar__legend-text dash-chart-toolbar__legend-text--full">Completed Deals</span><span className="dash-chart-toolbar__legend-text dash-chart-toolbar__legend-text--short">Completed</span></span><span className="dash-chart-toolbar__legend"><span aria-hidden="true" className="dash-chart-toolbar__legend-dot bg-[#FF3B3B]" /><span className="dash-chart-toolbar__legend-text dash-chart-toolbar__legend-text--full">Avg. Deal Length (sec)</span><span className="dash-chart-toolbar__legend-text dash-chart-toolbar__legend-text--short">Avg. length</span></span></div>
              <div className="dash-chart-toolbar__actions"><button className={`dash-chart-toolbar__btn ${chartCustomizing ? "dash-chart-toolbar__btn--active" : ""}`} type="button" aria-pressed={chartCustomizing} onClick={() => setChartCustomizing((value) => !value)}><img alt="" className="shrink-0" height="16" src="/dash-source/image/chart_customize_sliders_17x16.svg" width="17" />Customize</button><div className="dash-chart-toolbar__range-slot"><div className="dash-chart-range shrink-0"><button aria-expanded={chartMenuOpen} aria-haspopup="listbox" aria-label="Chart time range" className="dash-chart-range__trigger" type="button" onClick={() => setChartMenuOpen((value) => !value)}><img alt="" className="shrink-0" height="17" src="/dash-source/image/kpi_avg_deal_length.svg" width="17" /><span className="dash-chart-range__label dash-chart-range__label--full">Last {chartRange} days</span><span className="dash-chart-range__label dash-chart-range__label--short">{chartRange}d</span><span aria-hidden="true" className="inline-block shrink-0 bg-current dash-chart-range__trigger-chevron" /></button>{chartMenuOpen && <div className="dash-chart-range__menu" role="listbox" aria-label="Chart time range options">{[7, 14, 30].map((days) => <button key={days} type="button" role="option" aria-selected={chartRange === days} className="dash-chart-range__option" onClick={() => { setChartRange(days); setChartMenuOpen(false); }}>Last {days} days</button>)}</div>}</div></div></div>
            </div>
          </div>
          <div className={`dash-tap-none chart-no-focus mt-6 w-full min-w-0 rounded-[13px] border border-[#262626] overflow-hidden pt-6 pb-6 select-none ${chartCustomizing ? "dash-chart-placeholder--customizing" : ""}`}>
            <div className="h-[240px] w-full min-h-[240px] min-w-0 lg:h-[280px] lg:min-h-[280px] [&_.recharts-surface]:outline-none [&_.recharts-surface]:select-none">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#88FF6A" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#88FF6A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="redFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF3B3B" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#FF3B3B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#FFFFFF80", fontSize: 12 }} />
                  <YAxis yAxisId="left" domain={[0, maxCompleted]} ticks={[0, maxCompleted]} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#FFFFFF80", fontSize: 12 }} width={32} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, Math.max(0.5, maxLength)]} ticks={[0, 0.1, 0.3, 0.4, 0.5]} axisLine={false} tickLine={false} tick={{ fill: "#FFFFFF80", fontSize: 12 }} tickFormatter={(v) => `${v}s`} width={40} />
                  <ReferenceLine yAxisId="left" y={0} stroke="#FFFFFF1A" />
                  <ReferenceLine yAxisId="left" y={maxCompleted} stroke="#FFFFFF1A" strokeDasharray="6 6" />
                  <Tooltip contentStyle={{ background: "#101010", border: "1px solid #262626", borderRadius: 8, color: "#fff" }} labelStyle={{ color: "#FFFFFFB2" }} formatter={(value: any, name: string) => name === "avgLength" ? [`${value}s`, "Avg. Length"] : [value, "Completed"]} />
                  <Area yAxisId="left" type="monotone" dataKey="completed" name="Deals per day" stroke="#88FF6A" strokeWidth={2} fill="url(#greenFill)" />
                  <Area yAxisId="right" type="monotone" dataKey="avgLength" name="Avg. deal length" stroke="#FF3B3B" strokeWidth={2} fill="url(#redFill)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="dashboard-deals-tabs" role="tablist" aria-label="Dashboard deals"><button aria-selected={dashboardTab === "open"} className={`u-font-body min-h-11 flex-1 rounded-md px-2 text-sm font-medium transition-colors cursor-pointer ${dashboardTab === "open" ? "bg-[#1f1f1f] text-white" : "text-[#FFFFFF80] hover:text-white"}`} type="button" onClick={() => setDashboardTab("open")}>Open ({openDeals.length})</button><button aria-selected={dashboardTab === "closed"} className={`u-font-body min-h-11 flex-1 rounded-md px-2 text-sm font-medium transition-colors cursor-pointer ${dashboardTab === "closed" ? "bg-[#1f1f1f] text-white" : "text-[#FFFFFF80] hover:text-white"}`} type="button" onClick={() => setDashboardTab("closed")}>Closed ({closedDeals.length})</button></div>
        <div className="min-w-0"><div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <div className={dashboardTab === "open" ? "min-w-0" : "min-w-0 dashboard-tab-panel--inactive"}><DealsTable title="Open Deals" rows={openDeals} /></div>
          <div className={dashboardTab === "closed" ? "min-w-0" : "min-w-0 dashboard-tab-panel--inactive"}><DealsTable title="Closed Deals" rows={closedDeals} /></div>
        </div></div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
