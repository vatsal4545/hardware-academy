"use client";

import dynamic from "next/dynamic";
import { Component, useState, useSyncExternalStore, type ReactNode } from "react";
import { Slider, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, usePrefersReducedMotion, vizColors } from "@/components/viz/shared";
import { MOTOR, MOTOR_COLORS, partOffsets } from "./Motor3DParts";

const Motor3DScene = dynamic(() => import("./Motor3DScene").then((m) => m.Motor3DScene), {
  ssr: false,
  loading: () => <MotorDrawing explode={0.7} note="Loading the 3D model…" />,
});

// WebGL never appears or disappears at runtime, so there is nothing to subscribe to.
const subscribeNever = () => () => {};
const detectWebGL = () => typeof window !== "undefined" && "WebGLRenderingContext" in window;
// null while server rendering and hydrating: unknown yet, so the 2D drawing shows without a misleading note.
const unknownOnServer = () => null;

/** Falls back to the 2D drawing if the GPU refuses to create a WebGL context. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// 2D cutaway: shaft along x, S px per model unit, origin at (OX, OY), y up.
const S = 62;
const OX = 205;
const OY = 292;
const X = (x: number) => OX + x * S;
const Y = (y: number) => OY - y * S;

function box(x0: number, x1: number, y0: number, y1: number) {
  return { x: X(x0), y: Y(y1), width: (x1 - x0) * S, height: (y1 - y0) * S };
}

function PartCallout({ x, y, tx, ty, text, anchor = "middle" }: { x: number; y: number; tx: number; ty: number; text: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <g>
      <line x1={x} y1={y} x2={tx} y2={ty + (ty > y ? -7 : 7)} stroke={vizColors.muted} strokeWidth={1} />
      <Label x={tx} y={ty} size={12} anchor={anchor}>
        {text}
      </Label>
    </g>
  );
}

/** A 2D exploded cutaway of the same parts the 3D scene draws. Used while loading, without WebGL and under reduced motion. */
function MotorDrawing({ explode, note }: { explode: number; note: string }) {
  const o = partOffsets(explode);
  const { stator, rotor, magnet, shaft, bearing, housing, cap, winding } = MOTOR;
  const labels = explode >= 0.3;
  const laminationLines = Array.from({ length: stator.laminations - 1 }, (_, k) => -stator.length / 2 + ((k + 1) * stator.length) / stator.laminations);
  return (
    <SvgCanvas viewBox="0 0 640 400" title="Exploded cutaway of a traction motor: housing, end caps, stator laminations, hairpin windings, rotor, magnets, shaft and bearings">
      <rect x={0} y={0} width={640} height={400} fill={vizColors.bg} rx={10} />
      <line x1={X(-3)} y1={OY} x2={X(4.8)} y2={OY} stroke={vizColors.grid} strokeDasharray="8 6" />

      {/* housing, lifted off */}
      <g data-part="housing" transform={`translate(0 ${-o.housingY * S})`}>
        <rect {...box(-housing.length / 2, housing.length / 2, -housing.r, housing.r)} rx={6} fill={MOTOR_COLORS.housing} fillOpacity={0.16} stroke={MOTOR_COLORS.housing} strokeWidth={2} />
        {Array.from({ length: housing.fins }, (_, k) => {
          const x = X(-1 + (2 * k) / (housing.fins - 1));
          return (
            <g key={k} stroke={MOTOR_COLORS.housing} strokeWidth={3}>
              <line x1={x} y1={Y(housing.r)} x2={x} y2={Y(housing.r + 0.12)} />
              <line x1={x} y1={Y(-housing.r)} x2={x} y2={Y(-housing.r - 0.12)} />
            </g>
          );
        })}
      </g>

      {/* stator: two halves of the cut lamination stack with the hairpin bars and end turns */}
      <g data-part="stator">
        {[1, -1].map((side) => (
          <g key={side}>
            <rect {...box(-stator.length / 2, stator.length / 2, side > 0 ? stator.rIn : -stator.rOut, side > 0 ? stator.rOut : -stator.rIn)} fill={MOTOR_COLORS.lamination} fillOpacity={0.85} />
            {laminationLines.map((lx) => (
              <line key={lx} x1={X(lx)} x2={X(lx)} y1={Y(side * stator.rIn)} y2={Y(side * stator.rOut)} stroke={vizColors.bg} strokeWidth={1} />
            ))}
            <rect {...box(-stator.length / 2 - 0.12, stator.length / 2 + 0.12, side > 0 ? 0.8 : -0.9, side > 0 ? 0.9 : -0.8)} fill={MOTOR_COLORS.copper} />
            {[-1, 1].map((end) => (
              <rect
                key={end}
                {...box(end * winding.endTurnX - 0.11, end * winding.endTurnX + 0.11, side > 0 ? 0.74 : -0.98, side > 0 ? 0.98 : -0.74)}
                rx={6}
                fill={MOTOR_COLORS.copper}
              />
            ))}
          </g>
        ))}
      </g>

      {/* end caps */}
      {[o.frontCapX, o.rearCapX].map((cx) => (
        <rect key={cx > 0 ? "rear" : "front"} data-part={cx > 0 ? "rear-cap" : "front-cap"} {...box(cx - cap.thickness / 2, cx + cap.thickness / 2, -cap.r, cap.r)} rx={2} fill={MOTOR_COLORS.cap} />
      ))}

      {/* rotor assembly */}
      <g data-part="rotor" transform={`translate(${o.rotorX * S} 0)`}>
        <rect {...box(-rotor.length / 2, rotor.length / 2, -rotor.r, rotor.r)} rx={3} fill={MOTOR_COLORS.rotor} />
        {laminationLines.map((lx) => (
          <line key={lx} x1={X(lx)} x2={X(lx)} y1={Y(rotor.r)} y2={Y(-rotor.r)} stroke={vizColors.bg} strokeWidth={0.6} opacity={0.6} />
        ))}
        {[1, -1].map((side) => {
          const rc = side * o.magnetR;
          return (
            <rect
              key={side}
              {...box(-magnet.length / 2, magnet.length / 2, rc - magnet.thick / 2, rc + magnet.thick / 2)}
              rx={2}
              fill={side > 0 ? MOTOR_COLORS.magnetN : MOTOR_COLORS.magnetS}
            />
          );
        })}
        <rect {...box(-shaft.length / 2, shaft.length / 2, -shaft.r, shaft.r)} rx={3} fill={MOTOR_COLORS.shaft} />
        {[-1, 1].map((end) => (
          <g key={end} fill={MOTOR_COLORS.bearing}>
            <rect {...box(end * bearing.x - 0.08, end * bearing.x + 0.08, shaft.r, shaft.r + 0.16)} />
            <rect {...box(end * bearing.x - 0.08, end * bearing.x + 0.08, -shaft.r - 0.16, -shaft.r)} />
          </g>
        ))}
      </g>

      {labels ? (
        <g>
          <PartCallout x={X(0.6)} y={Y(housing.r + o.housingY)} tx={X(1.9)} ty={Y(housing.r + o.housingY + 0.35)} text="Housing (cooling fins)" anchor="start" />
          <PartCallout x={X(-0.3)} y={Y(-stator.rOut)} tx={X(-0.3)} ty={Y(-stator.rOut - 0.42)} text="Stator laminations" />
          <PartCallout x={X(-winding.endTurnX)} y={Y(0.98)} tx={X(-1.7)} ty={Y(1.55)} text="Hairpin windings" />
          <PartCallout x={X(o.rotorX - 0.3)} y={Y(-rotor.r)} tx={X(o.rotorX - 0.2)} ty={Y(-rotor.r - 0.75)} text="Rotor core" />
          <PartCallout x={X(o.rotorX - 0.3)} y={Y(o.magnetR + 0.06)} tx={X(o.rotorX + 0.6)} ty={Y(o.magnetR + 0.55)} text="NdFeB magnets" anchor="start" />
          <PartCallout x={X(o.rotorX + shaft.length / 2 - 0.1)} y={Y(shaft.r)} tx={X(o.rearCapX + 0.25)} ty={Y(0.75)} text="Shaft + bearings" anchor="start" />
          <PartCallout x={X(o.frontCapX)} y={Y(-cap.r)} tx={X(o.frontCapX)} ty={Y(-cap.r - 0.35)} text="Front cap" />
          <PartCallout x={X(o.rearCapX)} y={Y(-cap.r)} tx={X(o.rearCapX)} ty={Y(-cap.r - 0.35)} text="Rear cap" />
        </g>
      ) : (
        <Label x={X(0)} y={Y(-cap.r - 0.4)} size={12} color={vizColors.muted}>
          Assembled. Drag Explode to take it apart.
        </Label>
      )}
      <Label x={624} y={22} size={11} anchor="end" color={vizColors.muted}>
        {note}
      </Label>
    </SvgCanvas>
  );
}

