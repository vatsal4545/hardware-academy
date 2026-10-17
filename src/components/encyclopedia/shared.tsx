"use client";

import { useId, type ReactNode } from "react";
import { Label, SvgCanvas, usePrefersReducedMotion, vizColors } from "@/components/viz/shared";

/** Every illustration is drawn in the same 320 x 200 box so the cards line up. */
export const PART_W = 320;
export const PART_H = 200;

/** Palette for drawing physical parts on the dark page. Amber is always conventional current. */
export const part = {
  bg: "#0d1320",
  dot: "#222c42",
  epoxy: "#1c212d",
  epoxyHi: "#35405a",
  epoxyLo: "#0f131b",
  metal: "#c4cad4",
  metalHi: "#f0f2f6",
  metalLo: "#808a9b",
  gold: "#e3be58",
  ceramic: "#c9a15c",
  ceramicLo: "#8f6f3a",
  board: "#17503a",
  boardLo: "#0f3a29",
  ink: "#aab3c5",
  current: vizColors.amber,
  signal: vizColors.cyan,
} as const;

export type Pt = readonly [number, number];

/**
 * Round a computed coordinate. Transcendental functions (cos, sin, exp, hypot) can differ in the last digit between
 * JavaScript engines, which would make server and client markup differ; rounding keeps them identical.
 */
export function round(n: number, digits = 2): number {
  const k = 10 ** digits;
  return Math.round(n * k) / k;
}

/** True when the illustration should move: the caller asked for it and the viewer has not asked the OS for reduced motion. */
export function useAnimate(animate?: boolean): boolean {
  const reduced = usePrefersReducedMotion();
  return Boolean(animate) && !reduced;
}

const GRID_DOTS = (() => {
  let d = "";
  for (let y = 16; y < PART_H; y += 16) for (let x = 16; x < PART_W; x += 16) d += `M${x} ${y}h.01`;
  return d;
})();

/** The shared 320 x 200 stage: rounded dark panel with a faint dot grid, then the part. */
export function PartCanvas({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SvgCanvas viewBox={`0 0 ${PART_W} ${PART_H}`} title={title}>
      <rect width={PART_W} height={PART_H} rx={10} fill={part.bg} />
      <path d={GRID_DOTS} stroke={part.dot} strokeWidth={2} strokeLinecap="round" fill="none" />
      {children}
    </SvgCanvas>
  );
}

/** A tinned metal lead (horizontal when wider than tall, vertical otherwise) with a highlight edge. */
export function Lead({ x, y, w, h, r = 1.5 }: { x: number; y: number; w: number; h: number; r?: number }) {
  const horizontal = w >= h;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={part.metal} />
      {horizontal ? (
        <rect x={x} y={y} width={w} height={Math.max(1, h / 3)} rx={r} fill={part.metalHi} opacity={0.85} />
      ) : (
        <rect x={x} y={y} width={Math.max(1, w / 3)} height={h} rx={r} fill={part.metalHi} opacity={0.85} />
      )}
    </g>
  );
}

/** A black epoxy block with a soft highlight along the top. */
export function Epoxy({ x, y, w, h, r = 4, fill = part.epoxy }: { x: number; y: number; w: number; h: number; r?: number; fill?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={part.epoxyHi} strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={w - 4} height={Math.max(2, h * 0.22)} rx={Math.max(1, r - 2)} fill="#ffffff" opacity={0.07} />
    </g>
  );
}

/** Marking text printed on a package (monospace, dim). */
export function Mark({ x, y, children, size = 11, anchor = "middle", color = part.ink }: { x: number; y: number; children: ReactNode; size?: number; anchor?: "start" | "middle" | "end"; color?: string }) {
  return (
    <Label x={x} y={y} size={size} anchor={anchor} color={color} mono>
      {children}
    </Label>
  );
}

/** A small caption beside the part. */
export function Note({ x, y, children, anchor = "middle", size = 10.5, color = vizColors.muted, bold = false }: { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; size?: number; color?: string; bold?: boolean }) {
  return (
    <Label x={x} y={y} size={size} anchor={anchor} color={color} bold={bold}>
      {children}
    </Label>
  );
}

/** A thin leader line ending in a dot, pointing at a feature. */
export function Leader({ from, to, color = vizColors.muted }: { from: Pt; to: Pt; color?: string }) {
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={color} strokeWidth={0.9} opacity={0.75} />
      <circle cx={to[0]} cy={to[1]} r={2} fill={color} />
    </g>
  );
}

