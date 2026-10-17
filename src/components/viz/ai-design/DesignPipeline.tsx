"use client";

import { useState } from "react";
import { PlayPause, Segmented, Toggle, VizFrame } from "@/components/lesson";
import { Arrow, SvgCanvas, vizColors } from "@/components/viz/shared";
import { ActionButton, CurveArrow, cx, useRunClock } from "./ui";
import { r3 } from "./num";
import {
  DEFECTS,
  STAGES,
  buildScript,
  snapshotAt,
  type CheckState,
  type DefectId,
  type StageState,
  type Tone,
} from "./pipelineModel";

const STEP_S = 0.6;
const NODE_W = 150;
const NODE_H = 66;
const POS = [
  { x: 8, y: 62 },
  { x: 192, y: 62 },
  { x: 376, y: 62 },
  { x: 560, y: 62 },
  { x: 560, y: 226 },
  { x: 376, y: 226 },
  { x: 192, y: 226 },
];
const BORDER: Record<StageState, string> = { idle: "#3b4660", active: vizColors.cyan, pass: vizColors.green, fail: vizColors.red };
const CHECK_FILL: Record<CheckState, string> = { idle: "none", pass: vizColors.green, fail: vizColors.red, skipped: "none" };
const CHECK_MARK: Record<CheckState, { mark: string; cls: string }> = {
  idle: { mark: "·", cls: "text-muted" },
  pass: { mark: "✓", cls: "text-green-400" },
  fail: { mark: "✗", cls: "text-red-400" },
  skipped: { mark: "–", cls: "text-amber-300" },
};
const TONE_CLASS: Record<Tone, string> = {
  info: "border-border bg-bg text-text",
  ok: "border-green-400/40 bg-green-400/10 text-green-100",
  bad: "border-red-400/50 bg-red-400/10 text-red-100",
  warn: "border-amber-400/50 bg-amber-400/10 text-amber-100",
};
const INJECTABLE = DEFECTS.filter((d) => d.id !== "none").map((d) => d.id);

function center(i: number) {
  return { x: POS[i].x + NODE_W / 2, y: POS[i].y + NODE_H / 2 };
}

