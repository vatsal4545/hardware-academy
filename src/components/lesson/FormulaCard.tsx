import { Sigma } from "lucide-react";
import type { Formula } from "@/lib/curriculum";

/** A formula with the meaning of each symbol under it. */
export function FormulaCard({ formula }: { formula: Formula }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <Sigma aria-hidden className="h-4 w-4 text-(--track)" />
        Formula
      </p>
      <p className="mt-2 font-mono text-lg text-white">{formula.expr}</p>
      <dl className="mt-3 space-y-1 text-sm">
        {formula.parts.map((p) => (
          <div key={p.symbol} className="flex gap-3">
            <dt className="min-w-14 font-mono text-(--track)">{p.symbol}</dt>
            <dd className="text-text/90">{p.meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
