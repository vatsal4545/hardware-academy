import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/** A fold-out for the full engineering text. Native <details>: closed by default, and the text stays in the page. */
export function GoDeeper({ summary = "Go deeper: the full engineering version", children }: { summary?: string; children: ReactNode }) {
  return (
    <details data-deeper="" className="group rounded-xl border border-dashed border-border bg-bg/40">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-muted hover:text-text [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 motion-safe:transition-transform group-open:rotate-90" />
        {summary}
      </summary>
      <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}
