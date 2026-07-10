interface StatsBarProps {
  totalCompleted: number;
  totalValue: number;
  avgDealLength: string;
  ctaCard?: React.ReactNode;
  ctaClassName?: string;
}

const StatsBar = ({ totalCompleted, totalValue, avgDealLength, ctaCard, ctaClassName = "" }: StatsBarProps) => {
  return (
    <div className="dash-kpi-grid-wrap">
      <div className="dash-kpi-grid dash-kpi-grid--inner min-w-0 w-full" data-kpi-cells="4">
      <div className="dash-kpi-grid__cell dash-kpi-grid__cell--metric min-h-0 min-w-0" data-onboarding="dashboard-kpi-stats">
        <div className="flex h-full min-h-0 min-w-0 flex-col justify-between gap-2 p-3.5 sm:p-4">
        <div className="flex min-h-0 min-w-0 items-center gap-1.5 sm:gap-2">
          <div className="text-[#88FF6A] shrink-0"><img width="17" height="17" alt="" className="shrink-0" src="/dash-source/image/kpi_total_deals_completed.svg" /></div>
          <p className="dash-metric__title min-w-0 text-xs leading-snug text-[#FFFFFFB2] sm:text-[13px]">
          Total Deals Completed
          </p>
        </div>
        <div className="mt-2 flex min-h-0 items-baseline justify-between gap-2 sm:mt-2.5 sm:gap-3"><p className="dash-metric__value flex min-w-0 items-baseline gap-1 text-lg font-semibold tabular-nums text-white sm:text-xl">{totalCompleted}</p></div>
        </div>
      </div>
      <div className="dash-kpi-grid__cell dash-kpi-grid__cell--metric min-h-0 min-w-0" data-onboarding="dashboard-kpi-stats">
        <div className="flex h-full min-h-0 min-w-0 flex-col justify-between gap-2 p-3.5 sm:p-4">
        <div className="flex min-h-0 min-w-0 items-center gap-1.5 sm:gap-2">
          <div className="text-[#88FF6A] shrink-0"><img width="17" height="17" alt="" className="shrink-0" src="/dash-source/image/kpi_total_usd_dealt.svg" /></div>
          <p className="dash-metric__title min-w-0 text-xs leading-snug text-[#FFFFFFB2] sm:text-[13px]">
          Total USD Value Dealt
          </p>
        </div>
        <div className="mt-2 flex min-h-0 items-baseline justify-between gap-2 sm:mt-2.5 sm:gap-3"><p className="dash-metric__value flex min-w-0 items-baseline gap-1 text-lg font-semibold tabular-nums text-white sm:text-xl">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div>
        </div>
      </div>
      <div className="dash-kpi-grid__cell dash-kpi-grid__cell--metric min-h-0 min-w-0" data-onboarding="dashboard-kpi-stats">
        <div className="flex h-full min-h-0 min-w-0 flex-col justify-between gap-2 p-3.5 sm:p-4">
        <div className="flex min-h-0 min-w-0 items-center gap-1.5 sm:gap-2">
          <div className="text-[#88FF6A] shrink-0"><img width="17" height="17" alt="" className="shrink-0" src="/dash-source/image/kpi_avg_deal_length.svg" /></div>
          <p className="dash-metric__title min-w-0 text-xs leading-snug text-[#FFFFFFB2] sm:text-[13px]">
          Avg. Deal Length
          </p>
        </div>
        <div className="mt-2 flex min-h-0 items-baseline justify-between gap-2 sm:mt-2.5 sm:gap-3"><p className="dash-metric__value flex min-w-0 items-baseline gap-1 text-lg font-semibold tabular-nums text-white sm:text-xl">{avgDealLength}</p></div>
        </div>
      </div>
      {ctaCard && (
        <div className={`dash-kpi-grid__cell dash-kpi-grid__cell--trailing min-h-0 min-w-0 flex flex-col ${ctaClassName}`}>
          <div className="dash-promo-gradient-panel flex min-h-full min-w-0 w-full max-w-full flex-1 flex-col gap-3 overflow-hidden rounded-r-xl px-4 py-3">
            {ctaCard}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default StatsBar;