/** Seven pipeline stages with two checks each. Inject a defect to watch a check fail and the loop return to the stage that can fix it. */
export function DesignPipeline() {
  const [defect, setDefect] = useState<DefectId>("none");
  const [dfa, setDfa] = useState(true);
  const [pinned, setPinned] = useState<number | null>(null);
  const [bump, setBump] = useState(0);

  const script = buildScript(defect, dfa);
  const clock = useRunClock(true, (script.length - 1) * STEP_S);
  const index = Math.max(0, Math.min(Math.floor(clock.t / STEP_S) + bump, script.length - 1));
  const snap = snapshotAt(script, index);
  const focus = pinned ?? snap.active ?? (snap.finished ? STAGES.length - 1 : 0);
  const stage = STAGES[focus];
  const pulse = r3(0.45 + 0.35 * Math.sin(clock.t * 6)); // an opacity, so 3 decimals
  const dash = -clock.t * 36;

  const restart = () => {
    clock.reset();
    setBump(0);
    clock.setPlaying(true);
  };
  const choose = (d: DefectId) => {
    setDefect(d);
    restart();
  };
  const inject = () => {
    const next = INJECTABLE[(INJECTABLE.indexOf(defect) + 1) % INJECTABLE.length];
    choose(next);
  };
  const atEnd = index >= script.length - 1;

  const loopSim = snap.loop?.from === 3 && snap.loop.to === 2;
  const loopDfm = snap.loop?.from === 5 && snap.loop.to === 4;
  const flowLit = (i: number) => snap.stages[i] === "pass";

  return (
    <VizFrame
      title="Design pipeline: stages, checks and feedback loops"
      description="Watch a heat-pump design move through seven stages. Inject a defect to see which check catches it and where the loop returns. Click a stage for its inputs and outputs."
      controls={
        <>
          <Segmented
            label="Scenario"
            value={defect}
            onChange={choose}
            options={DEFECTS.map((d) => ({ value: d.id, label: d.label }))}
          />
          <Toggle label="Assembly-access check (DFA) is written" checked={dfa} onChange={(v) => { setDfa(v); restart(); }} />
          <div className="flex flex-wrap items-center gap-2">
            <PlayPause
              playing={clock.playing}
              onToggle={() => {
                if (clock.done) setBump(0);
                clock.toggle();
              }}
              onReset={() => {
                clock.reset();
                setBump(0);
              }}
              onStep={() => setBump((b) => b + 1)}
            />
            <ActionButton variant="primary" onClick={inject}>
              Inject a defect
            </ActionButton>
          </div>
        </>
      }
      footer={
        <span>
          Try Hidden fastener, then switch the assembly-access check off. With no DFA check written, every DFM rule still passes and the defect reaches the shop floor. Artifacts are illustrative numbers for a 10 kW R290 unit.
        </span>
      }
    >
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <SvgCanvas viewBox="0 0 720 352" title="Seven-stage design pipeline with feedback loops from simulation to component selection and from DFM and DFA checks to geometry" className="min-w-[640px]">
            {/* feedback loops */}
            <CurveArrow
              x1={POS[3].x + NODE_W / 2}
              y1={POS[3].y}
              cx={(POS[3].x + POS[2].x) / 2 + NODE_W / 2}
              cy={4}
              x2={POS[2].x + NODE_W / 2}
              y2={POS[2].y - 2}
              color={loopSim ? vizColors.amber : "#4b5563"}
              width={loopSim ? 2.6 : 1.5}
              dashed
              dashOffset={loopSim ? dash : 0}
            />
            <text x={(POS[3].x + POS[2].x) / 2 + NODE_W / 2} y={24} textAnchor="middle" fontSize="11" fill={loopSim ? vizColors.amber : vizColors.muted}>
              undersized: re-select
            </text>
            <CurveArrow
              x1={POS[5].x + NODE_W / 2}
              y1={POS[5].y + NODE_H}
              cx={(POS[5].x + POS[4].x) / 2 + NODE_W / 2}
              cy={POS[5].y + NODE_H + 54}
              x2={POS[4].x + NODE_W / 2}
              y2={POS[4].y + NODE_H + 2}
              color={loopDfm ? vizColors.amber : "#4b5563"}
              width={loopDfm ? 2.6 : 1.5}
              dashed
              dashOffset={loopDfm ? dash : 0}
            />
            <text x={(POS[5].x + POS[4].x) / 2 + NODE_W / 2} y={POS[5].y + NODE_H + 40} textAnchor="middle" fontSize="11" fill={loopDfm ? vizColors.amber : vizColors.muted}>
              diagnostics: regenerate
            </text>

            {/* flow arrows */}
            {[0, 1, 2].map((i) => (
              <Arrow
                key={i}
                x1={POS[i].x + NODE_W + 2}
                y1={POS[i].y + NODE_H / 2}
                x2={POS[i + 1].x - 3}
                y2={POS[i + 1].y + NODE_H / 2}
                color={flowLit(i) ? vizColors.green : "#4b5563"}
                width={2}
                head={7}
              />
            ))}
            <Arrow x1={POS[3].x + NODE_W / 2} y1={POS[3].y + NODE_H + 2} x2={POS[4].x + NODE_W / 2} y2={POS[4].y - 3} color={flowLit(3) ? vizColors.green : "#4b5563"} width={2} head={7} />
            {[4, 5].map((i) => (
              <Arrow
                key={i}
                x1={POS[i].x - 2}
                y1={POS[i].y + NODE_H / 2}
                x2={POS[i + 1].x + NODE_W + 3}
                y2={POS[i + 1].y + NODE_H / 2}
                color={flowLit(i) ? vizColors.green : "#4b5563"}
                width={2}
                head={7}
              />
            ))}

            {/* stages */}
            {STAGES.map((s, i) => {
              const st = snap.stages[i];
              const c = center(i);
              return (
                <g key={s.id} style={{ cursor: "pointer" }} onClick={() => setPinned((p) => (p === i ? null : i))}>
                  {st === "active" && <rect x={POS[i].x - 4} y={POS[i].y - 4} width={NODE_W + 8} height={NODE_H + 8} rx={13} fill="none" stroke={vizColors.cyan} strokeOpacity={pulse} strokeWidth={2} />}
                  <rect x={POS[i].x} y={POS[i].y} width={NODE_W} height={NODE_H} rx={10} fill="#1a2235" stroke={BORDER[st]} strokeWidth={st === "idle" ? 1.5 : 2.5} />
                  {pinned === i && <rect x={POS[i].x - 7} y={POS[i].y - 7} width={NODE_W + 14} height={NODE_H + 14} rx={15} fill="none" stroke={vizColors.amber} strokeDasharray="5 4" />}
                  <text x={POS[i].x + 12} y={POS[i].y + 22} fontSize="13.5" fontWeight="700" fill={vizColors.text}>
                    {i + 1}. {s.title}
                  </text>
                  <text x={POS[i].x + 12} y={POS[i].y + 38} fontSize="11" fill={vizColors.muted}>
                    {s.short}
                  </text>
                  {[0, 1].map((k) => {
                    const cs = snap.checks[i][k];
                    return (
                      <circle
                        key={k}
                        cx={POS[i].x + 18 + k * 20}
                        cy={POS[i].y + 53}
                        r={5.5}
                        fill={CHECK_FILL[cs]}
                        stroke={cs === "idle" ? "#4b5563" : cs === "skipped" ? vizColors.amber : CHECK_FILL[cs]}
                        strokeDasharray={cs === "skipped" ? "2 2" : undefined}
                        strokeWidth={1.6}
                      >
                        <title>{`${s.checks[k]}: ${cs}`}</title>
                      </circle>
                    );
                  })}
                  <text x={c.x + 52} y={POS[i].y + 57} fontSize="10" fill={vizColors.muted} textAnchor="end">
                    {st === "pass" ? "passed" : st === "fail" ? "failed" : st === "active" ? "working" : ""}
                  </text>
                </g>
              );
            })}

            {snap.escaped && (
              <g>
                <rect x="8" y="318" width="400" height="28" rx="7" fill="#7f1d1d" fillOpacity="0.9" stroke={vizColors.red} />
                <text x="208" y="336" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fecaca">
                  Defect escaped: found on the shop floor
                </text>
              </g>
            )}
          </SvgCanvas>
        </div>
        <p className="text-xs text-muted sm:hidden">Swipe sideways to see the whole diagram.</p>

        <p role="status" className={cx("rounded-md border px-3 py-2 text-sm", TONE_CLASS[snap.tone])}>
          <span className="mr-2 font-mono text-xs text-muted">
            step {index + 1} / {script.length}
          </span>
          {snap.message}
        </p>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pipeline stages">
          {STAGES.map((s, i) => {
            const st = snap.stages[i];
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={pinned === i}
                onClick={() => setPinned((p) => (p === i ? null : i))}
                className={cx(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  pinned === i ? "border-amber-400 bg-amber-400/15" : "border-border hover:bg-surface-2",
                  st === "fail" && "text-red-300",
                  st === "pass" && "text-green-300",
                  st === "active" && "text-cyan-300",
                )}
              >
                {i + 1} {s.title}
                <span className="sr-only"> ({st})</span>
              </button>
            );
          })}
          {pinned !== null && (
            <button type="button" onClick={() => setPinned(null)} className="rounded-md px-2.5 py-1 text-xs text-muted hover:text-text">
              Follow the animation
            </button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-bg p-4 text-sm">
          <p className="font-semibold">
            Stage {focus + 1}: {stage.title}
            <span className="ml-2 text-xs font-normal text-muted">{pinned === null ? "(following the animation)" : "(pinned)"}</span>
          </p>
          <p className="mt-1 text-muted">{stage.agent}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">Inputs</p>
              <ul className="list-disc space-y-1 pl-4">
                {stage.inputs.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">Outputs</p>
              <ul className="list-disc space-y-1 pl-4">
                {stage.outputs.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">Checks</p>
              <ul className="space-y-1">
                {stage.checks.map((label, k) => {
                  const cs = snap.checks[focus][k];
                  const m = CHECK_MARK[cs];
                  return (
                    <li key={label}>
                      <span className={cx("mr-1.5 font-mono", m.cls)} aria-label={cs === "idle" ? "not run yet" : cs}>
                        {m.mark}
                      </span>
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Typical tools: {stage.tools}.</p>
        </div>

        <ol className="space-y-1 text-xs text-muted" aria-label="Run log">
          {snap.log.slice(-5).map((entry, i, arr) => (
            <li key={`${snap.log.length - arr.length + i}`} className={cx(i === arr.length - 1 && "text-text", entry.tone === "bad" && "text-red-300", entry.tone === "warn" && "text-amber-200")}>
              {entry.text}
            </li>
          ))}
        </ol>
        {atEnd && <p className="text-xs text-muted">Run finished. Press Reset to watch it again, or pick another scenario.</p>}
      </div>
    </VizFrame>
  );
}
