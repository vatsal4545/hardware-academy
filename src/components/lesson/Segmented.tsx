"use client";

import { cn } from "@/lib/cn";

export interface SegmentedProps<T extends string> {
  label?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="text-sm">
      {label && <span className="mb-1 block text-muted">{label}</span>}
      <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-md border border-border bg-bg p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded px-3 py-1 transition-colors",
              o.value === value ? "bg-surface-2 text-text" : "text-muted hover:text-text",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
