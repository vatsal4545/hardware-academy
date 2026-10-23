import type { ReactNode } from "react";
import { Eye } from "lucide-react";

/** An everyday comparison drawn out, with one line on where the comparison stops being true. */
export function Picture({ title, breaks, children }: { title: string; breaks: string; children: ReactNode }) {
  return (
    <figure className="rounded-xl border border-border bg-surface p-4">
      <figcaption className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Eye aria-hidden className="h-4 w-4 text-(--track)" />
        Picture it: {title}
      </figcaption>
      <div className="mx-auto max-w-3xl">{children}</div>
      <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
        <span className="font-semibold text-text">Where this picture stops being true: </span>
        {breaks}
      </p>
    </figure>
  );
}
