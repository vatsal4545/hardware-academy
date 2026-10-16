"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, polyline, useViz, vizColors } from "@/components/viz/shared";
import { RoundedArrow, r2 } from "./EvAShapes";

export type RotorKind = "induction" | "pm";
type Poles = "2" | "4" | "6" | "8";

const TAU = Math.PI * 2;
const PHASE_SHIFT = TAU / 3;

/** Winding axes of a 2-pole stator, counter-clockwise from phase A. */
export const PHASES = [
  { name: "A", axis: 0, color: vizColors.red },
  { name: "B", axis: PHASE_SHIFT, color: vizColors.amber },
  { name: "C", axis: 2 * PHASE_SHIFT, color: vizColors.blue },
] as const;

/** The animation runs this many times slower than the electrical frequency it reports. */
export const SLOWDOWN = 200;

/** Balanced phase currents per unit of peak current at electrical angle theta. */
export function phaseCurrents(theta: number): [number, number, number] {
  return [Math.cos(theta), Math.cos(theta - PHASE_SHIFT), Math.cos(theta + PHASE_SHIFT)];
}

/** Sum of the three winding MMF vectors (per unit of peak phase current). Length 1.5, angle theta. */
export function spaceVector(theta: number): { x: number; y: number } {
  const i = phaseCurrents(theta);
  let x = 0;
  let y = 0;
  PHASES.forEach((p, k) => {
    x += i[k] * Math.cos(p.axis);
    y += i[k] * Math.sin(p.axis);
  });
  return { x, y };
}

/** n_s = 120·f/p in rpm. */
export function syncSpeedRpm(freqHz: number, poles: number): number {
  return (120 * freqHz) / poles;
}

