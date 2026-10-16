"use client";

import { cn } from "@/lib/cn";

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-sm"
    >
      <span className="text-muted">{label}</span>
      <span aria-hidden className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-cyan-400" : "bg-border")}>
        <span
          className={cn(
            "absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-4.5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
