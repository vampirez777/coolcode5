import { useState } from "react";
import { Calculator, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import StepShell from "./StepShell";

interface Props {
  step: number;
  total: number;
  onSuccess: () => void;
}

interface Question {
  text: string;
  answer: number;
  options: number[];
}

function buildQuestion(): Question {
  const ops = ["+", "−", "×"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 0, b = 0, answer = 0, text = "";
  if (op === "+") {
    a = 5 + Math.floor(Math.random() * 25);
    b = 5 + Math.floor(Math.random() * 25);
    answer = a + b; text = `${a} + ${b}`;
  } else if (op === "−") {
    a = 15 + Math.floor(Math.random() * 35);
    b = 1 + Math.floor(Math.random() * (a - 1));
    answer = a - b; text = `${a} − ${b}`;
  } else {
    a = 2 + Math.floor(Math.random() * 11);
    b = 2 + Math.floor(Math.random() * 11);
    answer = a * b; text = `${a} × ${b}`;
  }
  // 4 unique options including the answer
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const delta = (Math.floor(Math.random() * 9) - 4) || 1;
    const cand = Math.max(0, answer + delta * (1 + Math.floor(Math.random() * 3)));
    set.add(cand);
  }
  const options = Array.from(set).sort(() => Math.random() - 0.5);
  return { text, answer, options };
}

const MathStep = ({ step, total, onSuccess }: Props) => {
  const [q, setQ] = useState<Question>(() => buildQuestion());
  const [picked, setPicked] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const handlePick = (n: number) => {
    if (advancing) return;
    setPicked(n);
    if (n === q.answer) {
      setError(null);
      setAdvancing(true);
      setTimeout(onSuccess, 450);
    } else {
      setError("Not quite — try a different one.");
      setTimeout(() => {
        setQ(buildQuestion());
        setPicked(null);
        setError(null);
      }, 700);
    }
  };

  return (
    <StepShell
      step={step}
      total={total}
      icon={<Calculator className="h-8 w-8 text-primary" />}
      title="Quick brain check"
      description="A simple equation to confirm you're human. Pick the correct answer."
    >
      <div className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background/40 to-background/40 p-8 mb-5 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.08),transparent_70%)]" />
        <div className="relative text-5xl font-bold tracking-tight font-mono text-foreground select-none text-center">
          {q.text} <span className="text-primary">= ?</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {q.options.map((opt) => {
          const isPicked = picked === opt;
          const isRight = advancing && opt === q.answer;
          const isWrong = isPicked && opt !== q.answer;
          return (
            <Button
              key={opt}
              variant={isRight ? "default" : isWrong ? "destructive" : "outline"}
              size="lg"
              onClick={() => handlePick(opt)}
              disabled={advancing}
              className={`h-16 text-xl font-bold font-mono transition-all duration-200 ${
                isRight ? "scale-105 shadow-[0_0_24px_hsl(var(--primary)/0.4)]" : ""
              } ${isWrong ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
            >
              <span className="flex items-center gap-1.5">
                {isRight && <CheckCircle2 className="h-5 w-5" />}
                {isWrong && <X className="h-5 w-5" />}
                {opt}
              </span>
            </Button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-destructive mt-4 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
      {advancing && (
        <div className="flex items-center justify-center gap-2 text-sm text-primary mt-4 font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" /> Correct! Continuing…
        </div>
      )}
    </StepShell>
  );
};

export default MathStep;
