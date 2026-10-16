"use client";

import { useState } from "react";
import type { Scenario } from "@/lib/curriculum";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { vizColors } from "@/components/viz/shared/colors";

export function ScenarioCard({ scenario }: { scenario: Scenario }) {
  const [hints, setHints] = useState(0);
  const [revealed, setRevealed] = useState(false);
  return (
    <Card accent={vizColors.orange} className="space-y-4">
      <p className="font-mono text-xs uppercase tracking-wide text-orange-300">Real-world scenario</p>
      <h3 className="text-lg font-semibold">{scenario.title}</h3>
      <p className="text-text/90">{scenario.context}</p>
      <div>
        <p className="mb-1 text-sm font-semibold text-muted">Symptoms</p>
        <ul className="list-disc pl-5 text-sm">
          {scenario.symptoms.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      {hints > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold text-muted">Hints</p>
          <ol className="list-decimal pl-5 text-sm">
            {scenario.hints.slice(0, hints).map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        </div>
      )}
      {!revealed && (
        <div className="flex flex-wrap gap-2">
          {hints < scenario.hints.length && (
            <Button size="sm" variant="secondary" onClick={() => setHints((h) => h + 1)}>
              Show hint ({hints + 1} of {scenario.hints.length})
            </Button>
          )}
          <Button size="sm" onClick={() => setRevealed(true)}>
            Reveal root cause
          </Button>
        </div>
      )}
      {revealed && (
        <div className="space-y-2 rounded-lg border border-border bg-bg p-4 text-sm">
          <p>
            <span className="font-semibold text-orange-300">Root cause: </span>
            <span>{scenario.rootCause}</span>
          </p>
          <p>
            <span className="font-semibold text-green-300">Fix: </span>
            <span>{scenario.fix}</span>
          </p>
          <p>
            <span className="font-semibold text-cyan-300">Lesson: </span>
            <span>{scenario.lesson}</span>
          </p>
        </div>
      )}
    </Card>
  );
}
