"use client";

import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { BOARD, antennaKeepout, connectorPins, nets, parts, zones, type Part, type Pt } from "./SchematicToLayoutBoard";

/** Drawing helpers for the motor-driver board, shared by SchematicToLayout, the placement-plan figure and the short-hunt game. */

export const PX = 10; // pixels per millimetre
export const ORIGIN = { x: 60, y: 35 };
export const bx = (mm: number) => ORIGIN.x + PX * mm;
export const by = (mm: number) => ORIGIN.y + PX * mm;

export const BOARD_FILL = "#0d2b1f";
export const FRONT_COPPER = vizColors.red; // KiCad draws F.Cu in red
export const BACK_COPPER = vizColors.blue; // and B.Cu in blue

export interface PadSpec {
  at: Pt;
  size: number;
  round?: boolean;
}

/** Pad centres of a part in absolute millimetres: routed taps plus generic pads for the part type. */
export function padsFor(p: Part): PadSpec[] {
  const tapped: PadSpec[] = nets
    .flatMap((n) => n.taps.filter((t) => t.ref === p.ref).map((t) => t.at))
    .map((at) => ({ at, size: p.kind === "conn" ? 1.5 : 0.9, round: p.kind === "conn" }));
  switch (p.kind) {
    case "conn": {
      const pins = connectorPins(p);
      return pins.map((at) => ({ at, size: 1.5, round: true }));
    }
    case "cap":
    case "res":
    case "led": {
      const horizontal = p.w >= p.h;
      const pad = horizontal ? p.h * 0.9 : p.w * 0.9;
      const off = horizontal ? p.w / 2 - pad / 2 : p.h / 2 - pad / 2;
      return horizontal
        ? [
            { at: [p.x - off, p.y], size: pad },
            { at: [p.x + off, p.y], size: pad },
          ]
        : [
            { at: [p.x, p.y - off], size: pad },
            { at: [p.x, p.y + off], size: pad },
          ];
    }
    case "fet":
      return [
        { at: [p.x - 1.2, p.y - 0.9], size: 0.9 },
        { at: [p.x + 1.2, p.y - 0.9], size: 0.9 },
        { at: [p.x, p.y + 1.0], size: 0.9 },
      ];
    case "switch":
      return [
        [-2.4, -1.8],
        [2.4, -1.8],
        [-2.4, 1.8],
        [2.4, 1.8],
      ].map(([dx, dy]) => ({ at: [p.x + dx, p.y + dy] as Pt, size: 1.3 }));
    default:
      return tapped;
  }
}

/** Footprint drawn relative to the part centre, in pixels. */
export function PartFootprint({ part, showRef = true, padsOnly = false }: { part: Part; showRef?: boolean; padsOnly?: boolean }) {
  const w = part.w * PX;
  const h = part.h * PX;
  if (part.kind === "hole") {
    return (
      <g>
        <circle r={3.2 * PX} fill="none" stroke={vizColors.amber} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
        <circle r={1.6 * PX} fill="#0b0f17" stroke={vizColors.silk} strokeWidth={1.2} />
      </g>
    );
  }
  const pads = padsFor(part);
  const big = part.kind === "module" || part.kind === "ic" || part.kind === "conn" || part.kind === "switch" || part.kind === "fet";
  return (
    <g>
      {!padsOnly && (
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={2} fill="rgba(255,255,255,0.05)" stroke={vizColors.silk} strokeWidth={1.2} strokeOpacity={0.85} />
      )}
      {pads.map((pd, i) => {
        const s = pd.size * PX;
        const cx = (pd.at[0] - part.x) * PX;
        const cy = (pd.at[1] - part.y) * PX;
        return pd.round ? (
          <circle key={i} cx={cx} cy={cy} r={s / 2} fill={vizColors.copper} />
        ) : (
          <rect key={i} x={cx - s / 2} y={cy - s / 2} width={s} height={s} fill={vizColors.copper} />
        );
      })}
      {!padsOnly && (part.kind === "ic" || part.kind === "module") && <circle cx={-w / 2 + 6} cy={-h / 2 + 6} r={2.4} fill={vizColors.silk} />}
      {!padsOnly && showRef && big && part.kind === "conn" && (
        <Label x={0} y={-h / 2 - 7} size={10} bold color={vizColors.silk}>
          {`${part.ref} ${part.label}`}
        </Label>
      )}
      {!padsOnly && showRef && big && part.kind !== "conn" && (
        <>
          <Label x={0} y={part.kind === "ic" || part.kind === "module" ? -4 : 0} size={part.kind === "module" ? 13 : 11} bold color={vizColors.silk}>
            {part.ref}
          </Label>
          {(part.kind === "ic" || part.kind === "module") && (
            <Label x={0} y={9} size={part.kind === "module" ? 11 : 9} color={vizColors.muted}>
              {part.label}
            </Label>
          )}
        </>
      )}
    </g>
  );
}

