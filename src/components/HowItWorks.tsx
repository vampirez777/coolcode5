const steps = [
  {
    title: "Create a deal",
    description: "Create a deal through your dash. Select currency, amount, and other party",
    image: null,
    mockup: true,
  },
  {
    title: "Deposit to Escrow",
    description: "Sender deposits crypto to our secure escrow wallet, confirming transaction",
    image: "/images/step-2.webp",
  },
  {
    title: "Complete the Trade",
    description: "Both parties fulfill obligations. Receiver confirms they've received amount",
    image: "/images/step-3.webp?v=2",
  },
  {
    title: "Funds Released",
    description: "Once both users confirm, we release the crypto to the receiver, deal complete!",
    image: "/images/step-4.webp",
  },
];

const bulletPoints = [
  {
    title: "Automated Escrow",
    description: "Funds stay in escrow until both sides finish the deal. No manual handling, no extra risk.",
  },
  {
    title: "Step-by-Step Flow",
    description: "Every part of the deal is guided, from payment to release. No confusion, no skipped steps.",
  },
  {
    title: "Fast Transactions",
    description: "Deals usually complete in minutes, with instant payment detection and quick confirmations.",
  },
  {
    title: "Multi-Coin & Stablecoin Support",
    description: "Trade using major cryptocurrencies like BTC, ETH, LTC, SOL, and stablecoins such as USDT and USDC.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="mb-10 sm:mb-16 text-center">
          <p className="mb-3 text-sm text-primary font-medium uppercase tracking-wider">How it works</p>
          <h2 className="text-3xl font-bold text-foreground sm:text-5xl tracking-tight">Clear, fast, and simple</h2>
        </div>

        {/* Steps - 2x2 grid with large cards */}
        <div className="mb-12 sm:mb-16 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => {
            return (
              <div
                key={step.title}
                className="group relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/30"
              >
                <div className="step-card-art flex aspect-[4/3] w-full items-center justify-center overflow-hidden p-4">
                  {step.mockup ? (
                    <div className="w-full max-w-[240px] space-y-2">
                      <div className="flex items-center gap-2 rounded-md bg-zinc-900/80 border border-border/60 px-2.5 py-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F7931A] text-[10px] font-bold text-black">₿</div>
                        <span className="text-xs font-medium text-foreground">Bitcoin</span>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-zinc-900/80 border border-border/60 px-2.5 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#627EEA] text-[10px] font-bold text-white">Ξ</div>
                          <span className="text-xs font-medium text-foreground">Ethereum</span>
                        </div>
                        <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-zinc-900/80 border border-border/60 px-2.5 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">$</div>
                          <span className="text-xs text-muted-foreground">Enter Amount</span>
                        </div>
                        <span className="text-xs font-medium text-foreground tabular-nums">100.00</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-1 items-center gap-2 rounded-md bg-zinc-900/80 border border-border/60 px-2.5 py-2">
                          <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                          <span className="text-xs text-muted-foreground">Find party</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-md bg-zinc-900/80 border border-border/60 px-2 py-1.5">
                          <div className="h-4 w-4 rounded-full bg-gradient-to-br from-primary to-primary/40" />
                          <span className="text-[11px] font-medium text-foreground">Matthew S</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={step.image!}
                      alt={step.title}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <div className="p-6">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                <div className="absolute right-4 top-4 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground/50 font-bold backdrop-blur">
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bullet points */}
        <div className="grid gap-6 sm:grid-cols-2">
          {bulletPoints.map((point) => (
            <div key={point.title} className="flex gap-3">
              <svg className="mt-1 h-5 w-5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12.5l4 4L13 9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 12.5l4 4L21 9" />
              </svg>
              <div>
                <h4 className="font-semibold text-foreground">{point.title}</h4>
                <p className="text-sm text-muted-foreground">{point.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
