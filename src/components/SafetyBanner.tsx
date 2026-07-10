import { X } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "safety-banner-dismissed";

const SafetyBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="relative w-full bg-[#0a0a0a] border-b border-border/60">
      <div className="mx-auto flex items-center justify-center px-10 py-2.5">
        <p className="text-center text-[13px] font-normal text-foreground/90">
          Always state deal details and usernames in on-site chat to prevent off-platform scams.
        </p>
      </div>
      <button
        aria-label="Dismiss"
        onClick={() => {
          sessionStorage.setItem(STORAGE_KEY, "1");
          setVisible(false);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default SafetyBanner;