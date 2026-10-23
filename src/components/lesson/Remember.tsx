import { Bookmark, Check } from "lucide-react";
import type { Formula, KeyTerm } from "@/lib/curriculum";
import { FormulaCard } from "./FormulaCard";
import { GoDeeper } from "./GoDeeper";

/** End-of-lesson summary: the takeaways, the formulas, and every key term in a fold-out. */
export function Remember({ takeaways, formulas = [], keyTerms }: { takeaways: string[]; formulas?: Formula[]; keyTerms: KeyTerm[] }) {
  return (
    <section id="remember" aria-labelledby="remember-heading" className="scroll-mt-20 space-y-4">
      <h2 id="remember-heading" className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
        <Bookmark aria-hidden className="h-5 w-5 text-(--track)" />
        Remember this
      </h2>
      <ul className="space-y-2">
        {takeaways.map((t) => (
          <li key={t} className="flex gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--track)" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      {formulas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {formulas.map((f) => (
            <FormulaCard key={f.expr} formula={f} />
          ))}
        </div>
      )}
      <GoDeeper summary={`All key terms (${keyTerms.length})`}>
        <dl className="space-y-3 text-sm">
          {keyTerms.map((k) => (
            <div key={k.term}>
              <dt className="font-semibold">{k.term}</dt>
              {k.plain && <dd className="text-text/90">{k.plain}</dd>}
              <dd className="text-muted">{k.def}</dd>
            </div>
          ))}
        </dl>
      </GoDeeper>
    </section>
  );
}
