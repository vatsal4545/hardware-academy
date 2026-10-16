"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface StepperProps {
  steps: { title: string; body: ReactNode }[];
  index: number;
  onChange: (i: number) => void;
  autoplayMs?: number;
}

export function Stepper({ steps, index, onChange, autoplayMs }: StepperProps) {
  const [auto, setAuto] = useState(false);
  const last = steps.length - 1;
  const i = Math.max(0, Math.min(index, last));
  const step = steps[i];

  useEffect(() => {
    if (!auto || !autoplayMs) return;
    const id = setInterval(() => onChange((i + 1) % steps.length), autoplayMs);
    return () => clearInterval(id);
  }, [auto, autoplayMs, i, onChange, steps.length]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-xs text-muted">
          Step {i + 1} / {steps.length}
        </span>
        <h4 className="font-semibold">{step.title}</h4>
      </div>
      <div>{step.body}</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => onChange(Math.max(0, i - 1))} disabled={i === 0}>
          Previous
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onChange(Math.min(last, i + 1))} disabled={i === last}>
          Next
        </Button>
        {autoplayMs && (
          <Button size="sm" variant="ghost" onClick={() => setAuto((a) => !a)} aria-pressed={auto}>
            {auto ? "Pause" : "Auto-play"}
          </Button>
        )}
        <ol className="ml-auto flex gap-1.5" aria-label="Steps">
          {steps.map((s, k) => (
            <li key={k}>
              <button
                type="button"
                aria-label={`Go to step ${k + 1}: ${s.title}`}
                aria-current={k === i ? "step" : undefined}
                onClick={() => onChange(k)}
                className={cn("block h-2.5 w-2.5 rounded-full", k === i ? "bg-cyan-400" : k < i ? "bg-muted" : "bg-border")}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
