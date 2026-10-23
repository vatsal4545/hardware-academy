import type { ReactNode } from "react";
import { GoDeeper } from "./GoDeeper";
import { QuickCheck } from "./QuickCheck";

export interface ConceptStepProps {
  /** Step number shown in the badge, starting at 1. */
  n: number;
  title: string;
  /** The step's picture: a <Picture> comparison or a <Figure> diagram. */
  picture: ReactNode;
  /** At most one <KeyNumber>. */
  keyNumber?: ReactNode;
  /** Today's text for this part of the lesson, word for word. */
  deeper?: ReactNode;
  /** Id of a quick check in the lesson's data, shown at the end of the step. */
  check?: string;
  /** The simple explanation: 2-5 short sentences. */
  children: ReactNode;
}

/** One small step of "Build it up". The data attributes mark the parts the readability gate measures. */
export function ConceptStep({ n, title, picture, keyNumber, deeper, check, children }: ConceptStepProps) {
  return (
    <article data-step={n} aria-labelledby={`step-${n}-title`} className="reveal space-y-5 rounded-2xl border border-border bg-surface/60 p-5 sm:p-6">
      <header className="flex items-start gap-3">
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--track)/20 font-mono text-sm font-semibold text-(--track)">
          {n}
        </span>
        <h3 id={`step-${n}-title`} className="pt-0.5 text-xl font-semibold tracking-tight">
          {title}
        </h3>
      </header>
      <div data-layer="simple" className="simple-text">
        {children}
      </div>
      <div data-picture="">{picture}</div>
      {keyNumber}
      {deeper && <GoDeeper>{deeper}</GoDeeper>}
      {check && <QuickCheck id={check} />}
    </article>
  );
}
