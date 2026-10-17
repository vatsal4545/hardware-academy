import type { ReactNode } from "react";
import { vizColors } from "./colors";

export interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  head?: number;
  dashed?: boolean;
}

/** A line with a filled arrowhead at (x2, y2). No <marker> ids, so many arrows can share a page. */
export function Arrow({ x1, y1, x2, y2, color = vizColors.text, width = 2, head = 8, dashed = false }: ArrowProps) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  // Rounded so server-rendered and client-rendered markup match exactly (trig results can differ in the last bits).
  const r2 = (v: number) => Math.round(v * 100) / 100;
  const bx1 = r2(x2 - head * Math.cos(angle - spread));
  const by1 = r2(y2 - head * Math.sin(angle - spread));
  const bx2 = r2(x2 - head * Math.cos(angle + spread));
  const by2 = r2(y2 - head * Math.sin(angle + spread));
  const shaftX = r2(x2 - head * 0.6 * Math.cos(angle));
  const shaftY = r2(y2 - head * 0.6 * Math.sin(angle));
  const ax1 = r2(x1);
  const ay1 = r2(y1);
  const ax2 = r2(x2);
  const ay2 = r2(y2);
  return (
    <g>
      <line
        x1={ax1}
        y1={ay1}
        x2={shaftX}
        y2={shaftY}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 5" : undefined}
      />
      <polygon points={`${ax2},${ay2} ${bx1},${by1} ${bx2},${by2}`} fill={color} />
    </g>
  );
}

export interface LabelProps {
  x: number;
  y: number;
  children: ReactNode;
  anchor?: "start" | "middle" | "end";
  size?: number;
  color?: string;
  mono?: boolean;
  bold?: boolean;
  rotate?: number;
}

/** SVG text with sensible defaults (vertically centred on y). */
export function Label({ x, y, children, anchor = "middle", size = 12, color = vizColors.text, mono = false, bold = false, rotate }: LabelProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={size}
      fill={color}
      fontFamily={mono ? "var(--font-mono)" : "var(--font-sans)"}
      fontWeight={bold ? 600 : 400}
      dominantBaseline="middle"
      transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    >
      {children}
    </text>
  );
}

export interface GridProps {
  width: number;
  height: number;
  step?: number;
  color?: string;
  x?: number;
  y?: number;
}

/** Faint background grid for plots. */
export function Grid({ width, height, step = 20, color = vizColors.grid, x = 0, y = 0 }: GridProps) {
  const cols = Math.floor(width / step);
  const rows = Math.floor(height / step);
  return (
    <g stroke={color} strokeWidth={1} opacity={0.6}>
      {Array.from({ length: cols + 1 }, (_, i) => (
        <line key={`v${i}`} x1={x + i * step} y1={y} x2={x + i * step} y2={y + height} />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line key={`h${i}`} x1={x} y1={y + i * step} x2={x + width} y2={y + i * step} />
      ))}
    </g>
  );
}

/** Maps data to SVG coordinates for a simple 2-D plot area. */
export function makeScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/** Builds an SVG path "M x0 y0 L x1 y1 ..." from points. */
export function polyline(points: Array<[number, number]>): string {
  if (points.length === 0) return "";
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
}
