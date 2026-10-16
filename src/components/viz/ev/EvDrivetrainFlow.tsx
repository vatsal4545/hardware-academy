"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";
import { r2 } from "./EvAShapes";

export type BusVoltage = "400" | "800";

/** Efficiencies at a typical operating point. Real values droop at very light load. */
export const ETA = { pack: 0.98, inverter: 0.98, motor: 0.95, reducer: 0.975 } as const;
/** HV-bus power at full accelerator. */
const DRIVE_MAX_KW = 200;
/** Braking power requested at the wheels at full brake pedal. */
const REGEN_MAX_KW = 100;
/** BMS power limits. Cold = cells near −15 °C, where charging risks lithium plating. */
const LIMITS = {
  warm: { dischargeKw: 200, chargeKw: 80 },
  cold: { dischargeKw: 120, chargeKw: 5 },
} as const;
/** 2 m run of 70 mm² copper, out and back: R = ρL/A = 1.72e-8 × 4 / 70e-6 ≈ 0.98 mΩ. */
const CABLE_OHM = (1.72e-8 * 4) / 70e-6;
export const REFERENCE_KW = 150;

export interface FlowResult {
  mode: "drive" | "regen";
  /** Power on the HV bus, kW (direction given by mode). */
  busKw: number;
  /** Chemical power out of (drive) or into (regen) the cells, kW. */
  cellsKw: number;
  acKw: number;
  shaftKw: number;
  /** Drive: power delivered at the wheels. Regen: braking power the motor absorbs. */
  wheelKw: number;
  /** Regen only: braking power the friction brakes must provide. */
  frictionKw: number;
  requestedKw: number;
  limitedBy: null | "discharge" | "charge";
  currentA: number;
  cableLossW: number;
  losses: { pack: number; inverter: number; motor: number; reducer: number };
}

/** Steady-state power flow through pack, inverter, motor and reducer for one pedal position. */
export function drivetrainFlow(pedalPct: number, braking: boolean, cold: boolean, busV: number): FlowResult {
  const lim = cold ? LIMITS.cold : LIMITS.warm;
  const p = Math.max(0, Math.min(100, pedalPct)) / 100;
  if (!braking) {
    const requestedKw = p * DRIVE_MAX_KW;
    const busKw = Math.min(requestedKw, lim.dischargeKw);
    const cellsKw = busKw / ETA.pack;
    const acKw = busKw * ETA.inverter;
    const shaftKw = acKw * ETA.motor;
    const wheelKw = shaftKw * ETA.reducer;
    const currentA = (busKw * 1000) / busV;
    return {
      mode: "drive",
      busKw,
      cellsKw,
      acKw,
      shaftKw,
      wheelKw,
      frictionKw: 0,
      requestedKw,
      limitedBy: requestedKw > lim.dischargeKw ? "discharge" : null,
      currentA,
      cableLossW: currentA * currentA * CABLE_OHM,
      losses: { pack: cellsKw - busKw, inverter: busKw - acKw, motor: acKw - shaftKw, reducer: shaftKw - wheelKw },
    };
  }
  const requestedKw = p * REGEN_MAX_KW;
  const chain = ETA.reducer * ETA.motor * ETA.inverter;
  const busKw = Math.min(requestedKw * chain, lim.chargeKw);
  const wheelKw = busKw / chain;
  const shaftKw = wheelKw * ETA.reducer;
  const acKw = shaftKw * ETA.motor;
  const cellsKw = busKw * ETA.pack;
  const currentA = (busKw * 1000) / busV;
  return {
    mode: "regen",
    busKw,
    cellsKw,
    acKw,
    shaftKw,
    wheelKw,
    frictionKw: Math.max(0, requestedKw - wheelKw),
    requestedKw,
    limitedBy: requestedKw * chain > lim.chargeKw + 1e-9 ? "charge" : null,
    currentA,
    cableLossW: currentA * currentA * CABLE_OHM,
    losses: { reducer: wheelKw - shaftKw, motor: shaftKw - acKw, inverter: acKw - busKw, pack: busKw - cellsKw },
  };
}

export function formatAmps(a: number): string {
  const rounded = Math.round(a);
  return `${Math.abs(a - rounded) < 0.05 ? rounded : a.toFixed(1)} A`;
}

const kw = (v: number) => `${v.toFixed(1)} kW`;
const frac = (v: number) => v - Math.floor(v);

