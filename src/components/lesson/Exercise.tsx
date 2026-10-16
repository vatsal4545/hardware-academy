import type { ReactNode } from "react";

export function Exercise({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-green-400/30 bg-green-400/5 p-5">
      <p className="font-mono text-xs uppercase tracking-wide text-green-300">Practice</p>
      <h3 className="mt-1 text-lg font-semibold">{title}</h3>
      <div className="prose-ha mt-2 text-sm">{children}</div>
    </div>
  );
}
