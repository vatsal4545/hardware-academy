"use client";

import Link from "next/link";
import { lessonsFor, type TrackId } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/cn";

export function TrackLessonList({ track }: { track: TrackId }) {
  const { state } = useProgress();
  const ls = lessonsFor(track);
  const byDay = new Map<number, typeof ls>();
  for (const l of ls) byDay.set(l.day, [...(byDay.get(l.day) ?? []), l]);
  return (
    <div className="space-y-8">
      {[...byDay.entries()].map(([day, items]) => (
        <section key={day} aria-labelledby={`day-${day}`}>
          <h2 id={`day-${day}`} className="mb-3 font-mono text-sm text-muted">
            Day {day}
          </h2>
          <ol className="divide-y divide-border rounded-xl border border-border bg-surface">
            {items.map((l) => {
              const done = Boolean(state.completed[l.slug]);
              return (
                <li key={l.slug}>
                  <Link
                    href={`/learn/${l.track}/${l.slug}`}
                    className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span
                      aria-label={done ? "completed" : "not completed"}
                      className={cn(
                        "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]",
                        done ? "border-green-400 bg-green-400 text-bg" : "border-border text-transparent",
                      )}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{l.title}</span>
                      <span className="block text-sm text-muted">{l.summary}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted">{l.minutes} min</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
