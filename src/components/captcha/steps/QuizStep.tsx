import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import StepShell from "./StepShell";

interface QuizQuestion {
  q: string;
  options: string[];
}

const QUESTIONS: QuizQuestion[] = [
  {
    q: "What is the core principle of a halal escrow service?",
    options: [
      "Holding funds safely until both parties are satisfied",
      "Charging interest on every transaction",
      "Hiding fees from the buyer",
      "Releasing funds before delivery",
    ],
  },
  {
    q: "Which of these is most aligned with Islamic finance values?",
    options: [
      "Riba (interest)",
      "Honest, transparent trade",
      "Hidden contracts",
      "Speculative gambling",
    ],
  },
  {
    q: "Why use a middleman for crypto trades between strangers?",
    options: [
      "To protect both buyer and seller from fraud",
      "To delay the deal forever",
      "To leak personal information",
      "To charge surprise interest",
    ],
  },
];

interface Props {
  step: number;
  total: number;
  /** Called with per-question elapsed time in ms when the quiz completes. */
  onComplete: (timings: number[]) => void;
}

const QuizStep = ({ step, total, onComplete }: Props) => {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timings, setTimings] = useState<number[]>([]);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    setSelected(null);
  }, [index]);

  const current = QUESTIONS[index];
  const isLast = index === QUESTIONS.length - 1;

  const handleNext = () => {
    if (selected === null) return;
    const elapsed = Date.now() - startedAt.current;
    const next = [...timings, elapsed];
    if (isLast) {
      onComplete(next);
    } else {
      setTimings(next);
      setIndex(index + 1);
    }
  };

  return (
    <StepShell
      step={step}
      total={total}
      icon={
        <img
          src="/images/auto-bot.gif"
          alt="Halal Bot"
          className="h-12 w-12 rounded-xl object-cover"
        />
      }
      title="A few quick questions"
      description="Our halal bot just wants to get to know you. There are no wrong answers — pick whichever feels right."
    >
      <div className="w-full text-left space-y-4">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider">
          <span className="font-semibold text-muted-foreground">
            Question {index + 1} <span className="text-muted-foreground/50">/ {QUESTIONS.length}</span>
          </span>
          <span className="font-medium text-primary/80 inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Halal Bot
          </span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
          <p className="text-sm font-medium text-foreground leading-relaxed">{current.q}</p>
        </div>

        <div className="space-y-2">
          {current.options.map((opt, i) => {
            const isPicked = selected === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={`group w-full text-left rounded-xl border p-3 text-sm transition-all ${
                  isPicked
                    ? "border-primary bg-primary/10 text-foreground shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                    : "border-border/60 bg-background/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
                      isPicked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {isPicked && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                  <span>{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleNext}
          disabled={selected === null}
          className="w-full"
          size="lg"
        >
          {isLast ? (
            <><CheckCircle2 className="h-4 w-4 mr-2" /> Finish quiz</>
          ) : (
            <>Next question <ChevronRight className="h-4 w-4 ml-2" /></>
          )}
        </Button>
      </div>
    </StepShell>
  );
};

export default QuizStep;