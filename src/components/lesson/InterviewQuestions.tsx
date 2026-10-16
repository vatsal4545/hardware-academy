import type { InterviewQuestion } from "@/lib/curriculum";
import { cn } from "@/lib/cn";

export function InterviewQuestions({ items }: { items: InterviewQuestion[] }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <details key={i} className="group rounded-lg border border-border bg-surface open:bg-surface-2/40">
          <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 text-sm font-medium">
            <span
              className={cn(
                "mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase",
                it.level === "deep" ? "bg-violet-400/20 text-violet-300" : "bg-cyan-400/20 text-cyan-300",
              )}
            >
              {it.level}
            </span>
            <span>{it.q}</span>
          </summary>
          <div className="border-t border-border px-4 py-3 text-sm leading-relaxed text-text/90">{it.a}</div>
        </details>
      ))}
    </div>
  );
}
