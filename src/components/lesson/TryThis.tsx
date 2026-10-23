"use client";

import { useId, useState, type ReactNode } from "react";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/cn";

/** "Things to try" with the interactive, as a checklist the reader ticks off. Not saved. */
export function TryThis({ items }: { items: ReactNode[] }) {
  // Keyed by position, so an item added later starts unticked.
  const [done, setDone] = useState<Record<number, boolean>>({});
  const id = useId();
  const headingId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="rounded-xl border border-border bg-surface p-4">
      <p id={headingId} className="flex items-center gap-2 text-sm font-semibold">
        <ListChecks aria-hidden className="h-4 w-4 text-(--track)" />
        Try this
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            <label htmlFor={`${id}-${i}`} className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                id={`${id}-${i}`}
                type="checkbox"
                checked={!!done[i]}
                onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                className="mt-1 accent-cyan-400"
              />
              <span className={cn(done[i] && "text-muted line-through")}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
