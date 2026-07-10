import { ArrowUpRight } from "lucide-react";

const stats = [
  { value: "$130m+", label: "Volume Secured" },
  { value: "24/7", label: "Automated" },
  { value: "<15min", label: "Avg Deal Time" },
  { value: "+1,000,000", label: "Transactions Secured" },
];

const HeroSection = () => {
  const handleHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen overflow-hidden pt-20 sm:pt-24">
      <div className="hero-glow absolute inset-0" />
      {/* Full-width green wave bars at the bottom of the hero (matches halalmm.net) */}
      <div className="hero-wave-bars pointer-events-none absolute inset-x-0 bottom-0 z-0 flex items-end overflow-hidden" aria-hidden="true">
        {[206, 147, 90, 53, 90, 147, 206, 147, 90, 53, 90, 147, 206, 147, 90, 53, 90, 147, 206].map((h, i) => (
          <div key={i} className="hero-wave-bar shrink-0" style={{ height: `${h}px` }} />
        ))}
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 py-10 sm:px-8 sm:py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Left side */}
          <div className="flex flex-col justify-center pt-6 lg:pt-12">
            {/* Trust badge */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[
                  "/images/avatar1.webp",
                  "/images/avatar2.webp",
                  "/images/avatar3.webp",
                  "/images/avatar4.webp",
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="User avatar"
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-full border-2 border-background object-cover"
                  />
                ))}
              </div>
              <div>
                <p className="text-sm text-foreground font-semibold leading-tight">
                  Trusted by
                </p>
                <p className="text-sm text-foreground font-semibold leading-tight">
                  135,000+ users
                </p>
              </div>
            </div>

            {/* Headline */}
            <h1 className="mt-[29px] text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[64px]">
              Secure Crypto{" "}
              <span className="bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-transparent">Deals</span>{" "}
              with Automated Escrow
            </h1>

            <p className="mt-[34px] max-w-lg text-base sm:text-[17px] font-medium text-muted-foreground leading-relaxed">
              Automate your deals with step-by-step escrow designed to protect
              both parties from payment to release.
            </p>

            <div className="relative z-10 mt-[43px] flex flex-wrap gap-3 sm:gap-4">
              <button
                onClick={handleHowItWorks}
                className="inline-flex items-center gap-2 rounded-[14px] bg-secondary px-5 py-2.5 text-[15px] font-semibold text-foreground hover:bg-secondary/80"
              >
                How it works <ArrowUpRight className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          {/* Right side */}
          <div className="flex flex-col">
            {/* Stats 2x2 grid */}
            <div className="mb-8 sm:mb-10 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5 sm:gap-x-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-[28px] sm:text-[34px] font-semibold text-foreground tracking-tight leading-none">{stat.value}</p>
                  <p className="mt-2 text-sm text-zinc-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Dashboard mockup image */}
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-3xl pointer-events-none" />
              <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
                <img
                  src="/images/mock.webp"
                  alt="HalalMM Dashboard"
                  className="w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
