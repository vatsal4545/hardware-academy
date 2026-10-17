import type { LessonReference, Reference } from "@/lib/references-format";
import { formatCitation, referenceLink } from "@/lib/references-format";

const kindLabel: Record<Reference["kind"], string> = {
  book: "Book",
  paper: "Paper",
  standard: "Standard",
  doc: "Documentation",
  report: "Report",
};

export function ReferenceList({ items }: { items: Array<LessonReference & { ref: Reference }> }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Where the ideas in this lesson come from, and what to read next. Books are the standard texts; papers are the
        original sources; standards are what employers work to.
      </p>
      <ol className="space-y-3">
        {items.map(({ ref, read }) => {
          const href = referenceLink(ref);
          return (
            <li key={ref.id} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">{kindLabel[ref.kind]}</span>
                {ref.free && <span className="rounded bg-green-400/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-green-300">free online</span>}
              </div>
              <p className="mt-1">
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="font-medium underline decoration-border underline-offset-4 hover:text-text">
                    {formatCitation(ref)}
                  </a>
                ) : (
                  <span className="font-medium">{formatCitation(ref)}</span>
                )}
                {ref.doi && <span className="ml-2 font-mono text-xs text-muted">doi:{ref.doi}</span>}
              </p>
              <p className="mt-1 text-muted">
                <span className="text-text">Read: </span>
                {read}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
