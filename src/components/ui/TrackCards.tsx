"use client";

import Link from "next/link";
import { tracks, lessonsFor } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { Card } from "./Card";

export function TrackCards() {
  const { state } = useProgress();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tracks.map((t) => {
        const ls = lessonsFor(t.id);
        const done = ls.filter((l) => state.completed[l.slug]).length;
        const pct = ls.length ? done / ls.length : 0;
        return (
          <Link key={t.id} href={`/learn/${t.id}`} className="group block">
            <Card accent={t.color} className="h-full transition-colors group-hover:bg-surface-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">{t.days}</span>
                <span className="font-mono text-xs" style={{ color: t.color }}>
                  {done}/{ls.length}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-muted">{t.tagline}</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-border" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: t.color }} />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
