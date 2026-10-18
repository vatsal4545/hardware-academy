"use client";

/**
 * Top view of the motor-driver board for the components-in-action tour: the KiCad lesson's board data drawn with the
 * current station's parts glowing, its copper bright and the rest dimmed, charge dots running along the station's
 * copper at a speed proportional to the current, and every part a focusable button for probe mode.
 */

import { useId, type KeyboardEvent } from "react";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { allNets, allParts, FLOW_DOT_SPACING_PX, IO35_PAD, type Station } from "./BoardInAction.board";
import { dotCount, FlowDots, makePath, type FlowPath } from "./OhmsLawCircuit.helpers";
import { BOARD, NET_WIDTH, antennaKeepout, type Net, type Pt } from "./SchematicToLayoutBoard";
import { BACK_COPPER, BOARD_FILL, FRONT_COPPER, KeepoutHatch, PX, PartFootprint, bx, by } from "./SchematicToLayoutShapes";

export interface BoardTopViewProps {
  station: Station;
  /** one phase (0..1) per station flow, from useFlowPhases */
  phases: number[];
  /** one arc-length path per station flow, from flowPathsFor */
  flowPaths: FlowPath[];
  /** the part being inspected, or null */
  selected: string | null;
  onSelect: (ref: string | null) => void;
  /** left motor direction, which picks the winding station's flow geometry */
  forward: boolean;
}

/** The station's flows as arc-length paths in pixels; the winding flows swap geometry when the motor reverses. */
export function flowPathsFor(station: Station, forward: boolean): FlowPath[] {
  return station.flows.map((f) => {
    const pts: Pt[] = forward || !f.reversePts ? f.pts : f.reversePts;
    return makePath(pts.map(([x, y]) => [bx(x), by(y)] as const));
  });
}

const toPx = (pts: Pt[]) => pts.map(([x, y]) => `${bx(x)},${by(y)}`).join(" ");

function Routes({ layer, lit }: { layer: "F" | "B"; lit: Set<string> }) {
  const color = layer === "F" ? FRONT_COPPER : BACK_COPPER;
  const draw = (n: Net, halo: boolean) =>
    n.routes
      .filter((r) => r.layer === layer)
      .map((r, i) => (
        <polyline
          key={`${n.id}-${layer}-${i}${halo ? "-halo" : ""}`}
          points={toPx(r.pts)}
          fill="none"
          stroke={halo ? vizColors.amber : color}
          strokeWidth={(NET_WIDTH[n.cls] + (halo ? 0.9 : 0)) * PX}
          strokeOpacity={halo ? 0.35 : lit.has(n.id) ? 1 : 0.22}
          strokeLinecap="round"
          strokeLinejoin="round"
          data-net={n.id}
          data-lit={lit.has(n.id)}
        />
      ));
  return (
    <g>
      {allNets.filter((n) => lit.has(n.id)).map((n) => draw(n, true))}
      {allNets.map((n) => draw(n, false))}
    </g>
  );
}