const rpm = (v: number) => `${Math.round(v).toLocaleString("en-US")} rpm`;
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}`;

// Stator drawing: centre, radii (px) and the length of one unit of phase current.
const CX = 170;
const CY = 172;
const R_OUT = 154;
const R_BORE = 114;
const R_ROTOR = 102;
const R_SLOT = 126;
const UNIT = 60;
// Current plot: two electrical cycles.
const PX0 = 384;
const PX1 = 744;
const PY = 172;
const PAMP = 92;
const xOf = (theta: number) => PX0 + (theta / (2 * TAU)) * (PX1 - PX0);

// The three current curves never change, so build their paths once.
const CURVES = PHASES.map((p, k) =>
  polyline(
    Array.from({ length: 241 }, (_, j) => {
      const th = (j / 240) * 2 * TAU;
      return [xOf(th), PY - phaseCurrents(th)[k] * PAMP] as [number, number];
    }),
  ),
);

const BARS = 16;
/** Screen point at radius r and math angle a (counter-clockwise, y up). */
const pt = (r: number, a: number) => ({ x: r2(CX + r * Math.cos(a)), y: r2(CY - r * Math.sin(a)) });

export function ThreePhaseField() {
  const { playing, toggle, t, reset } = useViz();
  const [rotor, setRotor] = useState<RotorKind>("induction");
  const [freq, setFreq] = useState(50);
  const [poles, setPoles] = useState<Poles>("4");
  const [slipPct, setSlipPct] = useState(5);
  const [deltaDeg, setDeltaDeg] = useState(60);
  // Angles are integrated piecewise: when a rate changes we re-anchor, so nothing jumps.
  const [anchor, setAnchor] = useState({ t0: 0, field0: 0, rotor0: 0 });

  const fieldRate = (TAU * freq) / SLOWDOWN; // rad/s on screen
  const slip = slipPct / 100;
  const delta = (deltaDeg * Math.PI) / 180;
  const fieldAngleAt = (time: number) => anchor.field0 + fieldRate * (time - anchor.t0);
  const rotorAngleAt = (time: number) =>
    rotor === "pm" ? fieldAngleAt(time) - delta : anchor.rotor0 + fieldRate * (1 - slip) * (time - anchor.t0);
  const theta = fieldAngleAt(t);
  const rho = rotorAngleAt(t);

  const reanchor = () => setAnchor({ t0: t, field0: fieldAngleAt(t), rotor0: rotorAngleAt(t) });
  const onFreq = (v: number) => {
    reanchor();
    setFreq(v);
  };
  const onSlip = (v: number) => {
    reanchor();
    setSlipPct(v);
  };
  const onRotor = (v: RotorKind) => {
    reanchor();
    setRotor(v);
  };
  const onReset = () => {
    reset();
    setAnchor({ t0: 0, field0: 0, rotor0: 0 });
  };

  const currents = phaseCurrents(theta);
  const field = spaceVector(theta);
  const fieldTip = { x: r2(CX + field.x * UNIT), y: r2(CY - field.y * UNIT) };
  const p = Number(poles);
  const ns = syncSpeedRpm(freq, p);
  const nRotor = rotor === "pm" ? ns : ns * (1 - slip);
  const slipHz = rotor === "pm" ? 0 : slip * freq;
  const cursorTheta = ((theta % (2 * TAU)) + 2 * TAU) % (2 * TAU);
  const cursorX = xOf(cursorTheta);
  // Induced bar current: proportional to slip, in phase with the air-gap flux density at the bar (low-slip approximation).
  const barScale = Math.min(1, slip / 0.1);

  return (
    <VizFrame
      title="Three currents, one rotating field"
      description="Each winding's field only pulses along its own axis. Their sum, the violet arrow, keeps a constant length and turns at the electrical frequency. Pick a rotor and watch how it follows."
      controls={
        <>
          <Segmented<RotorKind>
            label="Rotor"
            options={[
              { value: "induction", label: "Induction" },
              { value: "pm", label: "PM synchronous" },
            ]}
            value={rotor}
            onChange={onRotor}
          />
          <Slider label="Electrical frequency" value={freq} min={5} max={400} step={5} unit="Hz" onChange={onFreq} />
          <Segmented<Poles>
            label="Poles (for the speed readout)"
            options={[
              { value: "2", label: "2" },
              { value: "4", label: "4" },
              { value: "6", label: "6" },
              { value: "8", label: "8" },
            ]}
            value={poles}
            onChange={setPoles}
          />
          {rotor === "induction" ? (
            <Slider label="Slip" value={slipPct} min={0} max={20} step={0.5} unit="%" onChange={onSlip} />
          ) : (
            <Slider label="Torque angle δ" value={deltaDeg} min={0} max={90} step={5} unit="°" onChange={setDeltaDeg} />
          )}
          <PlayPause playing={playing} onToggle={toggle} onReset={onReset} />
        </>
      }
      footer={
        <>
          The drawing is a 2-pole machine, so one electrical cycle is one mechanical turn; a p-pole machine turns 2/p of a
          revolution per cycle, which is where n_s = 120·f/p comes from. Animation slowed {SLOWDOWN}×. Bar colors show the
          current induced in each rotor bar (orange out of the page, cyan into it).
        </>
      }
    >
      <SvgCanvas
        viewBox="0 0 760 350"
        title="Stator with three phase windings, the rotating resultant field vector, the rotor, and a plot of the three phase currents"
      >
        <rect x={0} y={0} width={760} height={350} fill={vizColors.bg} rx={10} />

        {/* stator iron */}
        <circle cx={CX} cy={CY} r={(R_OUT + R_BORE) / 2} fill="none" stroke="#273244" strokeWidth={R_OUT - R_BORE} />
        <circle cx={CX} cy={CY} r={R_OUT} fill="none" stroke={vizColors.muted} strokeWidth={1} />
        <circle cx={CX} cy={CY} r={R_BORE} fill="none" stroke={vizColors.muted} strokeWidth={1} />

        {/* coil sides: dot = current out of the page, cross = into the page */}
        {PHASES.map((ph, k) => {
          const i = currents[k];
          return [1, -1].map((side) => {
            const a = ph.axis + (side * Math.PI) / 2;
            const c = pt(R_SLOT, a);
            const out = side * i > 0;
            const label = pt(R_SLOT + 21, a);
            return (
              <g key={`${ph.name}${side}`}>
                <circle cx={c.x} cy={c.y} r={11} fill={ph.color} fillOpacity={r2(0.12 + 0.6 * Math.abs(i))} stroke={ph.color} strokeWidth={1.5} />
                {out ? (
                  <circle cx={c.x} cy={c.y} r={3} fill={vizColors.text} />
                ) : (
                  <g stroke={vizColors.text} strokeWidth={2}>
                    <line x1={c.x - 4} y1={c.y - 4} x2={c.x + 4} y2={c.y + 4} />
                    <line x1={c.x - 4} y1={c.y + 4} x2={c.x + 4} y2={c.y - 4} />
                  </g>
                )}
                <Label x={label.x} y={label.y} size={11} bold color={ph.color}>
                  {side === 1 ? ph.name : `${ph.name}′`}
                </Label>
              </g>
            );
          });
        })}

        {/* rotor */}
        <circle cx={CX} cy={CY} r={R_ROTOR} fill="#111827" stroke="#374151" strokeWidth={2} />
        {rotor === "pm" ? (
          <g transform={`rotate(${r2((-rho * 180) / Math.PI)} ${CX} ${CY})`}>
            <rect x={CX} y={CY - 18} width={78} height={36} rx={4} fill={vizColors.red} fillOpacity={0.35} stroke={vizColors.red} />
            <rect x={CX - 78} y={CY - 18} width={78} height={36} rx={4} fill={vizColors.blue} fillOpacity={0.35} stroke={vizColors.blue} />
            <Label x={CX + 60} y={CY} size={14} bold>
              N
            </Label>
            <Label x={CX - 60} y={CY} size={14} bold>
              S
            </Label>
          </g>
        ) : (
          <g>
            {Array.from({ length: BARS }, (_, k) => {
              const a = rho + (k / BARS) * TAU;
              const c = pt(R_ROTOR - 12, a);
              const i = barScale * Math.cos(a - theta);
              return (
                <circle
                  key={k}
                  cx={c.x}
                  cy={c.y}
                  r={6}
                  fill={i >= 0 ? vizColors.orange : vizColors.cyan}
                  fillOpacity={r2(0.12 + 0.88 * Math.abs(i))}
                  stroke="#4b5563"
                  strokeWidth={1}
                />
              );
            })}
            {/* reference mark painted on the rotor so you can see it fall behind the field */}
            <line
              x1={pt(20, rho).x}
              y1={pt(20, rho).y}
              x2={pt(R_ROTOR - 24, rho).x}
              y2={pt(R_ROTOR - 24, rho).y}
              stroke={vizColors.green}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </g>
        )}

        {/* constant-magnitude locus of the resultant */}
        <circle cx={CX} cy={CY} r={1.5 * UNIT} fill="none" stroke={vizColors.violet} strokeDasharray="4 5" opacity={0.6} />

        {/* each phase's contribution along its own axis */}
        {PHASES.map((ph, k) => {
          const len = currents[k] * UNIT;
          if (Math.abs(len) < 7) return null;
          return (
            <RoundedArrow
              key={ph.name}
              x1={CX}
              y1={CY}
              x2={CX + len * Math.cos(ph.axis)}
              y2={CY - len * Math.sin(ph.axis)}
              color={ph.color}
              width={2.5}
            />
          );
        })}

        {/* the resultant */}
        <RoundedArrow x1={CX} y1={CY} x2={fieldTip.x} y2={fieldTip.y} color={vizColors.violet} width={5} head={13} />
        {rotor === "pm" && deltaDeg > 0 && (
          <path
            d={`M ${pt(44, theta).x} ${pt(44, theta).y} A 44 44 0 0 1 ${pt(44, rho).x} ${pt(44, rho).y}`}
            fill="none"
            stroke={vizColors.green}
            strokeWidth={2}
          />
        )}
        <circle cx={CX} cy={CY} r={5} fill={vizColors.muted} />
        {rotor === "pm" && deltaDeg >= 15 && (
          <Label x={pt(56, theta - delta / 2).x} y={pt(56, theta - delta / 2).y} size={12} bold color={vizColors.green}>
            δ
          </Label>
        )}
        <Label x={14} y={338} anchor="start" size={11} color={vizColors.muted}>
          2-pole stator
        </Label>

        {/* phase-current plot */}
        <Label x={(PX0 + PX1) / 2} y={14} size={12} color={vizColors.muted}>
          Phase currents over two electrical cycles
        </Label>
        <line x1={PX0} y1={PY} x2={PX1} y2={PY} stroke={vizColors.grid} strokeWidth={1.5} />
        {[0, 1, 2, 3, 4].map((q) => (
          <g key={q}>
            <line x1={PX0 + (q / 4) * (PX1 - PX0)} y1={PY - PAMP - 6} x2={PX0 + (q / 4) * (PX1 - PX0)} y2={PY + PAMP + 6} stroke={vizColors.grid} />
            <Label x={PX0 + (q / 4) * (PX1 - PX0)} y={PY + PAMP + 18} size={10} color={vizColors.muted}>
              {`${q * 180}°`}
            </Label>
          </g>
        ))}
        <Label x={PX0 - 6} y={PY - PAMP} size={10} anchor="end" color={vizColors.muted}>
          +Im
        </Label>
        <Label x={PX0 - 6} y={PY + PAMP} size={10} anchor="end" color={vizColors.muted}>
          −Im
        </Label>
        {PHASES.map((ph, k) => (
          <path key={ph.name} d={CURVES[k]} fill="none" stroke={ph.color} strokeWidth={2} />
        ))}
        <line x1={r2(cursorX)} y1={PY - PAMP - 6} x2={r2(cursorX)} y2={PY + PAMP + 6} stroke={vizColors.violet} strokeWidth={1.5} />
        {PHASES.map((ph, k) => (
          <circle key={ph.name} cx={r2(cursorX)} cy={r2(PY - currents[k] * PAMP)} r={5} fill={ph.color} stroke={vizColors.bg} strokeWidth={1.5} />
        ))}
        <Label x={PX0} y={PY + PAMP + 40} anchor="start" size={11} mono>
          {`iA ${signed(currents[0])}   iB ${signed(currents[1])}   iC ${signed(currents[2])}   sum ${signed(
            Math.abs(currents[0] + currents[1] + currents[2]) < 5e-3 ? 0 : currents[0] + currents[1] + currents[2],
          )}`}
        </Label>
        <Label x={PX0} y={PY + PAMP + 58} anchor="start" size={11} color={vizColors.muted}>
          {`One cycle = ${(1000 / freq).toFixed(freq >= 100 ? 2 : 1)} ms at ${freq} Hz. Resultant length: always 1.5 × Im.`}
        </Label>
      </SvgCanvas>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">Synchronous speed (120·f/p)</dt>
          <dd className="font-mono">{rpm(ns)}</dd>
        </div>
        <div>
          <dt className="text-muted">Rotor speed</dt>
          <dd className="font-mono">{rpm(nRotor)}</dd>
        </div>
        <div>
          <dt className="text-muted">Rotor current frequency (s·f)</dt>
          <dd className="font-mono">{`${slipHz.toFixed(slipHz < 10 ? 2 : 1)} Hz`}</dd>
        </div>
        <div>
          <dt className="text-muted">{rotor === "pm" ? "Torque vs maximum (sin δ)" : "Slip"}</dt>
          <dd className="font-mono">{rotor === "pm" ? `${Math.round(Math.sin(delta) * 100)}%` : `${slipPct.toFixed(1)}%`}</dd>
        </div>
      </dl>
      <p className="mt-2 text-sm text-muted">
        {rotor === "pm"
          ? "The PM rotor locks to the field: same speed, trailing by a fixed torque angle δ instead of a growing slip. Torque grows with sin δ and peaks at 90°, which is where field-oriented control holds it; push a motor past that and it pulls out of step."
          : slip === 0
            ? "At zero slip the bars see no moving field, so no current is induced and there is no torque. Add slip."
            : "The rotor turns slower than the field, so the field sweeps through the bars and induces current. The green mark drifts backwards at the slip rate."}
      </p>
    </VizFrame>
  );
}
