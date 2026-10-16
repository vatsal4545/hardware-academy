"use client";

import { useMemo, useState } from "react";
import { Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, makeScale, polyline, vizColors } from "@/components/viz/shared";
import {
  MOTORS,
  operatingPoint,
  peakPowerKw,
  regionLabels,
  roadSpeedMph,
  type MotorId,
} from "@/components/viz/ev/TorqueSpeedCurve.model";

const X0 = 70;
const X1 = 650;
const YT = 40;
const YB = 290;
const MAX_RPM = 20000;
const xOf = makeScale([0, MAX_RPM], [X0, X1]);
const yTorque = makeScale([0, 500], [YB, YT]);
const yPower = makeScale([0, 300], [YB, YT]);

const TORQUE = vizColors.orange;
const POWER = vizColors.cyan;

const motorOptions: { value: MotorId; label: string }[] = [
  { value: "induction", label: "Induction" },
  { value: "ipm", label: "IPM-SynRM" },
  { value: "sleeved", label: "Carbon-sleeved PM" },
];

function curves(id: MotorId): { torque: string; power: string } {
  const m = MOTORS[id];
  const t: Array<[number, number]> = [];
  const p: Array<[number, number]> = [];
  for (let rpm = 0; rpm <= m.maxRpm; rpm += 100) {
    const o = operatingPoint(m, rpm);
    t.push([xOf(rpm), yTorque(o.torqueNm)]);
    p.push([xOf(rpm), yPower(o.powerKw)]);
  }
  t.push([xOf(m.maxRpm), yTorque(0)]);
  p.push([xOf(m.maxRpm), yPower(0)]);
  return { torque: polyline(t), power: polyline(p) };
}