// Geometry (viewBox 760 × 250). Energy particles run along y = FLOW_Y from the pack to the wheel.
const FLOW_Y = 120;
const X_START = 62;
const X_END = 708;
const SOLID: Array<[number, number]> = [
  [12, 112], // pack
  [136, 192], // fuse and contactors
  [282, 370], // inverter
  [424, 508], // motor
  [560, 620], // reducer
  [672, 744], // wheel
];
const insideBlock = (x: number) => SOLID.some(([a, b]) => x > a - 2 && x < b + 2);
const PARTICLES = 40;

function particleColor(x: number, regen: boolean): string {
  if (regen) return vizColors.green;
  if (x < 282) return vizColors.orange; // DC
  if (x < 424) return vizColors.amber; // three-phase AC
  return vizColors.cyan; // mechanical power on the shaft
}

export function EvDrivetrainFlow() {
  const { playing, toggle, t, reset } = useViz();
  const [pedal, setPedal] = useState(75);
  const [braking, setBraking] = useState(false);
  const [cold, setCold] = useState(false);
  const [bus, setBus] = useState<BusVoltage>("400");
  const busV = bus === "800" ? 800 : 400;
  const r = drivetrainFlow(pedal, braking, cold, busV);
  const regen = r.mode === "regen";
  const refCurrent = (REFERENCE_KW * 1000) / busV;

  // Particle density follows bus power; particles keep a constant speed so changing power never makes them jump.
  const density = Math.min(1, r.busKw / DRIVE_MAX_KW);
  const phase = t * 0.11 * (regen ? -1 : 1);
  const particles: Array<{ k: number; x: number }> = [];
  for (let k = 0; k < PARTICLES; k++) {
    if (frac(k * 0.618034 + 0.11) >= density) continue;
    const x = X_START + frac(k / PARTICLES + phase) * (X_END - X_START);
    if (!insideBlock(x)) particles.push({ k, x });
  }

  const wisps = [
    { id: "pack", cx: 62, top: 76, loss: r.losses.pack },
    { id: "inverter", cx: 326, top: 76, loss: r.losses.inverter },
    { id: "motor", cx: 466, top: 74, loss: r.losses.motor },
    { id: "reducer", cx: 590, top: 90, loss: r.losses.reducer },
  ];
  const spoke = (t * 140) % 360;
  const meterW = Math.min(1, r.currentA / 600) * 82;

  return (
    <VizFrame
      title="Energy flow from pack to wheels"
      description="Press the accelerator and watch power flow through each block, losing a little as heat. Brake to send it back. Switch the bus voltage and compare the current for the same power."
      controls={
        <>
          <Slider
            label={braking ? "Brake pedal" : "Accelerator"}
            value={pedal}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={setPedal}
          />
          <Toggle label="Brake (regen)" checked={braking} onChange={setBraking} />
          <Toggle label="Cold pack (−15 °C)" checked={cold} onChange={setCold} />
          <Segmented<BusVoltage>
            label="Bus voltage"
            options={[
              { value: "400", label: "400 V" },
              { value: "800", label: "800 V" },
            ]}
            value={bus}
            onChange={setBus}
          />
          <PlayPause playing={playing} onToggle={toggle} onReset={reset} />
        </>
      }
      footer={
        <>
          Efficiencies are fixed at a typical operating point (pack 98%, inverter 98%, motor 95%, reducer 97.5%).
          Full accelerator draws {DRIVE_MAX_KW} kW from the bus; full brake pedal asks for {REGEN_MAX_KW} kW of braking at the
          wheels. Cold pack limits: {LIMITS.cold.dischargeKw} kW out, {LIMITS.cold.chargeKw} kW in.
        </>
      }
    >
      <SvgCanvas viewBox="0 0 760 250" title="EV drivetrain energy flow: pack, contactors, HV bus, inverter, motor, reducer and wheel">
        <rect x={0} y={0} width={760} height={250} fill={vizColors.bg} rx={10} />

        {/* mode banner */}
        <Label x={16} y={22} anchor="start" size={13} bold color={regen ? vizColors.green : vizColors.orange}>
          {regen ? "REGEN: energy flows wheels → pack" : "DRIVE: energy flows pack → wheels"}
        </Label>
        {r.limitedBy && (
          <Label x={744} y={22} anchor="end" size={12} color={vizColors.red}>
            {r.limitedBy === "charge"
              ? `BMS charge limit ${(cold ? LIMITS.cold : LIMITS.warm).chargeKw} kW: friction brakes take the rest`
              : `BMS discharge limit ${(cold ? LIMITS.cold : LIMITS.warm).dischargeKw} kW`}
          </Label>
        )}

        {/* DC conductors: pack → contactors → HV bus → inverter (HV+ and HV−) */}
        {[110, 130].map((y) => (
          <g key={y}>
            <line x1={112} y1={y} x2={136} y2={y} stroke={vizColors.orange} strokeWidth={3} />
            <line x1={192} y1={y} x2={282} y2={y} stroke={vizColors.orange} strokeWidth={3} />
          </g>
        ))}
        {/* DC-link capacitor across the bus */}
        <line x1={266} y1={110} x2={266} y2={117} stroke={vizColors.orange} strokeWidth={2} />
        <line x1={259} y1={117} x2={273} y2={117} stroke={vizColors.orange} strokeWidth={2.5} />
        <line x1={259} y1={123} x2={273} y2={123} stroke={vizColors.orange} strokeWidth={2.5} />
        <line x1={266} y1={123} x2={266} y2={130} stroke={vizColors.orange} strokeWidth={2} />
        <Label x={237} y={92} size={11} color={vizColors.orange}>
          {`HV bus ${busV} V`}
        </Label>
        {/* bus current meter */}
        <rect x={196} y={146} width={82} height={8} rx={2} fill={vizColors.grid} />
        <rect x={196} y={146} width={meterW} height={8} rx={2} fill={regen ? vizColors.green : vizColors.orange} />
        <Label x={237} y={166} size={12} mono bold>
          {formatAmps(r.currentA)}
        </Label>

        {/* three-phase AC */}
        {[108, 120, 132].map((y) => (
          <line key={y} x1={370} y1={y} x2={424} y2={y} stroke={vizColors.amber} strokeWidth={2} />
        ))}

        {/* shafts */}
        <line x1={508} y1={FLOW_Y} x2={560} y2={FLOW_Y} stroke={vizColors.muted} strokeWidth={8} />
        <line x1={620} y1={FLOW_Y} x2={672} y2={FLOW_Y} stroke={vizColors.muted} strokeWidth={8} />

        {/* pack */}
        <rect x={12} y={78} width={100} height={84} rx={8} fill="#1a2235" stroke={vizColors.orange} strokeWidth={1.5} />
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x={22 + i * 14} y={98} width={10} height={30} rx={2} fill={vizColors.grid} stroke={vizColors.muted} strokeWidth={0.5} />
        ))}
        <Label x={62} y={88} size={11} bold>
          Pack + BMS
        </Label>
        <Label x={62} y={146} size={10} color={vizColors.muted}>
          {cold ? "cells −15 °C" : "cells 25 °C"}
        </Label>

        {/* fuse and contactors */}
        <rect x={136} y={94} width={56} height={52} rx={6} fill="#1a2235" stroke={vizColors.muted} strokeWidth={1} />
        <Label x={164} y={112} size={10}>
          Fuse +
        </Label>
        <Label x={164} y={126} size={10}>
          contactors
        </Label>

        {/* inverter */}
        <rect x={282} y={78} width={88} height={84} rx={8} fill="#1a2235" stroke={vizColors.violet} strokeWidth={1.5} />
        <Label x={326} y={98} size={11} bold>
          Inverter
        </Label>
        <Label x={326} y={114} size={10} color={vizColors.muted}>
          6 switches
        </Label>
        <Label x={326} y={148} size={10} color={vizColors.muted}>
          η 98%
        </Label>

        {/* motor */}
        <circle cx={466} cy={FLOW_Y} r={42} fill="#1a2235" stroke={vizColors.copper} strokeWidth={2} />
        <Label x={466} y={110} size={11} bold>
          Motor
        </Label>
        <Label x={466} y={132} size={10} color={vizColors.muted}>
          η 95%
        </Label>

        {/* reducer */}
        <rect x={560} y={90} width={60} height={60} rx={6} fill="#1a2235" stroke={vizColors.muted} strokeWidth={1} />
        <circle cx={578} cy={108} r={7} fill="none" stroke={vizColors.muted} strokeWidth={2} />
        <circle cx={600} cy={126} r={15} fill="none" stroke={vizColors.muted} strokeWidth={2} />
        <Label x={590} y={160} size={10} color={vizColors.muted}>
          9:1, η 97.5%
        </Label>

        {/* wheel */}
        <g transform={`translate(708 ${FLOW_Y})`}>
          <circle r={36} fill="#111827" stroke="#374151" strokeWidth={9} />
          <circle r={20} fill="none" stroke={vizColors.muted} strokeWidth={2} />
          <g transform={`rotate(${spoke})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <line
                key={a}
                x1={0}
                y1={0}
                x2={r2(20 * Math.cos((a * Math.PI) / 180))}
                y2={r2(20 * Math.sin((a * Math.PI) / 180))}
                stroke={vizColors.muted}
                strokeWidth={2}
              />
            ))}
          </g>
          {r.frictionKw > 0.05 && (
            <path
              d="M 18 -36 A 40 40 0 0 1 38 -12"
              fill="none"
              stroke={vizColors.red}
              strokeWidth={7}
              strokeLinecap="round"
              opacity={0.35 + 0.65 * Math.min(1, r.frictionKw / 60)}
            />
          )}
        </g>
        {r.frictionKw > 0.05 && (
          <Label x={708} y={68} size={11} color={vizColors.red}>
            {`friction ${kw(r.frictionKw)}`}
          </Label>
        )}

        <Label x={397} y={68} size={11} color={vizColors.amber}>
          3-phase AC
        </Label>

        {/* heat leaving each block, proportional to its loss */}
        {wisps.map((w, i) =>
          [0, 1, 2].map((j) => {
            const u = frac(t * 0.5 + j / 3 + i * 0.17);
            const opacity = Math.min(1, w.loss / 4) * (1 - u) * 0.9;
            if (opacity < 0.02) return null;
            return (
              <circle
                key={`${w.id}${j}`}
                cx={r2(w.cx + Math.sin((u * 2 + j) * Math.PI) * 5)}
                cy={r2(w.top - 4 - u * 24)}
                r={2.6}
                fill={vizColors.red}
                opacity={r2(opacity)}
              />
            );
          }),
        )}

        {/* energy particles */}
        {particles.map((p) => (
          <circle key={p.k} cx={r2(p.x)} cy={FLOW_Y} r={3.6} fill={particleColor(p.x, regen)} />
        ))}

        {/* power at each interface */}
        {[
          { x: 62, v: r.cellsKw, label: "cells" },
          { x: 237, v: r.busKw, label: "HV bus" },
          { x: 397, v: r.acKw, label: "AC" },
          { x: 534, v: r.shaftKw, label: "shaft" },
          { x: 708, v: r.wheelKw, label: "wheel" },
        ].map((s) => (
          <g key={s.label}>
            <Label x={s.x} y={196} size={12} mono>
              {kw(s.v)}
            </Label>
            <Label x={s.x} y={212} size={10} color={vizColors.muted}>
              {s.label}
            </Label>
          </g>
        ))}
        <Label x={380} y={238} size={11} color={vizColors.muted}>
          {regen
            ? "Each block loses a few percent on the way back, so the pack banks less than the motor absorbs."
            : "Heat dots show each block's loss; the motor is the largest."}
        </Label>
      </SvgCanvas>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Bus current now</dt>
          <dd className="font-mono">{formatAmps(r.currentA)}</dd>
        </div>
        <div>
          <dt className="text-muted">{`Current at ${REFERENCE_KW} kW, ${busV} V`}</dt>
          <dd className="font-mono">{formatAmps(refCurrent)}</dd>
        </div>
        <div>
          <dt className="text-muted">Cable loss, 2 m of 70 mm² Cu</dt>
          <dd className="font-mono">{`${Math.round(r.cableLossW)} W`}</dd>
        </div>
        <div>
          <dt className="text-muted">{regen ? "Braking power requested" : "Power at the wheels"}</dt>
          <dd className="font-mono">{kw(regen ? r.requestedKw : r.wheelKw)}</dd>
        </div>
        <div>
          <dt className="text-muted">{regen ? "Banked in the cells" : "Pack-to-wheel efficiency"}</dt>
          <dd className="font-mono">
            {regen ? kw(r.cellsKw) : r.cellsKw > 0 ? `${((r.wheelKw / r.cellsKw) * 100).toFixed(1)}%` : "n/a"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{regen ? "Friction brakes" : "Heat in the chain"}</dt>
          <dd className="font-mono">{kw(regen ? r.frictionKw : r.cellsKw - r.wheelKw)}</dd>
        </div>
      </dl>
    </VizFrame>
  );
}
