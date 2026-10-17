"use client";

import { useState } from "react";
import { VizFrame } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { TOOL_COLOR, nodes, symptoms, type FlowOption, type Symptom } from "./DebugFlowchartData";
import { ShortHunt } from "./DebugFlowchartShortHunt";

interface TrailEntry {
  id: string;
  /** the answer chosen to leave this step */
  tag?: string;
}

const buttonClass =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface px-3 py-1.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

const NODE_H = 42;
const GAP = 28;
const TRAIL_W = 340;

/** The path taken so far, drawn as a small flowchart with the chosen answers on the arrows. */
function Trail({ trail }: { trail: TrailEntry[] }) {
  const height = trail.length * (NODE_H + GAP) - GAP + 16;
  return (
    <SvgCanvas viewBox={`0 0 ${TRAIL_W} ${height}`} title="The measurements and answers so far, as a flowchart">
      {trail.map((entry, i) => {
        const node = nodes[entry.id];
        const y = 8 + i * (NODE_H + GAP);
        const last = i === trail.length - 1;
        const colour = node.kind === "step" ? TOOL_COLOR[node.tool] : vizColors.green;
        return (
          <g key={`${entry.id}-${i}`}>
            <rect x={10} y={y} width={TRAIL_W - 20} height={NODE_H} rx={7} fill="#121826" stroke={colour} strokeWidth={last ? 2.2 : 1.2} opacity={last ? 1 : 0.85} />
            <Label x={20} y={y + 13} anchor="start" size={10} color={colour} bold>
              {node.kind === "step" ? node.tool : "Likely cause"}
            </Label>
            <Label x={20} y={y + 29} anchor="start" size={13} color={vizColors.text}>
              {node.short}
            </Label>
            {entry.tag && (
              <g>
                <Arrow x1={44} y1={y + NODE_H} x2={44} y2={y + NODE_H + GAP - 1} color={vizColors.muted} width={1.6} head={7} />
                <Label x={56} y={y + NODE_H + GAP / 2} anchor="start" size={11} color={vizColors.muted}>
                  {entry.tag}
                </Label>
              </g>
            )}
          </g>
        );
      })}
    </SvgCanvas>
  );
}

function DecisionTree() {
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const current = trail.length > 0 ? nodes[trail[trail.length - 1].id] : null;

  function start(s: Symptom) {
    setTrail([{ id: s.start }]);
  }
  function choose(o: FlowOption) {
    setTrail((t) => [...t.slice(0, -1), { ...t[t.length - 1], tag: o.tag }, { id: o.to }]);
  }
  function back() {
    setTrail((t) => (t.length <= 1 ? [] : [...t.slice(0, -2), { id: t[t.length - 2].id }]));
  }

  return (
    <VizFrame
      title="Debug decision tree: from a symptom to a measurement to a cause"
      description="Pick what you see on the bench, then answer each measurement. The chart on the left records your path; the card on the right says what to measure next and, at the end, what it probably is."
      footer={
        <p>
          Every branch ends in a likely cause and a fix to try, never in a guess: each step names the instrument, what to probe and what the
          readings mean. Change one thing at a time and write it down.
        </p>
      }
    >
      {!current ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">What is the board doing?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {symptoms.map((s) => (
              <button key={s.id} type="button" className={buttonClass} onClick={() => start(s)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <Trail trail={trail} />
          </div>
          <div className="space-y-3" data-testid="flow-card" aria-live="polite">
            {current.kind === "step" ? (
              <>
                <p className="font-mono text-xs uppercase tracking-wide" style={{ color: TOOL_COLOR[current.tool] }}>
                  Tool: {current.tool}
                </p>
                <h4 className="text-lg font-semibold">{current.title}</h4>
                <p className="text-sm">{current.body}</p>
                <div className="grid gap-2">
                  {current.options.map((o) => (
                    <button key={o.to} type="button" className={buttonClass} onClick={() => choose(o)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="font-mono text-xs uppercase tracking-wide text-green-300">Likely cause</p>
                <h4 className="text-lg font-semibold">{current.cause}</h4>
                <p className="text-sm">
                  <strong>Why:</strong> {current.why}
                </p>
                <p className="text-sm">
                  <strong>Try:</strong> {current.fix}
                </p>
              </>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={buttonClass} onClick={back}>
                Back one step
              </button>
              <button type="button" className={buttonClass} onClick={() => setTrail([])}>
                Start over
              </button>
            </div>
          </div>
        </div>
      )}
    </VizFrame>
  );
}

export function DebugFlowchart() {
  return (
    <div className="space-y-6">
      <DecisionTree />
      <ShortHunt />
    </div>
  );
}
