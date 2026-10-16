"use client";

import Link from "next/link";
import { labs } from "@/lib/labs";
import { trackById } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { Card } from "@/components/ui/Card";
import { TrackPill } from "@/components/ui/TrackPill";

export function LabList() {
  const { state } = useProgress();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {labs.map((lab) => (
        <Link key={lab.id} href={`/labs/${lab.id}`} className="group block">
          <Card className="h-full transition-colors group-hover:bg-surface-2">
            <div className="flex items-center justify-between gap-3">
              <TrackPill track={trackById(lab.track)} />
              <span className="font-mono text-xs text-muted">{state.labs[lab.id] ? "done" : `${lab.minutes} min`}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold">{lab.title}</h2>
            <p className="mt-1 text-sm text-muted">{lab.description}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
