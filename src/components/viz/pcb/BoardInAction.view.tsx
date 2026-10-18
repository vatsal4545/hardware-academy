"use client";

/**
 * Top view of the motor-driver board for the components-in-action tour: the KiCad lesson's board data drawn with the
 * current station's parts glowing, its copper bright and the rest dimmed, charge dots running along the station's
 * copper at a speed proportional to the current, every part a focusable button for probe mode, and twelve labelled test
 * pads that take the multimeter's probes.
 */

import { useId, type KeyboardEvent } from "react";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import type { TestPointId } from "@/lib/sim/board";
import { allNets, allParts, FLOW_DOT_SPACING_PX, type Station } from "./BoardInAction.board";
import { TEST_POINTS, type Probes } from "./BoardInAction.meter";
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
  /** which test pads hold the multimeter's probes */
  probes: Probes;
  onProbe: (id: TestPointId) => void;
  onClearProbes: () => void;
  /** the multimeter is switched on: the pads and their labels come forward */
  meterOn: boolean;
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

const PROBE_COLOR = { black: "#18181b", red: "#ef4444" } as const;

/** A probe tip on a pad: a short lead leaning away from the pad and a tag, COM for the black probe and V for the red. */
function ProbeTip({ x, y, probe }: { x: number; y: number; probe: "black" | "red" }) {
  const dx = probe === "black" ? -12 : 12;
  return (
    <g data-probe-tip={probe}>
      <line x1={x} y1={y} x2={x + dx} y2={y - 22} stroke={vizColors.silk} strokeWidth={5} strokeLinecap="round" />
      <line x1={x} y1={y} x2={x + dx} y2={y - 22} stroke={PROBE_COLOR[probe]} strokeWidth={3} strokeLinecap="round" />
      <circle cx={x} cy={y} r={4} fill={PROBE_COLOR[probe]} stroke={vizColors.silk} strokeWidth={1.2} />
      <Label x={x + dx} y={y - 30} size={8} bold color={PROBE_COLOR[probe] === PROBE_COLOR.red ? PROBE_COLOR.red : vizColors.silk}>
        {probe === "black" ? "COM" : "V"}
      </Label>
    </g>
  );
}

export function BoardTopView({ station, phases, flowPaths, selected, onSelect, forward, probes, onProbe, onClearProbes, meterOn }: BoardTopViewProps) {
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
  const padKeys = (id: TestPointId) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onProbe(id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClearProbes();
    }
  };

  return (
    <SvgCanvas
      viewBox="0 0 720 470"
      role="group"
      title={`Top view of the motor-driver board. Station: ${station.title}. Lit parts: ${station.parts.join(", ")}. Every part is a button you can inspect, and ${TEST_POINTS.length} test points take the multimeter's probes.`}
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

      {/* short copper stubs from the test pads to their nets, under the parts like the rest of the copper */}
      <g data-test-stubs fill="none" stroke={FRONT_COPPER} strokeOpacity={0.55} strokeWidth={NET_WIDTH.signal * PX} strokeLinecap="round" strokeLinejoin="round">
        {TEST_POINTS.flatMap((t) => (t.stubs ?? []).map((s, k) => <polyline key={`${t.id}-${k}`} points={toPx(s)} />))}
      </g>

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
              {/* small parts show their ref only while lit or selected (the value is in the panel and the probe card); a
                  vertical part is labelled beside it so the label does not land on the part above */}
              {!big && (lit || isSelected) && (
                <Label x={p.h > p.w ? w / 2 + 5 : 0} y={p.h > p.w ? 0 : -h / 2 - 8} anchor={p.h > p.w ? "start" : "middle"} size={10} bold color={vizColors.silk}>
                  {p.ref}
                </Label>
              )}
            </g>
          );
        })}

      {/* test pads: a ring on the copper, a silk label, and the probe that sits on it (the IO35 pad is the Rev B divider's) */}
      {TEST_POINTS.map((t) => {
        const probe = probes.black === t.id ? "black" : probes.red === t.id ? "red" : null;
        const x = bx(t.at[0]);
        const y = by(t.at[1]);
        return (
          <g
            key={t.id}
            role="button"
            tabIndex={0}
            aria-label={`Test point ${t.name}`}
            aria-pressed={probe !== null}
            data-test-point={t.id}
            data-probe={probe ?? undefined}
            opacity={meterOn || probe ? 1 : 0.8}
            onClick={() => onProbe(t.id)}
            onKeyDown={padKeys(t.id)}
            style={{ cursor: "pointer" }}
          >
            <circle cx={x} cy={y} r={9} fill="transparent" />
            <circle cx={x} cy={y} r={5.5} fill={vizColors.copper} stroke={meterOn ? vizColors.silk : vizColors.muted} strokeWidth={1.2} />
            <circle cx={x} cy={y} r={2} fill={BOARD_FILL} />
            <Label x={bx(t.labelAt[0])} y={by(t.labelAt[1])} anchor={t.anchor} size={8} mono color={meterOn ? vizColors.silk : vizColors.muted}>
              {t.label}
            </Label>
            {probe && <ProbeTip x={x} y={y} probe={probe} />}
          </g>
        );
      })}

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
