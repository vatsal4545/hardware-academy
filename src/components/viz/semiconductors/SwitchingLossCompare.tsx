"use client";

import { useState } from "react";
import { Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, makeScale, polyline, vizColors } from "@/components/viz/shared";

/*
 * Teaching model: one hard-switched 400 V half-bridge leg at 50% duty (a synchronous buck delivering
 * 200 V × I). Each device carries the load current I while on, so total conduction loss is I²·Rds(on)
 * for SiC and Vce(sat)·I for the IGBT, and one turn-on plus one turn-off happen every period.
 * Values are representative of 650-750 V automotive parts, not of a specific datasheet.
 */
const VDC = 400;
const LOOP_NH = 8; // commutation-loop inductance used for the overshoot, nH

type DeviceId = "igbt" | "sic";

interface TurnOff {
  /** voltage rise time, ns */
  trv: number;
  /** current fall time, ns */
  tfi: number;
  /** tail current at the end of the fall, A (IGBT only) */
  iTail: number;
  /** tail decay constant, ns */
  tau: number;
}

function turnOff(device: DeviceId, iA: number, tC: number): TurnOff {
  const dT = tC - 25;
  if (device === "igbt") {
    return { trv: 70, tfi: 50, iTail: 0.15 * iA * (1 + 0.002 * dT), tau: 100 * (1 + 0.006 * dT) };
  }
  return { trv: 10, tfi: 10, iTail: 0, tau: 0 };
}

/** Turn-off energy from the waveform model: ½·V·I·(trv + tfi) plus the tail, V·I_tail·τ. In joules. */
function eOff(device: DeviceId, iA: number, tC: number): number {
  const w = turnOff(device, iA, tC);
  return 0.5 * VDC * iA * (w.trv + w.tfi) * 1e-9 + VDC * w.iTail * w.tau * 1e-9;
}

/** Turn-on energy (includes the Si diode's reverse recovery for the IGBT leg). In joules. */
function eOn(device: DeviceId, iA: number, tC: number): number {
  const dT = tC - 25;
  return device === "igbt" ? 2.0e-3 * (iA / 100) * (1 + 0.003 * dT) : 0.6e-3 * (iA / 100);
}

/** SiC on-resistance: 10 mΩ at 25 °C, +0.32 %/°C, so 1.4× (14 mΩ) at 150 °C. */
function sicRdsOn(tC: number): number {
  return 0.01 * (1 + 0.0032 * (tC - 25));
}

/** IGBT on-voltage: a 0.7 V knee that falls slightly with temperature plus an 8 mΩ slope that rises. */
function igbtVce(iA: number, tC: number): number {
  const dT = tC - 25;
  return 0.7 * (1 - 0.001 * dT) + 0.008 * (1 + 0.004 * dT) * iA;
}

interface Losses {
  cond: number;
  sw: number;
  esw: number;
  total: number;
  efficiency: number;
}

function losses(device: DeviceId, iA: number, fHz: number, tC: number): Losses {
  const cond = device === "igbt" ? igbtVce(iA, tC) * iA : iA * iA * sicRdsOn(tC);
  const esw = eOn(device, iA, tC) + eOff(device, iA, tC);
  const sw = esw * fHz;
  const total = cond + sw;
  const pOut = (VDC / 2) * iA;
  return { cond, sw, esw, total, efficiency: pOut / (pOut + total) };
}

/** Normalised turn-off waveform: v/VDC, i/I and p/(VDC·I), sampled over `windowNs`. */
function waveform(device: DeviceId, iA: number, tC: number, windowNs: number) {
  const w = turnOff(device, iA, tC);
  const t0 = 0.1 * windowNs;
  const t1 = t0 + w.trv;
  const t2 = t1 + w.tfi;
  const overshoot = (LOOP_NH * (iA - w.iTail)) / w.tfi; // V = L·di/dt
  const n = 320;
  const pts: Array<{ t: number; v: number; i: number }> = [];
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * windowNs;
    let v: number;
    let i: number;
    if (t < t0) {
      v = 0.004;
      i = 1;
    } else if (t < t1) {
      v = (t - t0) / w.trv;
      i = 1;
    } else if (t < t2) {
      // L·di/dt overshoot while the current falls: the IGBT's settles by the end of the fall,
      // the SiC's peaks there and then rings.
      const f = (t - t1) / w.tfi;
      v = 1 + (overshoot / VDC) * (device === "igbt" ? Math.sin(Math.PI * f) : Math.sin((Math.PI / 2) * f));
      i = 1 - ((iA - w.iTail) / iA) * f;
    } else if (device === "igbt") {
      v = 1;
      i = (w.iTail / iA) * Math.exp(-(t - t2) / w.tau);
    } else {
      // SiC: the output capacitance rings with the loop inductance (about 60 MHz) and decays.
      const decay = Math.exp(-(t - t2) / 25);
      v = 1 + (overshoot / VDC) * decay * Math.cos(2 * Math.PI * 0.06 * (t - t2));
      i = 0.04 * decay * Math.sin(2 * Math.PI * 0.06 * (t - t2));
    }
    pts.push({ t, v, i: Math.max(i, -0.1) });
  }
  return { pts, dvdt: VDC / w.trv };
}

