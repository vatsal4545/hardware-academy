"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { LESSON_PARTS, type LessonPart } from "./lessonParts";

/**
 * The list of the lesson's parts; the part nearest the top of the screen is marked as the current location. It isn't
 * sticky itself: the lesson shell that places it keeps it in view.
 */
export function OnThisPage({ parts = LESSON_PARTS }: { parts?: readonly LessonPart[] }) {
  const [active, setActive] = useState(parts[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = parts.find((p) => visible.get(p.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    for (const p of parts) {
      const el = document.getElementById(p.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [parts]);

  return (
    <nav aria-label="On this page" className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">On this page</p>
      <ol className="space-y-1 text-sm">
        {parts.map((p, i) => {
          const current = p.id === active;
          return (
            <li key={p.id}>
              <a
                href={`#${p.id}`}
                aria-current={current ? "location" : undefined}
                className={cn("flex items-center gap-2 rounded-md px-2 py-1.5", current ? "bg-surface-2 text-text" : "text-muted hover:text-text")}
              >
                <span className={cn("font-mono text-xs", current && "text-(--track)")}>{String(i + 1).padStart(2, "0")}</span>
                {p.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
