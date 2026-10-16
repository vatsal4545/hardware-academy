"use client";

import { useMemo, useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, polyline, useViz, vizColors } from "@/components/viz/shared";
import { RoundedArrow, r2 } from "./EvAShapes";
import { PHASES } from "./ThreePhaseField";

export type RotorType = "spm" | "ipm";

const TAU = Math.PI * 2;
const SQRT3_2 = Math.sqrt(3) / 2;

/** Inverse Park then inverse Clarke (amplitude-invariant): d-q currents at rotor angle theta to phase currents. */
export function dqToAbc(id: number, iq: number, theta: number): [number, number, number] {
  const alpha = id * Math.cos(theta) - iq * Math.sin(theta);
  const beta = id * Math.sin(theta) + iq * Math.cos(theta);
  return [alpha, -0.5 * alpha + SQRT3_2 * beta, -0.5 * alpha - SQRT3_2 * beta];
}

/** Clarke then Park (amplitude-invariant): what an FOC controller computes from measured phase currents. */
export function abcToDq(ia: number, ib: number, ic: number, theta: number): { d: number; q: number } {
  const alpha = (2 / 3) * (ia - 0.5 * ib - 0.5 * ic);
  const beta = (ib - ic) / Math.sqrt(3);
  return { d: alpha * Math.cos(theta) + beta * Math.sin(theta), q: -alpha * Math.sin(theta) + beta * Math.cos(theta) };
}

/** Illustrative 6-pole traction motor (pole pairs 3, magnet flux linkage 0.09 Wb). */
export const MOTOR_PARAMS = {
  polePairs: 3,
  psiM: 0.09,
  spm: { ld: 0.3e-3, lq: 0.3e-3 },
  ipm: { ld: 0.2e-3, lq: 0.4e-3 },
} as const;

/** T = 1.5·pp·[ψm·Iq + (Ld − Lq)·Id·Iq]; for a surface PM motor Ld = Lq and this is Kt·Iq. */
export function torqueNm(id: number, iq: number, rotor: RotorType): number {
  const { ld, lq } = MOTOR_PARAMS[rotor];
  return 1.5 * MOTOR_PARAMS.polePairs * (MOTOR_PARAMS.psiM * iq + (ld - lq) * id * iq);
}

// Left: vector diagram. Right: phase currents over two electrical cycles.
const CX = 170;
const CY = 168;
const K = 140 / 600; // px per amp in the vector diagram
const PX0 = 384;
const PX1 = 744;
const PY = 168;
const PK = 100 / 650; // px per amp in the plot
const ROTATION_HZ = 0.2; // on-screen electrical revolutions per second
const xOf = (theta: number) => PX0 + (theta / (2 * TAU)) * (PX1 - PX0);
const pt = (r: number, a: number) => ({ x: r2(CX + r * Math.cos(a)), y: r2(CY - r * Math.sin(a)) });

