import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CTASection = () => {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthed(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);
  return (
    <section className="border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card text-center">
          <div className="absolute inset-0 green-bars opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-background/80" />

          <div className="relative px-4 py-14 sm:px-6 sm:py-20 md:py-28">
            <h2 className="mb-4 text-2xl font-bold text-foreground sm:text-4xl md:text-5xl">
              Ready to deal securely?
            </h2>
            <p className="mx-auto mb-8 sm:mb-10 max-w-lg text-sm sm:text-base text-muted-foreground">
              Join thousands of users using Halal MM to secure crypto deals with
              fast, automated escrow.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
              <Button onClick={() => navigate("/auth")} className="rounded-full bg-white px-6 sm:px-8 py-3 text-sm sm:text-base font-semibold text-black hover:bg-white/90">
                Sign Up Now <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate(isAuthed ? "/deals" : "/auth")}
                variant="outline"
                className="rounded-full border-border bg-secondary/50 px-6 sm:px-8 py-3 text-sm sm:text-base text-foreground hover:bg-secondary"
              >
                Create Deal <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