/** Diagonal hatch for the antenna keep-out. */
export function KeepoutHatch({ id }: { id: string }) {
  return (
    <pattern id={id} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1={0} y1={0} x2={0} y2={8} stroke={vizColors.red} strokeWidth={2} opacity={0.55} />
    </pattern>
  );
}

/** Static placement plan with zones for the lesson figure. */
export function PlacementPlan() {
  const boardW = BOARD.w * PX;
  const boardH = BOARD.h * PX;
  const hatch = "plan-keepout-hatch";
  return (
    <SvgCanvas viewBox="0 0 720 500" title="Placement plan of the 60 by 40 millimetre motor-driver board with its four zones">
      <defs>
        <KeepoutHatch id={hatch} />
      </defs>
      <rect x="0" y="0" width="720" height="500" rx="8" fill={vizColors.bg} />
      <rect x={bx(0)} y={by(0)} width={boardW} height={boardH} rx={10} fill={BOARD_FILL} stroke={vizColors.amber} strokeWidth={2} />

      {zones.map((z) =>
        z.rects.map(([x, y, w, h], k) => (
          <rect key={`${z.id}${k}`} x={bx(x)} y={by(y)} width={w * PX} height={h * PX} fill={z.color} opacity={0.14} stroke={z.color} strokeOpacity={0.6} strokeDasharray="5 4" />
        )),
      )}
      {zones.map((z) => (
        <Label key={`${z.id}-label`} x={bx(z.label[0])} y={by(z.label[1])} anchor="start" size={12} bold color={z.color}>
          {z.name}
        </Label>
      ))}

      {/* antenna keep-out */}
      <rect x={bx(antennaKeepout.x)} y={by(antennaKeepout.y)} width={antennaKeepout.w * PX} height={antennaKeepout.h * PX} fill={`url(#${hatch})`} stroke={vizColors.red} strokeOpacity={0.7} />

      {parts.map((p) => (
        <g key={p.ref} transform={`translate(${bx(p.x)} ${by(p.y)})`}>
          <PartFootprint part={p} showRef={true} />
        </g>
      ))}

      {/* callouts */}
      <Label x={bx(30)} y={by(-1.7)} size={12} color={vizColors.muted}>
        60 mm
      </Label>
      <Arrow x1={bx(24)} y1={by(-1.1)} x2={bx(0.4)} y2={by(-1.1)} color={vizColors.muted} width={1.2} head={6} />
      <Arrow x1={bx(36)} y1={by(-1.1)} x2={bx(59.6)} y2={by(-1.1)} color={vizColors.muted} width={1.2} head={6} />
      <Label x={bx(-1.9)} y={by(20)} size={12} color={vizColors.muted} rotate={-90}>
        40 mm
      </Label>
      <Arrow x1={bx(-1.1)} y1={by(17)} x2={bx(-1.1)} y2={by(0.4)} color={vizColors.muted} width={1.2} head={6} />
      <Arrow x1={bx(-1.1)} y1={by(23)} x2={bx(-1.1)} y2={by(39.6)} color={vizColors.muted} width={1.2} head={6} />

      <Label x={bx(antennaKeepout.x + antennaKeepout.w / 2)} y={by(antennaKeepout.y + antennaKeepout.h / 2)} size={11} bold color={vizColors.silk} rotate={-90}>
        antenna keep-out: no copper
      </Label>
      <Label x={bx(5)} y={by(41.6)} anchor="start" size={11} color={vizColors.muted}>
        battery in at the rear-left, motors out of the rear edge, sensors on the front edge, M3 holes 3.5 mm from each corner
      </Label>
    </SvgCanvas>
  );
}
