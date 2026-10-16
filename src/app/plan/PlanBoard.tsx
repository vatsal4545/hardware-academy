"use client";

import Link from "next/link";
import { useState } from "react";
import { days, lessonBySlug } from "@/lib/curriculum";
import { labById } from "@/lib/labs";
import { useProgress } from "@/lib/progress";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const capstone = [
  ["Run mock interview mode twice", "/interview"],
  ["Read the careers page and pick a target role", "/careers"],
  ["Build the robot and record a 30-second demo", "/learn/robotics/build-your-smart-robot"],
  ["Order the KiCad motor-driver board", "/learn/pcb/kicad-project-walkthrough"],
  ["Write up the PID tuning and simulator work", "/labs/pid"],
] as const;

export function PlanBoard() {
  const { state, markComplete, unmark, ready, exportJson, importJson, reset } = useProgress();
  const [json, setJson] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        {days.map((d) => {
          const ls = d.lessonSlugs.map((s) => lessonBySlug(s)).filter((l) => l !== undefined);
          const dayLabs = d.labIds.map((id) => labById(id)).filter((l) => l !== undefined);
          const minutes = ls.reduce((s, l) => s + l.minutes, 0) + dayLabs.reduce((s, l) => s + l.minutes, 0);
          const total = ls.length + dayLabs.length;
          const done = ls.filter((l) => state.completed[l.slug]).length + dayLabs.filter((l) => state.labs[l.id]).length;
          return (
            <Card key={d.day} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-semibold">
                  <span className="font-mono text-muted">Day {d.day}</span> {d.title}
                </h2>
                {minutes > 0 && <span className="shrink-0 font-mono text-xs text-muted">{minutes} min</span>}
              </div>
              <p className="text-sm text-muted">{d.focus}</p>
              <ul className="space-y-1.5">
                {ls.map((l) => (
                  <li key={l.slug} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      aria-label={`Mark ${l.title} complete`}
                      checked={Boolean(state.completed[l.slug])}
                      disabled={!ready}
                      onChange={(e) => (e.target.checked ? markComplete(l.slug) : unmark(l.slug))}
                      className="accent-cyan-400"
                    />
                    <Link href={`/learn/${l.track}/${l.slug}`} className="hover:underline">
                      {l.title}
                    </Link>
                    <span className="ml-auto shrink-0 font-mono text-xs text-muted">{l.minutes} min</span>
                  </li>
                ))}
                {dayLabs.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden
                      className={cn("h-3.5 w-3.5 rounded-sm border", state.labs[l.id] ? "border-cyan-400 bg-cyan-400" : "border-border")}
                    />
                    <Link href={`/labs/${l.id}`} className="hover:underline">
                      Lab: {l.title}
                    </Link>
                    <span className="ml-auto shrink-0 font-mono text-xs text-muted">{l.minutes} min</span>
                  </li>
                ))}
                {d.day === 14 &&
                  capstone.map(([label, href]) => (
                    <li key={href} className="flex items-center gap-2 text-sm">
                      <span aria-hidden className="h-3.5 w-3.5 rounded-sm border border-border" />
                      <Link href={href} className="hover:underline">
                        {label}
                      </Link>
                    </li>
                  ))}
              </ul>
              {total > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border" aria-hidden>
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${(done / total) * 100}%` }} />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="space-y-3">
        <h2 className="font-semibold">Back up your progress</h2>
        <p className="text-sm text-muted">
          Progress is stored in this browser only. Export it as JSON to move to another device, then import it there.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setJson(exportJson())}>
            Export
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMsg(importJson(json) ? "Progress imported." : "That is not valid progress JSON.")}
          >
            Import
          </Button>
          {!confirmReset ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
              Reset all progress
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-300"
              onClick={() => {
                reset();
                setConfirmReset(false);
                setMsg("Progress reset.");
              }}
            >
              Confirm reset
            </Button>
          )}
        </div>
        <textarea
          aria-label="Progress JSON"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={5}
          className="w-full rounded-md border border-border bg-bg p-2 font-mono text-xs"
        />
        {msg && (
          <p className="text-sm text-muted" role="status">
            {msg}
          </p>
        )}
      </Card>
    </div>
  );
}
