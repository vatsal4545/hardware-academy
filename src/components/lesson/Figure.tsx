import type { ReactNode } from "react";

export function Figure({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="rounded-xl border border-border bg-surface p-4">
      <div className="mx-auto max-w-3xl">{children}</div>
      <figcaption className="mt-3 text-center text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}
