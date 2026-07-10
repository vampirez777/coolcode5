const features = [
  {
    title: "Fully Automated Escrow",
    description: "Create deals, fund escrow, and release payments through a guided flow built to keep both parties aligned from start to finish.",
    image: "/images/feature-escrow.webp",
  },
  {
    title: "24/7 Operation",
    description: "Trade anytime. Halal MM runs around the clock so users can complete deals without waiting on manual staff availability.",
    image: "/images/feature-247.webp",
  },
  {
    title: "Custom Integration",
    description: "Built to fit your workflow with a smooth interface, automated deal steps, and tools designed for digital trading communities.",
    image: "/images/feature-integration.webp",
  },
  {
    title: "Lowest Fees",
    description: "Simple, competitive pricing with transparent fees so users always know exactly what they are paying before a deal begins.",
    image: "/images/feature-fees.webp",
  },
  {
    title: "Lightning Fast",
    description: "Payments are detected quickly and deals move fast, helping users complete transactions in minutes instead of hours.",
    image: "/images/feature-fast.webp",
  },
  {
    title: "Auto Backup",
    description: "All deals are securely stored and logged. Users can revisit past transactions or contact support for assistance at any time.",
    image: "/images/feature-backup.webp",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="mb-10 sm:mb-12">
          <p className="mb-3 text-sm text-muted-foreground font-medium">Features</p>
          <h2 className="text-3xl font-bold text-foreground sm:text-5xl tracking-tight">Everything you need, covered</h2>
        </div>

        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            return (
              <div
                key={feature.title}
                className="feature-card group rounded-[16px] border border-border/70 p-6 sm:p-7 min-h-[220px] transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="relative mb-5 h-10 w-10 shrink-0 overflow-hidden">
                  <img
                    src={feature.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width={40}
                    height={40}
                    className="h-full w-full object-contain"
                  />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
