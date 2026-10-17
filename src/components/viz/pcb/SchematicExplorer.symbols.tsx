/**
 * Schematic symbols drawn in absolute SVG coordinates, shared by the PCB A figures and visualizations.
 * Every symbol is a plain <g> with no ids, so any number of them can share a page.
 */

import { vizColors } from "@/components/viz/shared";

interface Stroke {
  stroke?: string;
  strokeWidth?: number;
}

/** IEC-style resistor: a rectangle. `length` runs along the wire, `width` across it. */
export function ResistorSymbol({
  cx,
  cy,
  length = 40,
  width = 14,
  vertical = false,
  stroke = vizColors.text,
  strokeWidth = 2,
  fill = "none",
  fillOpacity = 1,
}: Stroke & { cx: number; cy: number; length?: number; width?: number; vertical?: boolean; fill?: string; fillOpacity?: number }) {
  const w = vertical ? width : length;
  const h = vertical ? length : width;
  return (
    <rect
      x={cx - w / 2}
      y={cy - h / 2}
      width={w}
      height={h}
      rx={2}
      fill={fill}
      fillOpacity={fillOpacity}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

/** Two parallel plates. `vertical` means the wire runs vertically, so the plates are horizontal. */
export function CapacitorSymbol({
  cx,
  cy,
  vertical = false,
  size = 26,
  gap = 8,
  stroke = vizColors.text,
  strokeWidth = 2.5,
  polarized = false,
}: Stroke & { cx: number; cy: number; vertical?: boolean; size?: number; gap?: number; polarized?: boolean }) {
  const h = size / 2;
  const g = gap / 2;
  return (
    <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round">
      {vertical ? (
        <>
          <line x1={cx - h} y1={cy - g} x2={cx + h} y2={cy - g} />
          <line x1={cx - h} y1={cy + g} x2={cx + h} y2={cy + g} />
        </>
      ) : (
        <>
          <line x1={cx - g} y1={cy - h} x2={cx - g} y2={cy + h} />
          <line x1={cx + g} y1={cy - h} x2={cx + g} y2={cy + h} />
        </>
      )}
      {polarized && (
        <text
          x={vertical ? cx + h + 4 : cx - g - 9}
          y={vertical ? cy - g - 4 : cy - h - 2}
          fontSize={11}
          fill={stroke}
          stroke="none"
        >
          +
        </text>
      )}
    </g>
  );
}

/** Four-bump coil. */
export function InductorSymbol({
  cx,
  cy,
  bumps = 4,
  r = 7,
  vertical = false,
  stroke = vizColors.text,
  strokeWidth = 2,
}: Stroke & { cx: number; cy: number; bumps?: number; r?: number; vertical?: boolean }) {
  const total = bumps * 2 * r;
  let d: string;
  if (vertical) {
    d = `M ${cx} ${cy - total / 2}`;
    for (let i = 0; i < bumps; i++) d += ` a ${r} ${r} 0 0 1 0 ${2 * r}`;
  } else {
    d = `M ${cx - total / 2} ${cy}`;
    for (let i = 0; i < bumps; i++) d += ` a ${r} ${r} 0 0 1 ${2 * r} 0`;
  }
  return <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />;
}

/** Three-bar ground symbol hanging from (x, y). */
export function GroundSymbol({ x, y, size = 16, stroke = vizColors.text, strokeWidth = 2 }: Stroke & { x: number; y: number; size?: number }) {
  return (
    <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round">
      <line x1={x} y1={y} x2={x} y2={y + 5} />
      <line x1={x - size / 2} y1={y + 5} x2={x + size / 2} y2={y + 5} />
      <line x1={x - size / 3} y1={y + 9.5} x2={x + size / 3} y2={y + 9.5} />
      <line x1={x - size / 6} y1={y + 14} x2={x + size / 6} y2={y + 14} />
    </g>
  );
}

/** A battery or DC source: long plate is positive. `vertical` means the wire runs vertically (plates horizontal, + on top). */
export function BatterySymbol({
  cx,
  cy,
  vertical = true,
  stroke = vizColors.text,
  strokeWidth = 2.5,
  showSigns = true,
}: Stroke & { cx: number; cy: number; vertical?: boolean; showSigns?: boolean }) {
  return (
    <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round">
      {vertical ? (
        <>
          <line x1={cx - 16} y1={cy - 6} x2={cx + 16} y2={cy - 6} />
          <line x1={cx - 9} y1={cy + 6} x2={cx + 9} y2={cy + 6} strokeWidth={strokeWidth + 2} />
          {showSigns && (
            <>
              <text x={cx + 22} y={cy - 10} fontSize={13} fill={stroke} stroke="none">
                +
              </text>
              <text x={cx + 22} y={cy + 14} fontSize={13} fill={stroke} stroke="none">
                −
              </text>
            </>
          )}
        </>
      ) : (
        <>
          <line x1={cx - 6} y1={cy - 16} x2={cx - 6} y2={cy + 16} />
          <line x1={cx + 6} y1={cy - 9} x2={cx + 6} y2={cy + 9} strokeWidth={strokeWidth + 2} />
          {showSigns && (
            <text x={cx - 14} y={cy - 18} fontSize={13} fill={stroke} stroke="none">
              +
            </text>
          )}
        </>
      )}
    </g>
  );
}

/** SPST switch drawn between two contacts. When open the lever lifts away from the second contact. */
export function SwitchSymbol({
  x1,
  y1,
  x2,
  y2,
  closed,
  stroke = vizColors.text,
  strokeWidth = 2.5,
  openAngle = -28,
}: Stroke & { x1: number; y1: number; x2: number; y2: number; closed: boolean; openAngle?: number }) {
  const a = closed ? 0 : (openAngle * Math.PI) / 180;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const ex = x1 + dx * Math.cos(a) - dy * Math.sin(a);
  const ey = y1 + dx * Math.sin(a) + dy * Math.cos(a);
  return (
    <g stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round">
      <line x1={x1} y1={y1} x2={ex} y2={ey} />
      <circle cx={x1} cy={y1} r={3} fill={vizColors.bg} />
      <circle cx={x2} cy={y2} r={3} fill={vizColors.bg} />
    </g>
  );
}

/** Wire junction dot. */
export function JunctionDot({ x, y, color = vizColors.text, r = 3.5 }: { x: number; y: number; color?: string; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill={color} />;
}