export function DqFrame() {
  const { playing, toggle, t, reset } = useViz();
  const [id, setId] = useState(0);
  const [iq, setIq] = useState(300);
  const [rotor, setRotor] = useState<RotorType>("spm");

  const theta = TAU * ROTATION_HZ * t;
  const [ia, ib, ic] = dqToAbc(id, iq, theta);
  const mag = Math.hypot(id, iq);
  const gammaDeg = (Math.atan2(iq, id) * 180) / Math.PI;
  const torque = torqueNm(id, iq, rotor);
  const psiD = MOTOR_PARAMS.psiM + MOTOR_PARAMS[rotor].ld * id;

  const curves = useMemo(
    () =>
      [0, 1, 2].map((k) =>
        polyline(
          Array.from({ length: 241 }, (_, j) => {
            const th = (j / 240) * 2 * TAU;
            return [xOf(th), PY - dqToAbc(id, iq, th)[k] * PK] as [number, number];
          }),
        ),
      ),
    [id, iq],
  );

  const tip = { x: r2(CX + K * (id * Math.cos(theta) - iq * Math.sin(theta))), y: r2(CY - K * (id * Math.sin(theta) + iq * Math.cos(theta))) };
  const idEnd = pt(K * id, theta);
  const cursorTheta = ((theta % (2 * TAU)) + 2 * TAU) % (2 * TAU);
  const cursorX = xOf(cursorTheta);
  const phaseValues = [ia, ib, ic];

  return (
    <VizFrame
      title="The d-q frame: two DC numbers, three AC currents"
      description="The d axis is locked to the rotor magnet and spins with it. Set Id and Iq, which stay constant in the rotating frame, and watch the inverse Park and Clarke transforms turn them into three sinusoidal phase currents."
      controls={
        <>
          <Slider label="Id (d-axis current)" value={id} min={-400} max={200} step={10} unit="A" onChange={setId} />
          <Slider label="Iq (q-axis current)" value={iq} min={-500} max={500} step={10} unit="A" onChange={setIq} />
          <Segmented<RotorType>
            label="Rotor"
            options={[
              { value: "spm", label: "Surface PM" },
              { value: "ipm", label: "Interior PM" },
            ]}
            value={rotor}
            onChange={setRotor}
          />
          <PlayPause playing={playing} onToggle={toggle} onReset={reset} />
        </>
      }
      footer="Illustrative motor: 3 pole pairs, magnet flux linkage 0.09 Wb, Ld = Lq = 0.3 mH (surface PM) or Ld = 0.2 mH, Lq = 0.4 mH (interior PM). Currents are peak values. Each phase current is the projection of the current vector onto that phase's axis."
    >
      <SvgCanvas viewBox="0 0 760 340" title="Rotating d-q axes with the current vector, and the resulting three phase currents">
        <rect x={0} y={0} width={760} height={340} fill={vizColors.bg} rx={10} />

        {/* stationary phase axes */}
        {PHASES.map((ph) => {
          const a = pt(150, ph.axis);
          const b = pt(-150, ph.axis);
          const l = pt(160, ph.axis);
          return (
            <g key={ph.name}>
              <line x1={b.x} y1={b.y} x2={a.x} y2={a.y} stroke={ph.color} strokeDasharray="3 5" opacity={0.55} />
              <Label x={l.x} y={l.y} size={11} bold color={ph.color}>
                {ph.name.toLowerCase()}
              </Label>
            </g>
          );
        })}

        {/* rotor magnet, aligned with d */}
        <g transform={`rotate(${r2((-theta * 180) / Math.PI)} ${CX} ${CY})`}>
          <rect x={CX} y={CY - 12} width={44} height={24} rx={4} fill={vizColors.red} fillOpacity={0.3} />
          <rect x={CX - 44} y={CY - 12} width={44} height={24} rx={4} fill={vizColors.blue} fillOpacity={0.3} />
          <Label x={CX + 30} y={CY} size={11} bold>
            N
          </Label>
          <Label x={CX - 30} y={CY} size={11} bold>
            S
          </Label>
        </g>

        {/* rotating d and q axes */}
        {[
          { a: theta, name: "d", color: vizColors.green },
          { a: theta + Math.PI / 2, name: "q", color: vizColors.cyan },
        ].map((ax) => {
          const p1 = pt(140, ax.a);
          const p0 = pt(-140, ax.a);
          const l = pt(150, ax.a);
          return (
            <g key={ax.name}>
              <line x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={ax.color} strokeWidth={1.5} />
              <Label x={l.x} y={l.y} size={13} bold color={ax.color}>
                {ax.name}
              </Label>
            </g>
          );
        })}

        {/* projections of the current vector onto the phase axes = the phase currents */}
        {PHASES.map((ph, k) => {
          const foot = pt(K * phaseValues[k], ph.axis);
          return (
            <g key={ph.name}>
              <line x1={tip.x} y1={tip.y} x2={foot.x} y2={foot.y} stroke={ph.color} strokeDasharray="2 3" opacity={0.6} />
              <circle cx={foot.x} cy={foot.y} r={4.5} fill={ph.color} />
            </g>
          );
        })}

        {/* Id along d, then Iq along q, tip to tail */}
        {Math.abs(id) >= 10 && <RoundedArrow x1={CX} y1={CY} x2={idEnd.x} y2={idEnd.y} color={vizColors.green} width={4} head={10} />}
        {Math.abs(iq) >= 10 && <RoundedArrow x1={idEnd.x} y1={idEnd.y} x2={tip.x} y2={tip.y} color={vizColors.cyan} width={4} head={10} />}
        {mag >= 10 && <RoundedArrow x1={CX} y1={CY} x2={tip.x} y2={tip.y} color={vizColors.violet} width={2.5} head={11} />}
        <circle cx={CX} cy={CY} r={4} fill={vizColors.muted} />

        {/* phase currents */}
        <Label x={(PX0 + PX1) / 2} y={16} size={12} color={vizColors.muted}>
          Phase currents over two electrical cycles
        </Label>
        {[600, 300, 0, -300, -600].map((v) => (
          <g key={v}>
            <line x1={PX0} y1={PY - v * PK} x2={PX1} y2={PY - v * PK} stroke={vizColors.grid} strokeDasharray={v === 0 ? undefined : "3 4"} />
            <Label x={PX0 - 6} y={PY - v * PK} anchor="end" size={10} color={vizColors.muted}>
              {`${v < 0 ? "−" : ""}${Math.abs(v)} A`}
            </Label>
          </g>
        ))}
        {curves.map((d, k) => (
          <path key={PHASES[k].name} d={d} fill="none" stroke={PHASES[k].color} strokeWidth={2} />
        ))}
        <line x1={r2(cursorX)} y1={PY - 106} x2={r2(cursorX)} y2={PY + 106} stroke={vizColors.violet} strokeWidth={1.5} />
        {PHASES.map((ph, k) => (
          <circle key={ph.name} cx={r2(cursorX)} cy={r2(PY - phaseValues[k] * PK)} r={5} fill={ph.color} stroke={vizColors.bg} strokeWidth={1.5} />
        ))}
        <Label x={PX0} y={300} anchor="start" size={11} mono>
          {`ia ${ia.toFixed(0)} A   ib ${ib.toFixed(0)} A   ic ${ic.toFixed(0)} A`}
        </Label>
        <Label x={PX0} y={320} anchor="start" size={11} color={vizColors.muted}>
          {`Amplitude ${mag.toFixed(0)} A, shifted ${(gammaDeg - 90).toFixed(0)}° from the pure-Iq position`}
        </Label>
      </SvgCanvas>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">Phase current amplitude</dt>
          <dd className="font-mono">{`${mag.toFixed(0)} A peak`}</dd>
        </div>
        <div>
          <dt className="text-muted">Current angle from d</dt>
          <dd className="font-mono">{`${gammaDeg.toFixed(0)}°`}</dd>
        </div>
        <div>
          <dt className="text-muted">Torque</dt>
          <dd className="font-mono">{`${torque.toFixed(1)} N·m`}</dd>
        </div>
        <div>
          <dt className="text-muted">d-axis flux linkage</dt>
          <dd className="font-mono">{`${psiD.toFixed(3)} Wb`}</dd>
        </div>
      </dl>
      <p className="mt-2 text-sm text-muted">
        {rotor === "spm"
          ? id === 0
            ? "Surface PM: all current is torque current. This is the most torque per amp."
            : id < 0
              ? "Surface PM: negative Id makes no torque here; it only weakens the magnet flux, which is what field weakening uses at high speed."
              : "Surface PM: positive Id adds to the magnet flux, makes no torque and wastes current."
          : id < 0
            ? "Interior PM: negative Id adds reluctance torque on top of magnet torque. Controllers pick the Id that gives the most torque per amp (MTPA)."
            : "Interior PM: with Id at or above zero the rotor's reluctance torque is unused or even subtracts."}
      </p>
    </VizFrame>
  );
}