export function BoardTopView({ station, phases, flowPaths, selected, onSelect, forward }: BoardTopViewProps) {
  const uid = useId().replace(/:/g, "");
  const litParts = new Set(station.parts);
  const litNets = new Set(station.nets);
  const anyLit = litParts.size > 0;

  const keyed = (ref: string) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(ref);
    }
  };

  return (
    <SvgCanvas
      viewBox="0 0 720 470"
      role="group"
      title={`Top view of the motor-driver board. Station: ${station.title}. Lit parts: ${station.parts.join(", ")}. Every part is a button you can inspect.`}
    >
      <defs>
        <KeepoutHatch id={`${uid}-hatch`} />
      </defs>
      <rect x={0} y={0} width={720} height={470} rx={8} fill={vizColors.bg} />
      <rect x={bx(0)} y={by(0)} width={BOARD.w * PX} height={BOARD.h * PX} rx={10} fill={BOARD_FILL} stroke={vizColors.amber} strokeWidth={2} />
      <rect
        x={bx(antennaKeepout.x)}
        y={by(antennaKeepout.y)}
        width={antennaKeepout.w * PX}
        height={antennaKeepout.h * PX}
        fill={`url(#${uid}-hatch)`}
        stroke={vizColors.red}
        strokeOpacity={0.4}
      />

      <Routes layer="B" lit={litNets} />
      <Routes layer="F" lit={litNets} />
      {allNets.map((n) =>
        n.vias.map(([x, y], i) => (
          <g key={`${n.id}-via-${i}`} opacity={litNets.has(n.id) ? 1 : 0.4}>
            <circle cx={bx(x)} cy={by(y)} r={3.2} fill={vizColors.copper} />
            <circle cx={bx(x)} cy={by(y)} r={1.4} fill={vizColors.bg} />
          </g>
        )),
      )}

      {/* mounting holes are not parts to inspect */}
      {allParts
        .filter((p) => p.kind === "hole")
        .map((p) => (
          <g key={p.ref} transform={`translate(${bx(p.x)} ${by(p.y)})`}>
            <PartFootprint part={p} />
          </g>
        ))}

      {allParts
        .filter((p) => p.kind !== "hole")
        .map((p) => {
          const lit = litParts.has(p.ref);
          const isSelected = selected === p.ref;
          const w = p.w * PX;
          const h = p.h * PX;
          const big = p.kind === "module" || p.kind === "ic" || p.kind === "conn" || p.kind === "switch" || p.kind === "fet";
          return (
            <g
              key={p.ref}
              role="button"
              tabIndex={0}
              aria-label={`Inspect ${p.ref}, ${p.label}`}
              aria-pressed={isSelected}
              data-part={p.ref}
              data-lit={lit}
              transform={`translate(${bx(p.x)} ${by(p.y)})`}
              opacity={lit || isSelected || !anyLit ? 1 : 0.72}
              onClick={() => onSelect(p.ref)}
              onKeyDown={keyed(p.ref)}
              style={{ cursor: "pointer" }}
            >
              {lit && <rect x={-w / 2 - 5} y={-h / 2 - 5} width={w + 10} height={h + 10} rx={7} fill={vizColors.amber} opacity={0.32} />}
              {isSelected && <rect x={-w / 2 - 7} y={-h / 2 - 7} width={w + 14} height={h + 14} rx={8} fill="none" stroke={vizColors.cyan} strokeWidth={2.5} />}
              <PartFootprint part={p} showRef={big} />
              {!big && (lit || isSelected) && (
                <Label x={0} y={-h / 2 - 9} size={10} bold color={vizColors.silk}>
                  {`${p.ref} ${p.label}`}
                </Label>
              )}
            </g>
          );
        })}

      {/* the Rev B pad on the module for the battery divider */}
      <rect x={bx(IO35_PAD[0]) - 4.5} y={by(IO35_PAD[1]) - 4.5} width={9} height={9} fill={vizColors.copper} />
      <Label x={bx(IO35_PAD[0])} y={by(IO35_PAD[1]) - 10} size={8} mono color={vizColors.muted}>IO35</Label>

      {station.flows.map((flow, k) => {
        const path = flowPaths[k];
        if (!path) return null;
        return (
          <g key={flow.id} data-flow={flow.id}>
            <FlowDots path={path} phase={phases[k] ?? 0} count={dotCount(path.length, FLOW_DOT_SPACING_PX)} color={flow.color ?? vizColors.amber} r={3.2} />
          </g>
        );
      })}

      <Label x={bx(30)} y={by(-1.6)} size={11} color={vizColors.muted}>
        {`60 × 40 mm, top view. ${forward ? "Left motor forward." : "Left motor reversed."} Dots are conventional current; their speed follows the amps.`}
      </Label>
    </SvgCanvas>
  );
}
