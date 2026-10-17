"use client";

/**
 * Small helpers shared by the PCB A visualizations (OhmsLawCircuit, RcCharging, BuckConverter):
 * preferred-value series for index sliders, SI formatting, polyline paths for animated charge flow,
 * and a flow clock that integrates a (possibly changing) rate so dots never jump when a slider moves.
 */

import { useState, type ReactNode } from "react";
import { useAnimationFrame, vizColors } from "@/components/viz/shared";
import { cn } from "@/lib/cn";

/**
 * Rounding for anything that reaches markup. Engines can differ in the last bits of sin, cos, exp, log, sqrt, pow and
 * hypot, and a server-rendered value that differs from the browser's in the 15th digit is a hydration mismatch. So every
 * SVG attribute derived from those functions goes through r2 (coordinates), r3 (opacities and other unit-range values)
 * or r6 (simulation outputs that later feed text and geometry). The "+ 0" turns -0 into 0.
 */
export const r2 = (v: number): number => Math.round(v * 100) / 100 + 0;
export const r3 = (v: number): number => Math.round(v * 1000) / 1000 + 0;
export const r6 = (v: number): number => Math.round(v * 1e6) / 1e6 + 0;

const E12 = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2] as const;

/** E12 preferred values from `start` upwards over `decades` decades, ending on start * 10^decades. */
export function e12Range(start: number, decades: number): number[] {
  const out: number[] = [];
  for (let d = 0; d < decades; d++) {
    for (const m of E12) out.push(Number((start * m * 10 ** d).toPrecision(3)));
  }
  out.push(Number((start * 10 ** decades).toPrecision(3)));
  return out;
}

/** Index of the value closest to `target` on a log scale. */
export function nearestIndex(values: readonly number[], target: number): number {
  let best = 0;
  let bestErr = Infinity;
  values.forEach((v, i) => {
    const err = Math.abs(Math.log(v / target));
    if (err < bestErr) {
      best = i;
      bestErr = err;
    }
  });
  return best;
}

/** Two resistances in parallel. */
export function parallel(a: number, b: number): number {
  return (a * b) / (a + b);
}

const PREFIXES: ReadonlyArray<readonly [number, string]> = [
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
];

/** 4700 -> "4.7 kΩ", 0.0025 -> "2.5 mA". Three significant digits, trailing zeros trimmed. */
export function formatSI(value: number, unit: string, digits = 3): string {
  if (!Number.isFinite(value)) return `∞ ${unit}`;
  if (value === 0) return `0 ${unit}`;
  const sign = value < 0 ? "−" : "";
  const abs = Math.abs(value);
  let idx = PREFIXES.findIndex(([scale]) => abs >= scale);
  if (idx === -1) idx = PREFIXES.length - 1;
  let shown = Number((abs / PREFIXES[idx][0]).toPrecision(digits));
  if (shown >= 1000 && idx > 0) {
    idx -= 1;
    shown = Number((abs / PREFIXES[idx][0]).toPrecision(digits));
  }
  return `${sign}${shown} ${PREFIXES[idx][1]}${unit}`;
}

/** The fastest the charge dots ever go, in loops per second. Above it, more current no longer looks faster. */
export const DOT_RATE_CAP = 2.4;

/**
 * Dot speed in loops per second for one current: strictly proportional, so `referenceA` amps is one loop per second
 * and twice the current is exactly twice as fast, up to DOT_RATE_CAP so very large currents do not strobe.
 * The sign follows the direction of the current.
 */
export function dotRate(currentA: number, referenceA: number): number {
  const v = Math.min(DOT_RATE_CAP, Math.abs(currentA) / referenceA);
  return currentA < 0 ? -v : v;
}

/**
 * Dot speeds for several branches that have to be compared with each other, such as the two halves of a divider
 * and its load. They share one scale (`referenceA` amps is one loop per second), reduced only if the largest current
 * would pass the cap, so the speed ratios are exactly the current ratios and the KCL split can be read off the dots.
 */
export function dotRates(currentsA: readonly number[], referenceA: number): number[] {
  const largest = Math.max(0, ...currentsA.map((i) => Math.abs(i)));
  if (largest === 0) return currentsA.map(() => 0);
  const loopsPerSecondPerAmp = Math.min(1 / referenceA, DOT_RATE_CAP / largest);
  return currentsA.map((i) => i * loopsPerSecondPerAmp);
}

export type Pt = readonly [number, number];

export interface FlowPath {
  length: number;
  /** point at a fraction 0..1 along the path (wraps around) */
  at: (fraction: number) => { x: number; y: number };
}

/** Parameterise a polyline by arc length. */
export function makePath(points: readonly Pt[], closed = false): FlowPath {
  const pts: Pt[] = closed ? [...points, points[0]] : [...points];
  const segs: Array<{ x0: number; y0: number; x1: number; y1: number; len: number; start: number }> = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    segs.push({ x0, y0, x1, y1, len, start: total });
    total += len;
  }
  return {
    length: total,
    at(fraction: number) {
      const f = ((fraction % 1) + 1) % 1;
      const d = f * total;
      const s = segs.find((seg) => d <= seg.start + seg.len) ?? segs[segs.length - 1];
      const k = s.len === 0 ? 0 : (d - s.start) / s.len;
      // arc lengths come from Math.hypot, so round the point before it can reach markup
      return { x: r2(s.x0 + (s.x1 - s.x0) * k), y: r2(s.y0 + (s.y1 - s.y0) * k) };
    },
  };
}

/**
 * One phase accumulator per rate (loops per second, may be negative to reverse the flow).
 * Integrating the rate each frame means changing a slider changes the speed, never the position.
 */
export function useFlowPhases(rates: readonly number[], playing: boolean): number[] {
  const [phases, setPhases] = useState<number[]>(() => rates.map(() => 0));
  useAnimationFrame((dt) => {
    setPhases((prev) => prev.map((p, i) => (((p + (rates[i] ?? 0) * dt) % 1) + 1) % 1));
  }, playing);
  return phases;
}

/** Evenly spaced dots travelling along a path. */
export function FlowDots({
  path,
  phase,
  count,
  color = vizColors.amber,
  r = 3,
  hide,
}: {
  path: FlowPath;
  phase: number;
  count: number;
  color?: string;
  r?: number;
  /** return true to skip a dot, for example while it passes behind a symbol */
  hide?: (x: number, y: number) => boolean;
}) {
  return (
    <g fill={color}>
      {Array.from({ length: count }, (_, i) => {
        const p = path.at(i / count + phase);
        if (hide?.(p.x, p.y)) return null;
        return <circle key={i} cx={p.x} cy={p.y} r={r} />;
      })}
    </g>
  );
}

/** A small labelled readout used under the visualizations. */
export function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn" | "bad";
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={cn(
          "font-mono text-sm",
          tone === "ok" && "text-green-300",
          tone === "warn" && "text-orange-300",
          tone === "bad" && "text-red-300",
        )}
      >
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

/** Collapsible worked solution for the practice exercises: the learner tries first, then opens it. */
export function WorkedAnswer({ children, label = "Answer: show the worked solution" }: { children: ReactNode; label?: string }) {
  return (
    <details className="mt-3 rounded-lg border border-border bg-bg/60 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-green-300">{label}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

/**
 * Controls that drive a drawing sit directly above it, so the learner can drag a slider and watch the plot
 * without scrolling. Secondary options stay in the standard VizFrame control strip.
 */
export function ControlBar({ children }: { children: ReactNode }) {
  return <div className="mb-3 grid gap-x-6 gap-y-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3 sm:grid-cols-2">{children}</div>;
}