/** Exploded traction motor: a lazy React Three Fiber scene with a 2D fallback. */
export function Motor3D() {
  const reducedMotion = usePrefersReducedMotion();
  const webgl = useSyncExternalStore<boolean | null>(subscribeNever, detectWebGL, unknownOnServer);
  const [explode, setExplode] = useState(0.7);
  const [spinChoice, setSpinChoice] = useState<boolean | null>(null);
  const [view3DChoice, setView3DChoice] = useState<boolean | null>(null);
  const autoRotate = spinChoice ?? !reducedMotion;
  const show3D = webgl === true && (view3DChoice ?? !reducedMotion);

  const note =
    webgl === null
      ? "2D drawing"
      : !webgl
        ? "2D drawing: this browser has no WebGL for the 3D model"
        : show3D
          ? "2D drawing: the 3D model could not start"
          : reducedMotion && view3DChoice === null
            ? "2D drawing (reduced motion). Turn on 3D model to load it."
            : "2D drawing";
  const drawing = <MotorDrawing explode={explode} note={note} />;

  return (
    <VizFrame
      title="Inside a traction motor"
      description="An interior-PM motor taken apart along its shaft. Drag to orbit the 3D model; slide Explode to separate the housing, stator, rotor and end caps."
      controls={
        <>
          <Slider label="Explode" value={explode} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={setExplode} />
          {webgl === true && <Toggle label="3D model" checked={show3D} onChange={setView3DChoice} />}
          {show3D && <Toggle label="Auto-rotate" checked={autoRotate} onChange={setSpinChoice} />}
        </>
      }
      footer="Stator: 24 slots of rectangular hairpin bars in a stack of thin steel laminations (thin sheets cut eddy-current loss). Rotor: 8 NdFeB magnets buried in the steel, which is what makes it an interior-PM machine. Oil sprayed on the end turns and pumped through the hollow shaft carries the heat away."
    >
      {show3D ? (
        <div className="aspect-[8/5] w-full overflow-hidden rounded-lg bg-[#0b0f17]">
          <SceneBoundary fallback={drawing}>
            <Motor3DScene explode={explode} autoRotate={autoRotate} />
          </SceneBoundary>
        </div>
      ) : (
        drawing
      )}
    </VizFrame>
  );
}
