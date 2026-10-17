"use client";

import { useState } from "react";
import { PlayPause, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";
import { cn } from "@/lib/cn";
import { RoundedArrow, r2 } from "./RoundedArrow";

type FsmState = "idle" | "follow" | "avoid" | "recover";
type FsmEvent = "start" | "obstacle" | "clear" | "lineLost" | "lineFound" | "timeout" | "stop";

interface StateInfo {
  name: string;
  x: number;
  y: number;
  color: string;
  action: string;
  wheels: [number, number];
}

const STATES: Record<FsmState, StateInfo> = {
  idle: { name: "Idle", x: 95, y: 165, color: vizColors.muted, action: "Motors off. Waits for Start.", wheels: [0, 0] },
  follow: {
    name: "Follow",
    x: 320,
    y: 62,
    color: vizColors.green,
    action: "PD on the line error: turn = 0.6·e + 0.05·de/dt around a base speed of 0.5.",
    wheels: [0.5, 0.5],
  },
  avoid: {
    name: "Avoid",
    x: 545,
    y: 165,
    color: vizColors.orange,
    action: "Turns toward the more open side, chosen on entry (inner wheel −0.2, outer 0.5), until the front range reads more than 30 cm for 0.8 s.",
    wheels: [0.5, -0.2],
  },
  recover: {
    name: "Recover",
    x: 320,
    y: 268,
    color: vizColors.violet,
    action: "Arcs toward the side the line was last seen (left 0.05, right 0.55) and gives up after 3 s.",
    wheels: [0.05, 0.55],
  },
};

const EVENTS: { id: FsmEvent; label: string }[] = [
  { id: "start", label: "Start" },
  { id: "obstacle", label: "Obstacle < 20 cm" },
  { id: "clear", label: "Path clear" },
  { id: "lineLost", label: "Line lost" },
  { id: "lineFound", label: "Line found" },
  { id: "timeout", label: "Timeout 3 s" },
  { id: "stop", label: "Stop" },
];

/** The transition table: the whole behavior of the machine in eleven entries. */
const TRANSITIONS: Record<FsmState, Partial<Record<FsmEvent, FsmState>>> = {
  idle: { start: "follow" },
  follow: { obstacle: "avoid", lineLost: "recover", stop: "idle" },
  avoid: { clear: "recover", stop: "idle" },
  recover: { lineFound: "follow", obstacle: "avoid", timeout: "idle", stop: "idle" },
};

interface Pt {
  x: number;
  y: number;
}

interface Edge {
  key: string;
  from: FsmState | "any";
  label: string;
  p0: Pt;
  c: Pt;
  p1: Pt;
  lx: number;
  ly: number;
  anchor?: "start" | "middle" | "end";
  dashed?: boolean;
}

const EDGES: Edge[] = [
  { key: "idle:start", from: "idle", label: "start", p0: { x: 130, y: 143 }, c: { x: 150, y: 62 }, p1: { x: 262, y: 62 }, lx: 190, ly: 96, anchor: "start" },
  { key: "follow:obstacle", from: "follow", label: "obstacle < 20 cm", p0: { x: 378, y: 62 }, c: { x: 525, y: 62 }, p1: { x: 545, y: 143 }, lx: 512, ly: 40 },
  { key: "avoid:clear", from: "avoid", label: "path clear (> 30 cm)", p0: { x: 560, y: 187 }, c: { x: 560, y: 268 }, p1: { x: 378, y: 268 }, lx: 548, ly: 292 },
  { key: "recover:obstacle", from: "recover", label: "obstacle", p0: { x: 372, y: 246 }, c: { x: 470, y: 222 }, p1: { x: 500, y: 187 }, lx: 446, ly: 200, anchor: "end" },
  { key: "follow:lineLost", from: "follow", label: "line lost", p0: { x: 296, y: 84 }, c: { x: 262, y: 165 }, p1: { x: 296, y: 246 }, lx: 268, ly: 165, anchor: "end" },
  { key: "recover:lineFound", from: "recover", label: "line found", p0: { x: 344, y: 246 }, c: { x: 378, y: 165 }, p1: { x: 344, y: 84 }, lx: 372, ly: 165, anchor: "start" },
  { key: "recover:timeout", from: "recover", label: "timeout 3 s", p0: { x: 262, y: 268 }, c: { x: 95, y: 268 }, p1: { x: 95, y: 187 }, lx: 150, ly: 256 },
  { key: "any:stop", from: "any", label: "stop (any state)", p0: { x: 70, y: 70 }, c: { x: 70, y: 110 }, p1: { x: 70, y: 143 }, lx: 64, ly: 58, anchor: "start", dashed: true },
];

const NODE_W = 116;
const NODE_H = 44;
const TRANSIT_S = 0.7;
const LINE_Y = 58;

function bezier(e: Edge, p: number): Pt {
  const q = 1 - p;
  return { x: q * q * e.p0.x + 2 * q * p * e.c.x + p * p * e.p1.x, y: q * q * e.p0.y + 2 * q * p * e.c.y + p * p * e.p1.y };
}

interface Machine {
  current: FsmState;
  enteredAt: number;
  edge: { key: string; at: number } | null;
  notice: string;
  log: string[];
}

const INITIAL: Machine = { current: "idle", enteredAt: 0, edge: null, notice: "Press Start. Buttons outlined in color have a transition from the current state.", log: [] };

function fire(m: Machine, ev: FsmEvent, t: number): Machine {
  const label = EVENTS.find((e) => e.id === ev)?.label ?? ev;
  const from = STATES[m.current].name;
  const to = TRANSITIONS[m.current][ev];
  const stamp = `t = ${t.toFixed(1)} s`;
  if (!to) {
    return {
      ...m,
      notice: `Ignored: “${label}” has no transition out of ${from}.`,
      log: [`${stamp} · ${label}: no transition from ${from}`, ...m.log].slice(0, 6),
    };
  }
  return {
    current: to,
    enteredAt: t,
    edge: { key: ev === "stop" ? "any:stop" : `${m.current}:${ev}`, at: t },
    notice: `${label}: ${from} → ${STATES[to].name}`,
    log: [`${stamp} · ${label}: ${from} → ${STATES[to].name}`, ...m.log].slice(0, 6),
  };
}

/** Where the little robot is, in scene pixels (y down, θ clockwise on screen), tau seconds after entering a state. */
function robotPose(state: FsmState, tau: number): { x: number; y: number; theta: number } {
  switch (state) {
    case "idle":
      return { x: 110, y: LINE_Y, theta: 0 };
    case "follow": {
      const x = 60 + ((tau * 70) % 520);
      return { x, y: LINE_Y + 5 * Math.sin(tau * 4), theta: Math.atan2(20 * Math.cos(tau * 4), 70) };
    }
    case "avoid": {
      const u = (tau % 6) / 6;
      const x = 230 + u * 340;
      const b = Math.exp(-(((x - 410) / 60) ** 2));
      const slope = 42 * b * ((-2 * (x - 410)) / 3600);
      return { x, y: LINE_Y + 42 * b, theta: Math.atan(slope) };
    }
    case "recover":
      return { x: 330, y: LINE_Y + 30, theta: -0.55 + 0.5 * Math.sin(tau * 2.2) };
  }
}

function MiniRobot({ x, y, theta, color, sensors }: { x: number; y: number; theta: number; color: string; sensors: [boolean, boolean] }) {
  const deg = r2((theta * 180) / Math.PI);
  return (
    <g transform={`translate(${r2(x)} ${r2(y)}) rotate(${deg})`}>
      <path d="M 16 0 L 80 -20 L 80 20 Z" fill={vizColors.cyan} opacity={0.12} />
      <rect x={-8} y={-21} width={16} height={6} rx={2} fill={vizColors.muted} />
      <rect x={-8} y={15} width={16} height={6} rx={2} fill={vizColors.muted} />
      <circle r={16} fill={vizColors.bg} stroke={color} strokeWidth={2.5} />
      <line x1={0} y1={0} x2={14} y2={0} stroke={color} strokeWidth={2} />
      <circle cx={13} cy={-6} r={3} fill={sensors[0] ? vizColors.green : vizColors.grid} stroke={vizColors.muted} strokeWidth={0.5} />
      <circle cx={13} cy={6} r={3} fill={sensors[1] ? vizColors.green : vizColors.grid} stroke={vizColors.muted} strokeWidth={0.5} />
    </g>
  );
}

export function StateMachine() {
  const { t, playing, toggle, reset } = useViz();
  const [m, setM] = useState<Machine>(INITIAL);

  const info = STATES[m.current];
  const tau = Math.max(0, t - m.enteredAt);
  const pose = robotPose(m.current, tau); // the clock stops while paused, so the robot freezes in place
  // line sensors sit 13 px ahead and ±6 px to the sides of the robot center
  const sensorOn = (side: -1 | 1) => {
    const sy = pose.y + 13 * Math.sin(pose.theta) + side * 6 * Math.cos(pose.theta);
    return Math.abs(sy - LINE_Y) < 5;
  };
  const sensors: [boolean, boolean] = [sensorOn(-1), sensorOn(1)];

  const activeEdge = m.edge ? EDGES.find((e) => e.key === m.edge?.key) : undefined;
  const progress = m.edge && playing ? Math.min(1, (t - m.edge.at) / TRANSIT_S) : 1;
  const dot = activeEdge && progress < 1 ? bezier(activeEdge, progress) : null;
  const available = (e: Edge) => (e.from === "any" ? m.current !== "idle" : e.from === m.current);

  return (
    <VizFrame
      title="A line follower's state machine"
      description="Fire events and watch the machine move between Idle, Follow, Avoid and Recover while the robot below acts out the current state."
      controls={
        <>
          <PlayPause
            playing={playing}
            onToggle={toggle}
            onReset={() => {
              reset();
              setM(INITIAL);
            }}
          />
          <p className="text-xs text-muted sm:col-span-1 lg:col-span-2">
            Every state has a way out: hysteresis on the obstacle range and a 3 s timeout on the search keep the robot from chattering or waiting forever.
          </p>
        </>
      }
      footer={
        <div className="space-y-1">
          <p className="font-medium text-text">Event log</p>
          {m.log.length === 0 ? (
            <p className="font-mono text-xs">No events yet.</p>
          ) : (
            <ol className="space-y-0.5 font-mono text-xs">
              {m.log.map((line, i) => (
                <li key={`${i}-${line}`}>{line}</li>
              ))}
            </ol>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        <SvgCanvas viewBox="0 0 640 320" title="State diagram with Idle, Follow, Avoid and Recover states and their transitions">
          <rect x={0} y={0} width={640} height={320} rx={10} fill={vizColors.bg} />
          {EDGES.map((e) => {
            const on = available(e);
            const isLast = activeEdge?.key === e.key;
            const color = isLast ? vizColors.cyan : on ? vizColors.text : vizColors.muted;
            const tail = bezier(e, 0.86);
            return (
              <g key={e.key} opacity={on || isLast ? 1 : 0.35}>
                <path
                  d={`M ${e.p0.x} ${e.p0.y} Q ${e.c.x} ${e.c.y} ${e.p1.x} ${e.p1.y}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={isLast ? 2.5 : 1.5}
                  strokeDasharray={e.dashed ? "5 4" : undefined}
                />
                <RoundedArrow x1={tail.x} y1={tail.y} x2={e.p1.x} y2={e.p1.y} color={color} width={isLast ? 2.5 : 1.5} head={9} />
                <Label x={e.lx} y={e.ly} anchor={e.anchor ?? "middle"} size={11} color={color}>
                  {e.label}
                </Label>
              </g>
            );
          })}
          {(Object.keys(STATES) as FsmState[]).map((id) => {
            const s = STATES[id];
            const active = id === m.current;
            return (
              <g key={id}>
                {active && (
                  <rect
                    x={s.x - NODE_W / 2 - 6}
                    y={s.y - NODE_H / 2 - 6}
                    width={NODE_W + 12}
                    height={NODE_H + 12}
                    rx={14}
                    fill="none"
                    stroke={s.color}
                    strokeOpacity={0.45}
                    strokeWidth={4}
                  />
                )}
                <rect
                  x={s.x - NODE_W / 2}
                  y={s.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={active ? s.color : vizColors.grid}
                  fillOpacity={active ? 0.22 : 0.6}
                  stroke={s.color}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                <Label x={s.x} y={s.y} size={14} bold color={active ? vizColors.text : vizColors.muted}>
                  {s.name}
                </Label>
              </g>
            );
          })}
          {dot && <circle cx={r2(dot.x)} cy={r2(dot.y)} r={7} fill={vizColors.cyan} stroke={vizColors.bg} strokeWidth={2} />}
        </SvgCanvas>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Events">
          {EVENTS.map((ev) => {
            const valid = Boolean(TRANSITIONS[m.current][ev.id]);
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => setM(fire(m, ev.id, t))}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  valid ? "border-cyan-400/70 bg-cyan-400/10 text-text hover:bg-cyan-400/20" : "border-border bg-surface text-muted hover:text-text",
                )}
              >
                {ev.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p data-testid="fsm-status" aria-live="polite">
            Current state: <strong style={{ color: info.color }}>{info.name}</strong>
          </p>
          <p className="text-muted">{m.notice}</p>
          <p className="text-muted sm:col-span-2">
            <span className="text-text">{info.name} action:</span> {info.action}
          </p>
        </div>

        <SvgCanvas viewBox="0 0 640 130" title={`Robot acting out the ${info.name} state`}>
          <rect x={0} y={0} width={640} height={130} rx={10} fill={vizColors.grid} fillOpacity={0.55} />
          <line x1={20} y1={LINE_Y} x2={620} y2={LINE_Y} stroke={vizColors.silk} strokeOpacity={0.75} strokeWidth={9} strokeLinecap="round" />
          {m.current === "avoid" && (
            <g>
              <rect x={392} y={LINE_Y - 22} width={36} height={44} rx={4} fill={vizColors.orange} fillOpacity={0.25} stroke={vizColors.orange} strokeWidth={2} />
              <Label x={410} y={LINE_Y - 32} size={10} color={vizColors.orange}>
                obstacle
              </Label>
            </g>
          )}
          <MiniRobot x={pose.x} y={pose.y} theta={pose.theta} color={info.color} sensors={sensors} />
          <Label x={16} y={18} anchor="start" size={11} color={vizColors.muted}>
            {`wheels: left ${info.wheels[0].toFixed(2)}, right ${info.wheels[1].toFixed(2)}`}
          </Label>
          <Label x={624} y={18} anchor="end" size={11} color={info.color}>
            {info.name}
          </Label>
        </SvgCanvas>
      </div>
    </VizFrame>
  );
}
