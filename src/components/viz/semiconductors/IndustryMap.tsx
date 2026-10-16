"use client";

import { useState, type KeyboardEvent } from "react";
import { PlayPause, VizFrame } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, useAnimationFrame, vizColors } from "@/components/viz/shared";
import { industryEdges, industryNodes, tracePath, type IndustryNode, type IndustryNodeId } from "./IndustryMapData";

const NODE_W = 120;
const NODE_H = 48;
/** Seconds the chip takes to travel between two stops. */
const LEG_S = 2.2;
const TRACE_END = (tracePath.length - 1) * LEG_S;

const byId = Object.fromEntries(industryNodes.map((n) => [n.id, n])) as Record<IndustryNodeId, IndustryNode>;

function ease(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/** Edge endpoints on the facing sides of the two node boxes (edges are horizontal or vertical). */
function edgeEnds(a: IndustryNode, b: IndustryNode) {
  if (a.y === b.y) {
    const dir = Math.sign(b.x - a.x);
    return { x1: a.x + (dir * NODE_W) / 2, y1: a.y, x2: b.x - (dir * NODE_W) / 2, y2: b.y };
  }
  const dir = Math.sign(b.y - a.y);
  return { x1: a.x, y1: a.y + (dir * NODE_H) / 2, x2: b.x, y2: b.y - (dir * NODE_H) / 2 };
}

/** Where the traced chip is at time t, and which stop it is nearest. */
function tracePosition(t: number) {
  const tc = Math.min(TRACE_END, Math.max(0, t));
  const leg = Math.min(tracePath.length - 2, Math.floor(tc / LEG_S));
  const frac = tc >= TRACE_END ? 1 : (tc - leg * LEG_S) / LEG_S;
  const a = byId[tracePath[leg].id];
  const b = byId[tracePath[leg + 1].id];
  const e = ease(frac);
  return {
    x: a.x + (b.x - a.x) * e,
    y: a.y + (b.y - a.y) * e,
    stop: frac < 0.5 ? leg : leg + 1,
    /** legs travelled so far, continuous from 0 to tracePath.length - 1 */
    progress: tc / LEG_S,
  };
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <ul className="list-disc space-y-0.5 pl-5">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

/** Clickable value-chain map with companies, roles and interview topics, plus a "trace a chip" animation. */
export function IndustryMap() {
  const [selected, setSelected] = useState<IndustryNodeId>("fabless");
  const [follow, setFollow] = useState(false);
  const [traceT, setTraceT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const running = playing && traceT < TRACE_END;

  useAnimationFrame((dt) => setTraceT((t) => Math.min(TRACE_END, t + dt)), running);

  const pos = tracePosition(traceT);
  const traceStarted = traceT > 0;
  const shownId = follow && traceStarted ? tracePath[pos.stop].id : selected;
  const shown = byId[shownId];
  const onTracePath = (from: IndustryNodeId, to: IndustryNodeId) => {
    const k = tracePath.findIndex((s) => s.id === from);
    return k >= 0 && tracePath[k + 1]?.id === to ? k : -1;
  };

  const select = (id: IndustryNodeId) => {
    setSelected(id);
    setFollow(false);
  };
  const onKey = (e: KeyboardEvent<SVGGElement>, id: IndustryNodeId) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(id);
    }
  };
  const toggle = () => {
    if (running) {
      setPlaying(false);
      return;
    }
    if (traceT >= TRACE_END) setTraceT(0);
    setFollow(true);
    setPlaying(true);
  };
  const step = () => {
    setFollow(true);
    setTraceT((t) => Math.min(TRACE_END, (Math.floor(t / LEG_S + 1e-6) + 1) * LEG_S));
  };
  const reset = () => {
    setPlaying(false);
    setTraceT(0);
  };

  return (
    <VizFrame
      title="The semiconductor value chain"
      description="Click any box for its companies, roles and interview topics. Press Play to trace one chip from design to a finished product."
      controls={
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <span className="block text-sm text-muted">Trace a chip</span>
          <PlayPause playing={running} onToggle={toggle} onStep={step} onReset={reset} />
        </div>
      }
    >
      <SvgCanvas
        viewBox="0 0 680 350"
        title="Semiconductor value chain: EDA and IP feed fabless design, which goes to a foundry supplied by equipment makers, then to OSAT assembly and test, then to systems; IDMs do design and manufacturing in-house"
      >
        <rect x={0} y={0} width={680} height={350} fill={vizColors.bg} />

        {industryEdges.map((edge) => {
          const a = byId[edge.from];
          const b = byId[edge.to];
          const { x1, y1, x2, y2 } = edgeEnds(a, b);
          const k = onTracePath(edge.from, edge.to);
          const lit = k >= 0 && traceStarted && k < pos.progress;
          const horizontal = y1 === y2;
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <Arrow x1={x1} y1={y1} x2={x2} y2={y2} color={lit ? vizColors.amber : vizColors.muted} width={lit ? 3 : 1.5} />
              <Label
                x={horizontal ? (x1 + x2) / 2 : x1 + 8}
                y={horizontal ? y1 - 11 : (y1 + y2) / 2}
                anchor={horizontal ? "middle" : "start"}
                size={10}
                color={vizColors.muted}
              >
                {edge.label}
              </Label>
            </g>
          );
        })}

        {industryNodes.map((n) => {
          const active = n.id === shownId;
          return (
            <g
              key={n.id}
              role="button"
              tabIndex={0}
              aria-label={`${n.label}: show companies, roles and interview topics`}
              aria-pressed={active}
              onClick={() => select(n.id)}
              onKeyDown={(e) => onKey(e, n.id)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={n.x - NODE_W / 2}
                y={n.y - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={n.color}
                fillOpacity={active ? 0.3 : 0.1}
                stroke={n.color}
                strokeWidth={active ? 2.5 : 1.2}
              />
              <Label x={n.x} y={n.y - 8} size={14} bold color={vizColors.text}>
                {n.label}
              </Label>
              <Label x={n.x} y={n.y + 11} size={10} color={vizColors.muted}>
                {n.sub}
              </Label>
            </g>
          );
        })}

        {/* Legend in the empty lower-left corner */}
        <g transform="translate(24 248)">
          {[
            { c: vizColors.violet, t: "Design" },
            { c: vizColors.blue, t: "Fab tools" },
            { c: vizColors.cyan, t: "Wafer manufacturing" },
            { c: vizColors.orange, t: "Assembly and test" },
            { c: vizColors.green, t: "IDM (all in-house)" },
            { c: vizColors.amber, t: "Products" },
          ].map((l, k) => (
            <g key={l.t} transform={`translate(${k % 2 === 0 ? 0 : 168} ${Math.floor(k / 2) * 22})`}>
              <rect x={0} y={-6} width={12} height={12} rx={3} fill={l.c} fillOpacity={0.5} stroke={l.c} />
              <Label x={18} y={0} anchor="start" size={11} color={vizColors.muted}>
                {l.t}
              </Label>
            </g>
          ))}
        </g>

        {/* The traced chip */}
        {traceStarted && (
          <g transform={`translate(${pos.x} ${pos.y})`}>
            <rect x={-9} y={-9} width={18} height={18} rx={3} fill={vizColors.amber} stroke={vizColors.bg} strokeWidth={2} />
            <rect x={-4} y={-4} width={8} height={8} fill={vizColors.bg} opacity={0.5} />
          </g>
        )}
      </SvgCanvas>

      <p className="mt-3 min-h-[2.5rem] text-sm text-text/90" aria-live="polite">
        {traceStarted ? (
          <>
            <span className="font-mono text-xs text-amber-300">
              Stop {pos.stop + 1} / {tracePath.length}:{" "}
            </span>
            {tracePath[pos.stop].caption}
          </>
        ) : (
          <span className="text-muted">Press Play to follow one smartphone chip through the industry.</span>
        )}
      </p>

      <div className="mt-3 rounded-lg border border-border bg-bg p-4 text-sm">
        <p className="text-base font-semibold" style={{ color: shown.color }}>
          {shown.label}
        </p>
        <p className="mt-1 text-text/90">{shown.what}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {shown.companies.map((c) => (
            <span key={c} className="rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs">
              {c}
            </span>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <DetailList title="Numbers and facts" items={shown.facts} />
          <DetailList title="Roles here" items={shown.roles} />
          <DetailList title="Interview topics" items={shown.interview} />
        </div>
      </div>
    </VizFrame>
  );
}
