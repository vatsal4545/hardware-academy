"use client";

import { useState } from "react";
import { PlayPause, VizFrame } from "@/components/lesson";
import { SvgCanvas, vizColors } from "@/components/viz/shared";
import { ActionButton, cx, useRunClock } from "./ui";
import { FAIL_ROW, KIND_LABEL, LIFELINES, PASS_ROW, ROWS, type RowKind } from "./mcpModel";

const STEP_S = 1.1;
const X = [90, 270, 450, 630];
const TOP = 94;
const GAP = 30;
const HEIGHT = TOP + GAP * ROWS.length + 20;
const KIND_COLOR: Record<RowKind, string> = {
  say: "#e5e7eb",
  call: vizColors.cyan,
  list: vizColors.cyan,
  result: vizColors.muted,
  kernel: vizColors.violet,
  fail: vizColors.red,
  pass: vizColors.green,
  think: vizColors.amber,
};

function rowY(i: number): number {
  return TOP + i * GAP;
}

/** A step-through sequence diagram of one MCP design session, showing the payload of every message. */
export function McpSequence() {
  const [bump, setBump] = useState(0);
  const clock = useRunClock(false, (ROWS.length - 1) * STEP_S);
  const index = Math.max(0, Math.min(Math.floor(clock.t / STEP_S) + bump, ROWS.length - 1));
  const frac = clock.playing ? (clock.t / STEP_S) % 1 : 1;
  const current = ROWS[index];
  const jump = (k: number) => {
    clock.setPlaying(false);
    setBump(k - Math.floor(clock.t / STEP_S));
  };

  return (
    <VizFrame
      title="MCP sequence: one design request, one DFM failure, one retry"
      description="Step through the messages between you, Claude Desktop, the MCP server and the CAD kernel. Each step shows the real payload."
      controls={
        <>
          <PlayPause
            playing={clock.playing}
            onToggle={() => {
              if (clock.done) setBump(0);
              clock.toggle();
            }}
            onReset={() => {
              clock.reset();
              setBump(0);
              clock.setPlaying(false);
            }}
            onStep={() => setBump((b) => b + 1)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton onClick={() => jump(FAIL_ROW)}>Jump to the DFM failure</ActionButton>
            <ActionButton onClick={() => jump(PASS_ROW)}>Jump to the pass</ActionButton>
            <ActionButton variant="ghost" onClick={() => jump(ROWS.length - 1)}>
              Jump to the end
            </ActionButton>
          </div>
        </>
      }
      footer={<span>The tools return results as text, so the model can read a failure, change the design and call again. Nothing here is a special mode: a failed check is just another tool result.</span>}
    >
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <SvgCanvas viewBox={`0 0 720 ${HEIGHT}`} title="Sequence diagram: you ask Claude Desktop for a motor mount, Claude calls MCP tools, the DFM check fails, Claude repairs the design, and the STEP file is exported" className="min-w-[640px]">
            {/* retry loop bracket */}
            {index >= FAIL_ROW && (
              <rect
                x={6}
                y={rowY(FAIL_ROW) - 15}
                width={708}
                height={(Math.min(index, PASS_ROW) - FAIL_ROW) * GAP + 30}
                rx={8}
                fill={vizColors.amber}
                fillOpacity={0.05}
                stroke={vizColors.amber}
                strokeOpacity={0.5}
                strokeDasharray="5 4"
              />
            )}
            {index >= FAIL_ROW && (
              <text x={14} y={rowY(FAIL_ROW) - 21} fontSize="11" fill={vizColors.amber}>
                retry loop
              </text>
            )}

            {/* lifelines */}
            {LIFELINES.map((l, i) => (
              <g key={l.id}>
                <line x1={X[i]} y1={54} x2={X[i]} y2={HEIGHT - 8} stroke="#374151" strokeDasharray="4 5" />
                <rect x={X[i] - 76} y={8} width={152} height={44} rx={9} fill="#1a2235" stroke={i === 2 ? vizColors.cyan : "#3b4660"} strokeWidth={1.5} />
                <text x={X[i]} y={27} textAnchor="middle" fontSize="13" fontWeight="700" fill={vizColors.text}>
                  {l.label}
                </text>
                <text x={X[i]} y={43} textAnchor="middle" fontSize="10.5" fill={vizColors.muted}>
                  {l.sub}
                </text>
              </g>
            ))}

            {/* messages */}
            {ROWS.map((r, i) => {
              const y = rowY(i);
              const shown = i <= index;
              const color = KIND_COLOR[r.kind];
              const x1 = X[r.from];
              const x2 = X[r.to];
              const p = i === index ? frac : 1;
              const reply = r.kind === "result" || r.kind === "fail" || r.kind === "pass";
              if (!shown) {
                return r.from === r.to ? null : <line key={i} x1={x1} y1={y} x2={x2} y2={y} stroke="#2a3447" strokeDasharray="2 5" />;
              }
              if (r.from === r.to) {
                const x = x1;
                return (
                  <g key={i}>
                    {i === index && <rect x={6} y={y - 13} width={708} height={GAP + 12} rx={6} fill="#ffffff" fillOpacity={0.05} />}
                    <path d={`M${x + 3} ${y - 5} h36 v14 h-30`} fill="none" stroke={color} strokeWidth={2} strokeOpacity={p} />
                    <polygon points={`${x + 3},${y + 9} ${x + 11},${y + 5} ${x + 11},${y + 13}`} fill={color} fillOpacity={p} />
                    <text x={x + 48} y={y + 8} fontSize="11.5" fill={color}>
                      {r.label}
                    </text>
                  </g>
                );
              }
              const dir = x2 > x1 ? 1 : -1;
              const end = x1 + (x2 - x1) * p;
              const mid = (x1 + x2) / 2;
              return (
                <g key={i}>
                  {i === index && <rect x={6} y={y - 15} width={708} height={GAP} rx={6} fill="#ffffff" fillOpacity={0.05} />}
                  {(r.kind === "fail" || r.kind === "pass") && <rect x={Math.min(x1, x2)} y={y - 14} width={Math.abs(x2 - x1)} height={GAP - 2} rx={5} fill={color} fillOpacity={0.1} />}
                  <line x1={x1} y1={y} x2={end - dir * 7 * (p > 0.9 ? 1 : 0)} y2={y} stroke={color} strokeWidth={2} strokeDasharray={reply ? "6 4" : undefined} strokeLinecap="round" />
                  {p > 0.9 && <polygon points={`${x2},${y} ${x2 - dir * 9},${y - 4.5} ${x2 - dir * 9},${y + 4.5}`} fill={color} />}
                  {i === index && p < 0.9 && <circle cx={end} cy={y} r={4} fill={color} />}
                  <text x={mid} y={y - 6} textAnchor="middle" fontSize="11.5" fill={color} fontWeight={r.kind === "fail" || r.kind === "pass" ? 700 : 400} opacity={Math.min(1, p * 2)}>
                    {r.label}
                  </text>
                </g>
              );
            })}
          </SvgCanvas>
        </div>
        <p className="text-xs text-muted sm:hidden">Swipe sideways to see the whole diagram.</p>

        <div className="rounded-lg border border-border bg-bg p-3" aria-live="polite">
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-mono">
              message {index + 1} of {ROWS.length}
            </span>
            <span className={cx("rounded px-1.5 py-0.5 font-mono", current.kind === "fail" ? "bg-red-400/15 text-red-300" : current.kind === "pass" ? "bg-green-400/15 text-green-300" : "bg-surface-2")}>
              {KIND_LABEL[current.kind]}
            </span>
          </p>
          <p className="mt-1.5 text-sm">{current.caption}</p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-[#0d1117] p-3 font-mono text-[12px] leading-relaxed text-text">{current.payload}</pre>
        </div>
      </div>
    </VizFrame>
  );
}