export function pathOf(points: readonly Pt[]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${round(x)} ${round(y)}`).join(" ");
}

/** The point `frac` (0..1) of the way along a polyline. */
export function pointAlong(points: readonly Pt[], frac: number): Pt {
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    lengths.push(len);
    total += len;
  }
  let remaining = Math.min(1, Math.max(0, frac)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const t = lengths[i] === 0 ? 0 : Math.min(1, remaining / lengths[i]);
      return [round(points[i][0] + (points[i + 1][0] - points[i][0]) * t), round(points[i][1] + (points[i + 1][1] - points[i][1]) * t)];
    }
    remaining -= lengths[i];
  }
  return points[0];
}

export interface FlowProps {
  /** polyline the dots follow, in drawing coordinates */
  points: readonly Pt[];
  on: boolean;
  /** number of dots */
  n?: number;
  /** seconds for a dot to travel the whole path */
  dur?: number;
  r?: number;
  color?: string;
  reverse?: boolean;
}

/** Dots travelling along a polyline (conventional current by default). Evenly spaced and still when `on` is false. */
export function Flow({ points, on, n = 4, dur = 2, r = 3, color = part.current, reverse = false }: FlowProps) {
  const pts = reverse ? [...points].reverse() : points;
  const d = pathOf(pts);
  return (
    <g fill={color}>
      {Array.from({ length: n }, (_, i) => {
        if (!on) {
          const [cx, cy] = pointAlong(pts, (i + 0.5) / n);
          return <circle key={i} cx={cx} cy={cy} r={r} opacity={0.9} />;
        }
        return (
          <circle key={i} r={r}>
            <animateMotion path={d} dur={`${dur}s`} begin={`${-(i * dur) / n}s`} repeatCount="indefinite" />
          </circle>
        );
      })}
    </g>
  );
}

/** Rotates its children about (cx, cy) while `on`. */
export function Spin({ cx, cy, on, dur = 6, direction = 1, children }: { cx: number; cy: number; on: boolean; dur?: number; direction?: 1 | -1; children: ReactNode }) {
  return (
    <g>
      {children}
      {on && <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`${360 * direction} ${cx} ${cy}`} dur={`${dur}s`} repeatCount="indefinite" />}
    </g>
  );
}

/** Drop-in `<animate>` for the shape it is placed inside; renders nothing while still. `begin` is in seconds and may be negative. */
export function Anim({ on, name, values, dur = 2, begin = 0, keyTimes, calcMode, keySplines }: { on: boolean; name: string; values: string; dur?: number; begin?: number; keyTimes?: string; calcMode?: "linear" | "discrete" | "paced" | "spline"; keySplines?: string }) {
  if (!on) return null;
  return <animate attributeName={name} values={values} dur={`${dur}s`} begin={`${begin}s`} keyTimes={keyTimes} calcMode={calcMode} keySplines={keySplines} repeatCount="indefinite" />;
}

/**
 * A window onto a strip of periodic content that scrolls left by one `period` per `dur` seconds, so the pattern appears to travel.
 * Draw the content from x to at least x + w + period.
 */
export function ScrollClip({ x, y, w, h, period, dur = 2, on, children }: { x: number; y: number; w: number; h: number; period: number; dur?: number; on: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <g>
      <clipPath id={id}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <g>
          {children}
          {on && <animateTransform attributeName="transform" type="translate" from="0 0" to={`${-period} 0`} dur={`${dur}s`} repeatCount="indefinite" />}
        </g>
      </g>
    </g>
  );
}

/** Sine wave path from x0 to x1 about baseline y (screen up is positive amplitude). */
export function sinePath(x0: number, x1: number, y: number, amp: number, period: number, phase = 0): string {
  const step = period / 16;
  let d = "";
  for (let x = x0; x <= x1 + 0.001; x += step) {
    const yy = y - amp * Math.sin(((x - x0) / period) * Math.PI * 2 + phase);
    d += `${d === "" ? "M" : "L"}${x.toFixed(1)} ${yy.toFixed(1)} `;
  }
  return d.trim();
}

/** Square wave path starting high at x0; `duty` is the fraction of each period spent high. */
export function squarePath(x0: number, x1: number, yHigh: number, yLow: number, period: number, duty = 0.5): string {
  let d = `M${x0} ${yHigh}`;
  for (let x = x0; x < x1; x += period) {
    d += ` H${(x + period * duty).toFixed(1)} V${yLow} H${(x + period).toFixed(1)} V${yHigh}`;
  }
  return d;
}

/** Wavy heat lines rising from (x, y); the dashes drift upward while `on`. */
export function Heat({ x, y, on, n = 3, spacing = 14, height = 30, color = vizColors.orange }: { x: number; y: number; on: boolean; n?: number; spacing?: number; height?: number; color?: string }) {
  return (
    <g stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" opacity={0.85}>
      {Array.from({ length: n }, (_, i) => {
        const x0 = x + i * spacing;
        const d = `M${x0} ${y} q5 ${-height / 4} 0 ${-height / 2} t0 ${-height / 2}`;
        return (
          <path key={i} d={d} strokeDasharray="7 5">
            <Anim on={on} name="stroke-dashoffset" values="0;-24" dur={1.3} begin={-i * 0.35} />
          </path>
        );
      })}
    </g>
  );
}

/** x offsets of the three TO-92 leads from the package centre, and the package height (flat-face view). */
export const TO92_LEAD_DX = [-20, 0, 20] as const;
export const TO92_HEIGHT = 86;

/** Half-round TO-92 package seen from the flat face, with three leads and printed marking lines. */
export function To92({ cx, top, leadEnd, lines }: { cx: number; top: number; leadEnd: number; lines: readonly string[] }) {
  const w = 36;
  const bottom = top + TO92_HEIGHT;
  const outline = `M${cx - w} ${bottom} V${top + w} A${w} ${w} 0 0 1 ${cx + w} ${top + w} V${bottom} Z`;
  const face = `M${cx - w + 5} ${bottom - 5} V${top + w} A${w - 5} ${w - 5} 0 0 1 ${cx + w - 5} ${top + w} V${bottom - 5} Z`;
  return (
    <g>
      {TO92_LEAD_DX.map((dx) => (
        <Lead key={dx} x={cx + dx - 2.5} y={bottom - 2} w={5} h={leadEnd - bottom + 2} r={1} />
      ))}
      <path d={outline} fill={part.epoxy} stroke={part.epoxyHi} strokeWidth={1} />
      <path d={face} fill="#ffffff" opacity={0.05} />
      {lines.map((line, i) => (
        <Mark key={line} x={cx} y={top + 46 + i * 13} size={10.5}>
          {line}
        </Mark>
      ))}
    </g>
  );
}
