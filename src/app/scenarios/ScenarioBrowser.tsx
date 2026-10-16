"use client";

import Link from "next/link";
import { useState } from "react";
import { tracks, trackById, type Scenario, type TrackId } from "@/lib/curriculum";
import { ScenarioCard } from "@/components/lesson";
import { cn } from "@/lib/cn";

export interface ScenarioItem {
  slug: string;
  track: TrackId;
  lessonTitle: string;
  scenario: Scenario;
}

export function ScenarioBrowser({ items }: { items: ScenarioItem[] }) {
  const [filter, setFilter] = useState<TrackId | "all">("all");
  const shown = filter === "all" ? items : items.filter((i) => i.track === filter);
  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label="Filter by track" className="flex flex-wrap gap-2">
        {[{ id: "all" as const, name: "All", color: "#e5e7eb" }, ...tracks].map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={filter === t.id}
            onClick={() => setFilter(t.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              filter === t.id ? "border-text bg-surface-2 text-text" : "border-border text-muted hover:text-text",
            )}
            style={filter === t.id && t.id !== "all" ? { borderColor: t.color, color: t.color } : undefined}
          >
            {t.name}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{shown.length} scenarios</p>
      <div className="grid gap-6 lg:grid-cols-2">
        {shown.map((item) => (
          <div key={item.slug} className="space-y-2">
            <ScenarioCard scenario={item.scenario} />
            <p className="text-sm text-muted">
              From{" "}
              <Link href={`/learn/${item.track}/${item.slug}`} className="underline hover:text-text">
                {item.lessonTitle}
              </Link>{" "}
              <span style={{ color: trackById(item.track).color }}>· {trackById(item.track).name}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
