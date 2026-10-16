import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Kind = "info" | "tip" | "warning" | "interview";

const styles: Record<Kind, { box: string; label: string }> = {
  info: { box: "border-blue-400/40 bg-blue-400/10", label: "Note" },
  tip: { box: "border-green-400/40 bg-green-400/10", label: "Tip" },
  warning: { box: "border-orange-400/40 bg-orange-400/10", label: "Watch out" },
  interview: { box: "border-violet-400/40 bg-violet-400/10", label: "Interview angle" },
};

export function Callout({ kind = "info", title, children }: { kind?: Kind; title?: string; children: ReactNode }) {
  const s = styles[kind];
  return (
    <aside role="note" className={cn("rounded-lg border px-4 py-3 text-sm", s.box)}>
      <p className="mb-1 font-semibold">{title ?? s.label}</p>
      <div className="text-text/90 [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </aside>
  );
}