export function TorqueSpeedCurve() {
  const [motorId, setMotorId] = useState<MotorId>("ipm");
  const [rpm, setRpm] = useState(9000);
  const [overlay, setOverlay] = useState(true);
  const m = MOTORS[motorId];
  const op = operatingPoint(m, rpm);
  const peak = peakPowerKw(m);
  const all = useMemo(() => ({ induction: curves("induction"), ipm: curves("ipm"), sleeved: curves("sleeved") }), []);
  const bands = [
    { from: 0, to: m.baseRpm, fill: vizColors.amber, text: "constant torque" },
    { from: m.baseRpm, to: m.cornerRpm, fill: vizColors.green, text: "constant power" },
    { from: m.cornerRpm, to: m.maxRpm, fill: vizColors.violet, text: "falling power" },
  ];
  const x = xOf(Math.min(rpm, MAX_RPM));

  const stats: Array<{ label: string; value: string }> = [
    { label: "Motor speed", value: `${rpm.toLocaleString("en-US")} rpm` },
    { label: "Road speed*", value: `${Math.round(roadSpeedMph(rpm))} mph` },
    { label: "Torque", value: `${Math.round(op.torqueNm)} N·m` },
    { label: "Power", value: `${Math.round(op.powerKw)} kW` },
    { label: "Peak power", value: `${Math.round(peak)} kW` },
    { label: "Max speed", value: `${m.maxRpm.toLocaleString("en-US")} rpm` },
  ];

  return (
    <VizFrame
      title="Torque-speed envelope"
      description="Below base speed the inverter's current limit caps torque. Above it the back-EMF reaches the battery voltage, so the controller weakens the field and power stays roughly flat (P = T × ω) until that runs out."
      controls={
        <>
          <Segmented label="Motor" options={motorOptions} value={motorId} onChange={setMotorId} />
          <Slider
            label="Motor speed"
            value={rpm}
            min={0}
            max={MAX_RPM}
            step={100}
            onChange={setRpm}
            format={(v) => `${v.toLocaleString("en-US")} rpm`}
          />
          <Toggle label="Overlay the other motors' power curves" checked={overlay} onChange={setOverlay} />
        </>
      }
      footer={
        <span>
          Illustrative envelopes with round numbers: the shapes follow each machine type, but none is measured data for a production motor. *Road
          speed assumes a 9:1 single-speed reduction and a 0.35 m tire radius.
        </span>
      }
    >
      <SvgCanvas viewBox="0 0 720 330" title={`Torque and power against speed for the ${m.label} motor, operating point at ${rpm} rpm`}>
        <rect x={0} y={0} width={720} height={330} rx={8} fill={vizColors.bg} />
        {bands.map((b) => (
          <g key={b.text}>
            <rect x={xOf(b.from)} y={YT} width={xOf(b.to) - xOf(b.from)} height={YB - YT} fill={b.fill} opacity={0.07} />
            <Label x={(xOf(b.from) + xOf(b.to)) / 2} y={YT - 12} size={10} color={b.fill}>
              {b.text}
            </Label>
          </g>
        ))}
        <rect x={X0} y={YT} width={X1 - X0} height={YB - YT} fill="none" stroke={vizColors.grid} />
        {[0, 100, 200, 300, 400, 500].map((t) => (
          <g key={`t${t}`}>
            <line x1={X0} x2={X1} y1={yTorque(t)} y2={yTorque(t)} stroke={vizColors.grid} strokeDasharray="2 4" />
            <Label x={X0 - 8} y={yTorque(t)} anchor="end" size={10} mono color={TORQUE}>
              {t}
            </Label>
          </g>
        ))}
        {[0, 100, 200, 300].map((p) => (
          <Label key={`p${p}`} x={X1 + 8} y={yPower(p)} anchor="start" size={10} mono color={POWER}>
            {p}
          </Label>
        ))}
        {[0, 5000, 10000, 15000, 20000].map((r) => (
          <Label key={`r${r}`} x={xOf(r)} y={YB + 14} size={10} mono color={vizColors.muted}>
            {r === 0 ? "0" : `${r / 1000}k`}
          </Label>
        ))}
        <Label x={(X0 + X1) / 2} y={YB + 32} size={11} color={vizColors.muted}>
          motor speed, rpm
        </Label>
        <Label x={22} y={(YT + YB) / 2} size={11} color={TORQUE} rotate={-90}>
          torque, N·m
        </Label>
        <Label x={698} y={(YT + YB) / 2} size={11} color={POWER} rotate={90}>
          power, kW
        </Label>
        {overlay &&
          motorOptions
            .filter((o) => o.value !== motorId)
            .map((o) => (
              <path key={o.value} d={all[o.value].power} fill="none" stroke={vizColors.muted} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.7} />
            ))}
        <path d={all[motorId].torque} fill="none" stroke={TORQUE} strokeWidth={3} strokeLinejoin="round" />
        <path d={all[motorId].power} fill="none" stroke={POWER} strokeWidth={3} strokeLinejoin="round" />
        <Label x={xOf(m.baseRpm) + 6} y={yPower(peak) - 12} anchor="start" size={11} color={POWER}>
          {`peak ${Math.round(peak)} kW`}
        </Label>
        <line x1={x} x2={x} y1={YT} y2={YB} stroke={vizColors.text} strokeDasharray="4 4" opacity={0.6} />
        {op.region !== "beyond-max" && (
          <>
            <circle cx={x} cy={yTorque(op.torqueNm)} r={6} fill={TORQUE} stroke={vizColors.bg} strokeWidth={2} />
            <circle cx={x} cy={yPower(op.powerKw)} r={6} fill={POWER} stroke={vizColors.bg} strokeWidth={2} />
          </>
        )}
        <Label x={X0 + 10} y={YB - 14} anchor="start" size={12} bold>
          {regionLabels[op.region]}
        </Label>
      </SvgCanvas>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-bg px-3 py-2">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="font-mono text-sm text-text">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-muted">
        <span className="font-semibold text-text">{m.label}: </span>
        {m.note}
      </p>
    </VizFrame>
  );
}