function fmtW(x: number): string {
  const v = Math.round(x * 10) / 10;
  return v < 10 ? `${v.toFixed(1)} W` : `${Math.round(v)} W`;
}

function niceCeil(x: number): number {
  const steps = [50, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000];
  return steps.find((s) => s >= x) ?? Math.ceil(x / 1000) * 1000;
}

const DEVICES: Array<{ id: DeviceId; name: string; color: string }> = [
  { id: "igbt", name: "Si IGBT", color: vizColors.orange },
  { id: "sic", name: "SiC MOSFET", color: vizColors.violet },
];

type AxisMode = "same" | "zoom";

function WaveformPanel({
  device,
  name,
  iA,
  tC,
  windowNs,
  top,
  eOffJ,
}: {
  device: DeviceId;
  name: string;
  iA: number;
  tC: number;
  windowNs: number;
  top: number;
  eOffJ: number;
}) {
  const x0 = 64;
  const x1 = 612;
  const plotTop = top + 22;
  const plotBot = top + 108;
  const sx = makeScale([0, windowNs], [x0, x1]);
  const sy = makeScale([0, 1.3], [plotBot, plotTop]);
  const { pts, dvdt } = waveform(device, iA, tC, windowNs);
  const vPath = polyline(pts.map((p) => [sx(p.t), sy(p.v)]));
  const iPath = polyline(pts.map((p) => [sx(p.t), sy(p.i)]));
  const pArea =
    polyline([[sx(0), sy(0)], ...pts.map((p): [number, number] => [sx(p.t), sy(Math.max(0, p.v * p.i))]), [sx(windowNs), sy(0)]]) +
    " Z";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * windowNs);
  return (
    <g>
      <Label x={x0} y={top + 8} anchor="start" size={12} bold color={vizColors.text}>
        {name}: turn-off at {VDC} V, {iA} A
      </Label>
      <Label x={x1} y={top + 8} anchor="end" size={11} color={vizColors.muted}>
        dv/dt ≈ {dvdt.toFixed(dvdt < 10 ? 1 : 0)} V/ns · E
        <tspan dy={3} fontSize={8}>
          off
        </tspan>
        <tspan dy={-3}> ≈ {(eOffJ * 1e3).toFixed(2)} mJ</tspan>
      </Label>
      <rect x={x0} y={plotTop} width={x1 - x0} height={plotBot - plotTop} fill="none" stroke={vizColors.grid} />
      <line x1={x0} y1={sy(1)} x2={x1} y2={sy(1)} stroke={vizColors.grid} strokeDasharray="4 4" />
      <path d={pArea} fill={vizColors.red} opacity={0.28} />
      <path d={iPath} fill="none" stroke={vizColors.cyan} strokeWidth={2} />
      <path d={vPath} fill="none" stroke={vizColors.amber} strokeWidth={2} />
      <Label x={x0 - 6} y={sy(1)} anchor="end" size={10} color={vizColors.muted}>
        100%
      </Label>
      <Label x={x0 - 6} y={sy(0)} anchor="end" size={10} color={vizColors.muted}>
        0
      </Label>
      {ticks.map((t) => (
        <Label key={t} x={sx(t)} y={plotBot + 10} size={10} color={vizColors.muted}>
          {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 2)} µs` : `${Math.round(t)} ns`}
        </Label>
      ))}
    </g>
  );
}

function LossCharts({ iA, fKHz, tC }: { iA: number; fKHz: number; tC: number }) {
  const freqs = Array.from({ length: 49 }, (_, k) => 2 + k);
  const worst = Math.max(losses("igbt", iA, 50e3, tC).total, losses("sic", iA, 50e3, tC).total);
  const yMax = niceCeil(worst * 1.05);

  // Bars (left)
  const barBase = 200;
  const barTop = 34;
  const by = makeScale([0, yMax], [barBase, barTop]);
  // Lines (right)
  const lx = makeScale([2, 50], [372, 612]);
  const ly = makeScale([0, yMax], [barBase, barTop]);
  const yTicks = [0, yMax / 2, yMax];

  return (
    <SvgCanvas
      viewBox="0 0 640 240"
      title={`Loss comparison at ${fKHz} kHz, ${tC} °C and ${iA} A: stacked conduction and switching bars, and total loss versus frequency`}
    >
      <rect x={0} y={0} width={640} height={240} fill={vizColors.bg} />
      <Label x={20} y={14} anchor="start" size={12} bold color={vizColors.text}>
        Losses at {fKHz} kHz
      </Label>
      {yTicks.map((v) => (
        <g key={`bt-${v}`}>
          <line x1={58} y1={by(v)} x2={290} y2={by(v)} stroke={vizColors.grid} />
          <Label x={52} y={by(v)} anchor="end" size={10} color={vizColors.muted}>
            {Math.round(v)} W
          </Label>
        </g>
      ))}
      {DEVICES.map((d, k) => {
        const l = losses(d.id, iA, fKHz * 1e3, tC);
        const x = 90 + k * 110;
        const yCond = by(l.cond);
        const ySw = by(l.cond + l.sw);
        return (
          <g key={d.id}>
            <rect x={x} y={yCond} width={60} height={barBase - yCond} fill={vizColors.blue} />
            <rect x={x} y={ySw} width={60} height={yCond - ySw} fill={vizColors.red} />
            <Label x={x + 30} y={ySw - 9} size={11} bold color={vizColors.text}>
              {fmtW(l.total)}
            </Label>
            <Label x={x + 30} y={barBase + 12} size={11} color={d.color}>
              {d.name}
            </Label>
          </g>
        );
      })}
      <g transform="translate(60 226)">
        <rect x={0} y={-5} width={10} height={10} fill={vizColors.blue} />
        <Label x={14} y={0} anchor="start" size={10} color={vizColors.muted}>
          conduction
        </Label>
        <rect x={90} y={-5} width={10} height={10} fill={vizColors.red} />
        <Label x={104} y={0} anchor="start" size={10} color={vizColors.muted}>
          switching
        </Label>
      </g>

      <Label x={340} y={14} anchor="start" size={12} bold color={vizColors.text}>
        Total loss vs switching frequency
      </Label>
      {yTicks.map((v) => (
        <g key={`lt-${v}`}>
          <line x1={372} y1={ly(v)} x2={612} y2={ly(v)} stroke={vizColors.grid} />
          <Label x={366} y={ly(v)} anchor="end" size={10} color={vizColors.muted}>
            {Math.round(v)} W
          </Label>
        </g>
      ))}
      {[2, 10, 20, 30, 40, 50].map((f) => (
        <Label key={f} x={lx(f)} y={barBase + 12} size={10} color={vizColors.muted}>
          {f}
        </Label>
      ))}
      <Label x={612} y={barBase + 26} anchor="end" size={10} color={vizColors.muted}>
        kHz
      </Label>
      <line x1={lx(fKHz)} y1={barTop} x2={lx(fKHz)} y2={barBase} stroke={vizColors.muted} strokeDasharray="3 4" />
      {DEVICES.map((d) => (
        <g key={`line-${d.id}`}>
          <path
            d={polyline(freqs.map((f): [number, number] => [lx(f), ly(losses(d.id, iA, f * 1e3, tC).total)]))}
            fill="none"
            stroke={d.color}
            strokeWidth={2.5}
          />
          <circle cx={lx(fKHz)} cy={ly(losses(d.id, iA, fKHz * 1e3, tC).total)} r={4} fill={d.color} />
        </g>
      ))}
      <g transform="translate(380 226)">
        <rect x={0} y={-5} width={10} height={10} fill={vizColors.orange} />
        <Label x={14} y={0} anchor="start" size={10} color={vizColors.muted}>
          Si IGBT
        </Label>
        <rect x={80} y={-5} width={10} height={10} fill={vizColors.violet} />
        <Label x={94} y={0} anchor="start" size={10} color={vizColors.muted}>
          SiC MOSFET
        </Label>
      </g>
    </SvgCanvas>
  );
}

/** Si IGBT vs SiC MOSFET: turn-off waveforms with the V·I overlap, loss bars and efficiency. */
export function SwitchingLossCompare() {
  const [fKHz, setFKHz] = useState(10);
  const [tC, setTC] = useState(25);
  const [iA, setIA] = useState(100);
  const [axis, setAxis] = useState<AxisMode>("same");

  const igbt = losses("igbt", iA, fKHz * 1e3, tC);
  const sic = losses("sic", iA, fKHz * 1e3, tC);
  const sicWindow = axis === "same" ? 1000 : 100;

  return (
    <VizFrame
      title="Switching losses: Si IGBT vs SiC MOSFET"
      description="Amber is voltage, cyan is current, red is their product v·i, whose area is the energy lost in each switching event."
      controls={
        <>
          <Slider label="Switching frequency" value={fKHz} min={2} max={50} step={1} unit="kHz" onChange={setFKHz} />
          <Slider label="Junction temperature" value={tC} min={25} max={175} step={5} unit="°C" onChange={setTC} />
          <Slider label="Load current" value={iA} min={20} max={200} step={10} unit="A" onChange={setIA} />
          <Segmented
            label="Time axis"
            options={[
              { value: "same", label: "Same scale (1 µs)" },
              { value: "zoom", label: "Zoom SiC (100 ns)" },
            ]}
            value={axis}
            onChange={setAxis}
          />
        </>
      }
      footer="Model: one 400 V half-bridge leg at 50% duty delivering 200 V × I. Each device carries I while on; the IGBT leg's diode drop is taken equal to its Vce(sat). Representative values for 650-750 V automotive parts, not a specific datasheet."
    >
      <div className="space-y-4">
        <SvgCanvas
          viewBox="0 0 640 282"
          title={`Turn-off waveforms at ${tC} °C and ${iA} A: the IGBT has a slow voltage rise and a current tail, the SiC MOSFET switches in about 20 ns`}
        >
          <rect x={0} y={0} width={640} height={282} fill={vizColors.bg} />
          <g transform="translate(64 272)">
            <line x1={0} y1={0} x2={18} y2={0} stroke={vizColors.amber} strokeWidth={2.5} />
            <Label x={24} y={0} anchor="start" size={10} color={vizColors.muted}>
              voltage (100% = {VDC} V)
            </Label>
            <line x1={170} y1={0} x2={188} y2={0} stroke={vizColors.cyan} strokeWidth={2.5} />
            <Label x={194} y={0} anchor="start" size={10} color={vizColors.muted}>
              current (100% = {iA} A)
            </Label>
            <rect x={340} y={-5} width={18} height={10} fill={vizColors.red} opacity={0.4} />
            <Label x={364} y={0} anchor="start" size={10} color={vizColors.muted}>
              v·i: its area is the energy lost
            </Label>
          </g>
          <WaveformPanel
            device="igbt"
            name="Si IGBT"
            iA={iA}
            tC={tC}
            windowNs={1000}
            top={6}
            eOffJ={eOff("igbt", iA, tC)}
          />
          <WaveformPanel
            device="sic"
            name="SiC MOSFET"
            iA={iA}
            tC={tC}
            windowNs={sicWindow}
            top={134}
            eOffJ={eOff("sic", iA, tC)}
          />
        </SvgCanvas>
        <LossCharts iA={iA} fKHz={fKHz} tC={tC} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 pr-3 font-normal">At {fKHz} kHz, {tC} °C, {iA} A</th>
                <th className="py-1 pr-3 font-semibold text-orange-300">Si IGBT</th>
                <th className="py-1 font-semibold text-violet-300">SiC MOSFET</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr className="border-t border-border">
                <td className="py-1 pr-3 font-sans text-muted">On-state</td>
                <td className="py-1 pr-3" data-testid="igbt-vce">
                  Vce(sat) {igbtVce(iA, tC).toFixed(2)} V
                </td>
                <td className="py-1" data-testid="sic-rds">
                  Rds(on) {(sicRdsOn(tC) * 1000).toFixed(1)} mΩ
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1 pr-3 font-sans text-muted">Eon + Eoff per cycle</td>
                <td className="py-1 pr-3">{(igbt.esw * 1e3).toFixed(2)} mJ</td>
                <td className="py-1">{(sic.esw * 1e3).toFixed(2)} mJ</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1 pr-3 font-sans text-muted">Conduction loss</td>
                <td className="py-1 pr-3" data-testid="igbt-cond">
                  {fmtW(igbt.cond)}
                </td>
                <td className="py-1" data-testid="sic-cond">
                  {fmtW(sic.cond)}
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1 pr-3 font-sans text-muted">Switching loss</td>
                <td className="py-1 pr-3" data-testid="igbt-sw">
                  {fmtW(igbt.sw)}
                </td>
                <td className="py-1" data-testid="sic-sw">
                  {fmtW(sic.sw)}
                </td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-1 pr-3 font-sans text-muted">Efficiency (of {((VDC / 2) * iA) / 1000} kW)</td>
                <td className="py-1 pr-3" data-testid="igbt-eff">
                  {(igbt.efficiency * 100).toFixed(2)}%
                </td>
                <td className="py-1" data-testid="sic-eff">
                  {(sic.efficiency * 100).toFixed(2)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </VizFrame>
  );
}
