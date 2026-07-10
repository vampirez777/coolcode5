const coins = [
  { name: "Bitcoin", image: "/images/coin-btc.webp" },
  { name: "Ethereum", image: "/images/coin-eth.webp" },
  { name: "Solana", image: "/images/coin-sol.webp" },
  { name: "Litecoin", image: "/images/coin-ltc.webp" },
  { name: "USDT (Solana)", image: "/images/coin-usdt-sol.webp" },
  { name: "USDT (Ethereum)", image: "/images/coin-usdt-eth.webp" },
  { name: "USDT (BSC)", image: "/images/coin-usdt-bsc.webp" },
  { name: "USDC (Solana)", image: "/images/coin-usdc-sol.webp?v=2" },
  { name: "USDC (Ethereum)", image: "/images/coin-usdc-eth.webp?v=2" },
];

const SupportedCoins = () => {
  return (
    <section id="coins" className="border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="mb-10 sm:mb-16 text-center">
          <p className="text-sm sm:text-base text-muted-foreground font-medium">Supported Coins</p>
        </div>

        <div className="grid grid-cols-3 gap-6 sm:gap-8 sm:grid-cols-3 md:grid-cols-5">
          {coins.slice(0, 5).map((coin) => (
            <div key={coin.name} className="flex flex-col items-center gap-2 sm:gap-3">
              <img src={coin.image} alt={coin.name} className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full object-contain" />
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">{coin.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 sm:mt-8 grid grid-cols-2 gap-6 sm:gap-8 sm:grid-cols-4 max-w-3xl mx-auto">
          {coins.slice(5).map((coin) => (
            <div key={coin.name} className="flex flex-col items-center gap-2 sm:gap-3">
              <img src={coin.image} alt={coin.name} className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full object-contain" />
              <span className="text-xs sm:text-sm font-medium text-foreground text-center">{coin.name}</span>
            </div>
          ))}
        </div>

        <p className="mt-10 sm:mt-12 text-center text-xs sm:text-sm text-muted-foreground">+ More coming soon</p>
      </div>
    </section>
  );
};

export default SupportedCoins;
