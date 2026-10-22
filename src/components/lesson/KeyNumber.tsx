import type { ReactNode } from "react";
import { Hash } from "lucide-react";

/** One number worth remembering, and what it means. */
export function KeyNumber({ value, children }: { value: string; children: ReactNode }) {
  return (
    <p data-key-number="" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border bg-surface-2/60 px-4 py-2.5">
      <Hash aria-hidden className="h-4 w-4 self-center text-(--track)" />
      <span className="font-mono text-lg font-semibold text-(--track)">{value}</span>
      <span className="text-sm text-text/90">{children}</span>
    </p>
  );
}
