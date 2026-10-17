"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, makeScale, polyline, useViz, vizColors } from "@/components/viz/shared";
import { ControlBar, dotCount, dotSpeed, dotSpeedCap, FlowDots, formatSI, makePath, Stat, useFlowPhases } from "./OhmsLawCircuit.helpers";
import {
  BatterySymbol,
  CapacitorSymbol,
  GroundSymbol,
  InductorSymbol,
  JunctionDot,
  ResistorSymbol,
  SwitchSymbol,
} from "./SchematicExplorer.symbols";

type Inductance = "10" | "22" | "47";
type Frequency = "250" | "500" | "1000" | "2000";

const WIRE = "#7b8494";
const COUT = 22e-6; // output capacitor, farads
const THETA_JA = 60; // SOT-223 on a modest copper pad, °C/W
const ANIM_PERIOD = 2.4; // seconds of playback per switching period (slow motion)
const M = 90; // samples per switching period in the waveform plots

/** DCR grows with inductance for a given case size. */
const DCR: Record<Inductance, number> = { "10": 0.04, "22": 0.08, "47": 0.16 };

export interface BuckInputs {
  vin: number;
  duty: number; // 0..1
  loadA: number;
  lUh: number;
  fKhz: number;
}

export interface BuckModel {
  vout: number;
  rippleA: number;
  iMin: number;
  iMax: number;
  rippleV: number;
  loss: { conduction: number; switching: number; gate: number; quiescent: number; dead: number; total: number };
  efficiency: number;
}

/**
 * Ideal continuous-conduction buck with a first-order loss model for a small integrated converter:
 * 180 mΩ high-side and 120 mΩ low-side switch, inductor DCR by value, 60 ns of edge overlap,
 * 40 nJ of gate charge per cycle and 1.5 mA of quiescent current.
 */
export function buckModel({ vin, duty, loadA, lUh, fKhz }: BuckInputs): BuckModel {
  const f = fKhz * 1e3;
  const L = lUh * 1e-6;
  const vout = vin * duty;
  const rippleA = ((vin - vout) * duty) / (L * f);
  const iMin = loadA - rippleA / 2;
  const iMax = loadA + rippleA / 2;
  const rippleV = rippleA / (8 * f * COUT);
  const dcr = DCR[String(lUh) as Inductance] ?? 0.08;
  const rTotal = duty * 0.18 + (1 - duty) * 0.12 + dcr;
  const conduction = (loadA * loadA + (rippleA * rippleA) / 12) * rTotal;
  const switching = 0.5 * vin * Math.abs(loadA) * 60e-9 * f;
  const gate = 40e-9 * f;
  const quiescent = 1.5e-3 * vin;
  const dead = 0.7 * Math.abs(loadA) * 40e-9 * f;
  const total = conduction + switching + gate + quiescent + dead;
  const pout = vout * loadA;
  return { vout, rippleA, iMin, iMax, rippleV, loss: { conduction, switching, gate, quiescent, dead, total }, efficiency: pout / (pout + total) };
}

export interface LdoModel {
  loss: number;
  efficiency: number;
  junctionRise: number;
  dropsOut: boolean;
}

/** A linear regulator from the same input: everything above Vout is burned as heat. */
export function ldoModel(vin: number, vout: number, loadA: number): LdoModel {
  const drop = Math.max(vin - vout, 0);
  const loss = drop * loadA;
  return { loss, efficiency: vin > 0 ? vout / vin : 0, junctionRise: loss * THETA_JA, dropsOut: vin - vout < 1.2 };
}

/** Inductor current at switching phase phi (0..1), with the high-side switch on for 0..D. */
function inductorCurrent(phi: number, d: number, iMin: number, iMax: number): number {
  return phi < d ? iMin + (iMax - iMin) * (phi / d) : iMax - (iMax - iMin) * ((phi - d) / (1 - d));
}

const P_ON = makePath(
  [
    [40, 60],
    [190, 60],
    [340, 60],
    [420, 60],
    [420, 230],
    [40, 230],
  ],
  true,
);
const P_OFF = makePath(
  [
    [190, 230],
    [190, 60],
    [340, 60],
    [420, 60],
    [420, 230],
  ],
  true,
);
const nearSource = (x: number, y: number) => x < 55 && y > 118 && y < 162;

/*
 * Dot speed on screen is proportional to the inductor current (1 A moves a dot 800 px per second), whichever of the two
 * loops is carrying it, so the speed does not jump when the switches change state; both loops use the same dot spacing.
 */
export const BUCK_REF_A = 1;
export const BUCK_PX_PER_S_AT_REF = 800;
export const BUCK_DOT_SPACING_PX = 61;
const P_ON_DOTS = dotCount(P_ON.length, BUCK_DOT_SPACING_PX);
const P_OFF_DOTS = dotCount(P_OFF.length, BUCK_DOT_SPACING_PX);
// the cap keeps one 60 Hz frame under half a dot spacing on both loops, so the dots never appear to run backwards
export const BUCK_SPEED_CAP = dotSpeedCap(Math.min(P_ON.length / P_ON_DOTS, P_OFF.length / P_OFF_DOTS));
// geometry of the drawing itself, exported so the tests check the real loops rather than copies of their numbers
export const BUCK_LOOP_LENGTHS = { on: P_ON.length, off: P_OFF.length } as const;
export const BUCK_DOTS = { on: P_ON_DOTS, off: P_OFF_DOTS } as const;

function SchematicPanel({
  vin,
  vout,
  loadA,
  lUh,
  on,
  iNow,
  flow,
}: {
  vin: number;
  vout: number;
  loadA: number;
  lUh: number;
  on: boolean;
  iNow: number;
  flow: number;
}) {
  const active = on ? P_ON : P_OFF;
  return (
    <>
      <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 40 134 V 60 H 90" />
        <path d="M 140 60 H 227" />
        <path d="M 283 60 H 420 V 115" />
        <path d="M 420 175 V 230 H 40 V 146" />
        <path d="M 190 60 V 110" />
        <path d="M 190 170 V 230" />
        <path d="M 340 60 V 131" />
        <path d="M 340 139 V 230" />
      </g>
      {/* the path carrying the inductor current right now */}
      <path
        d={on ? "M 40 60 H 420 V 230 H 40 V 60" : "M 190 230 V 60 H 420 V 230 Z"}
        fill="none"
        stroke={vizColors.cyan}
        strokeWidth={7}
        strokeOpacity={0.12}
        strokeLinejoin="round"
      />
      <BatterySymbol cx={40} cy={140} />
      <GroundSymbol x={40} y={230} />
      <SwitchSymbol x1={90} y1={60} x2={140} y2={60} closed={on} stroke={on ? vizColors.green : vizColors.muted} />
      <SwitchSymbol x1={190} y1={110} x2={190} y2={170} closed={!on} stroke={!on ? vizColors.green : vizColors.muted} />
      <InductorSymbol cx={255} cy={60} bumps={4} r={7} stroke={vizColors.violet} />
      <CapacitorSymbol cx={340} cy={135} vertical size={26} gap={8} />
      <ResistorSymbol cx={420} cy={145} length={60} width={26} vertical />
      <JunctionDot x={190} y={60} />
      <JunctionDot x={340} y={60} />
      <JunctionDot x={340} y={230} />
      <JunctionDot x={190} y={230} />
      <FlowDots path={active} phase={flow} count={on ? P_ON_DOTS : P_OFF_DOTS} hide={nearSource} />

      <Label x={115} y={22} size={11} bold color={on ? vizColors.green : vizColors.muted}>{`S1 high side ${on ? "ON" : "off"}`}</Label>
      <Label x={230} y={140} anchor="start" size={11} bold color={!on ? vizColors.green : vizColors.muted}>{`S2 low side ${!on ? "ON" : "off"}`}</Label>
      <Label x={190} y={44} size={10} mono color={vizColors.muted}>SW</Label>
      <Label x={255} y={36} size={11} bold color={vizColors.violet}>{`L ${lUh} µH`}</Label>
      <Label x={255} y={84} size={11} mono color={vizColors.violet}>{`iL ${iNow.toFixed(2)} A`}</Label>
      <Label x={378} y={36} bold mono color={vizColors.cyan}>{`Vout ${vout.toFixed(2)} V`}</Label>
      <Label x={352} y={125} anchor="start" size={11}>Cout</Label>
      <Label x={352} y={142} anchor="start" size={11} mono>22 µF</Label>
      <Label x={438} y={140} anchor="start" size={11} mono>{`${loadA.toFixed(2)} A`}</Label>
      <Label x={438} y={156} anchor="start" size={11} mono color={vizColors.muted}>load</Label>
      <Label x={84} y={140} anchor="start" bold mono>{`Vin ${vin.toFixed(1)} V`}</Label>
      <Label x={240} y={266} size={12} color={vizColors.muted}>
        {on ? "On: Vin pushes current through S1 and L, so iL ramps up" : "Off: S2 keeps iL flowing through L, so iL ramps down"}
      </Label>
    </>
  );
}

function WaveformPanel({ model, duty, vin, loadA, fKhz, cursor }: { model: BuckModel; duty: number; vin: number; loadA: number; fKhz: number; cursor: number }) {
  const L = 52;
  const R = 456;
  const x = makeScale([0, 3], [L, R]);

  // one period of the three waveforms
  const phi = Array.from({ length: M + 1 }, (_, i) => i / M);
  const il = phi.map((p) => inductorCurrent(p, duty, model.iMin, model.iMax));
  const T = 1 / (fKhz * 1e3);
  const ripple: number[] = [0];
  for (let i = 1; i <= M; i++) {
    ripple.push(ripple[i - 1] + ((0.5 * (il[i - 1] + il[i] - 2 * loadA)) * (T / M)) / COUT);
  }
  const mean = ripple.slice(0, M).reduce((a, b) => a + b, 0) / M;
  const rip = ripple.map((v) => v - mean);

  const swPts: Array<[number, number]> = [];
  const ySw = makeScale([0, vin], [82, 24]);
  for (let k = 0; k < 3; k++) {
    swPts.push([x(k), ySw(vin)], [x(k + duty), ySw(vin)], [x(k + duty), ySw(0)], [x(k + 1), ySw(0)], [x(k + 1), ySw(vin)]);
  }

  const lo = Math.min(0, model.iMin);
  const hi = model.iMax;
  const span = Math.max(hi - lo, 0.2);
  const yIl = makeScale([lo - 0.12 * span, hi + 0.12 * span], [188, 118]);
  const ilPts: Array<[number, number]> = [];
  for (let k = 0; k < 3; k++) for (let i = 0; i <= M; i++) ilPts.push([x(k + phi[i]), yIl(il[i])]);

  const amp = Math.max(...rip.map(Math.abs), 1e-5);
  const yRip = makeScale([-1.4 * amp, 1.4 * amp], [292, 222]);
  const ripPts: Array<[number, number]> = [];
  for (let k = 0; k < 3; k++) for (let i = 0; i <= M; i++) ripPts.push([x(k + phi[i]), yRip(rip[i])]);

  // marker at the cursor
  const c3 = cursor * 3;
  const k = Math.min(2, Math.floor(c3));
  const ci = Math.min(M, Math.round((c3 - k) * M));
  const cx = x(c3);
  const swNow = phi[ci] < duty ? vin : 0;

  const frame = (top: number, bottom: number) => (
    <>
      <line x1={L} y1={bottom} x2={R} y2={bottom} stroke={vizColors.muted} strokeWidth={1.2} />
      <line x1={L} y1={top} x2={L} y2={bottom} stroke={vizColors.muted} strokeWidth={1.2} />
      {[1, 2].map((p) => (
        <line key={p} x1={x(p)} y1={top} x2={x(p)} y2={bottom} stroke={vizColors.grid} strokeWidth={1} strokeDasharray="3 4" />
      ))}
    </>
  );

  return (
    <>
      <Label x={L} y={12} anchor="start" size={12} bold color={vizColors.muted}>Switch node SW (V)</Label>
      {frame(24, 82)}
      <path d={polyline(swPts)} fill="none" stroke={vizColors.green} strokeWidth={2.2} />
      <Label x={L - 5} y={24} anchor="end" size={10} mono color={vizColors.muted}>{`${vin.toFixed(0)}`}</Label>
      <Label x={L - 5} y={82} anchor="end" size={10} mono color={vizColors.muted}>0</Label>
      <circle cx={cx} cy={ySw(swNow)} r={4} fill={vizColors.text} />

      <Label x={L} y={106} anchor="start" size={12} bold color={vizColors.muted}>Inductor current iL (A)</Label>
      {frame(118, 188)}
      {lo < 0 && <line x1={L} y1={yIl(0)} x2={R} y2={yIl(0)} stroke={vizColors.red} strokeWidth={1} strokeDasharray="4 3" />}
      <line x1={L} y1={yIl(loadA)} x2={R} y2={yIl(loadA)} stroke={vizColors.amber} strokeWidth={1.2} strokeDasharray="5 4" />
      <path d={polyline(ilPts)} fill="none" stroke={vizColors.violet} strokeWidth={2.4} />
      <Label x={L - 5} y={yIl(model.iMax) - 6} anchor="end" size={10} mono color={vizColors.muted}>{model.iMax.toFixed(2)}</Label>
      <Label x={L - 5} y={yIl(model.iMin) + 7} anchor="end" size={10} mono color={vizColors.muted}>{model.iMin.toFixed(2)}</Label>
      <Label x={R} y={yIl(loadA) - 8} anchor="end" size={10} mono color={vizColors.amber}>{`average = load ${loadA.toFixed(2)} A`}</Label>
      <circle cx={cx} cy={yIl(il[ci])} r={4} fill={vizColors.text} />

      <Label x={L} y={210} anchor="start" size={12} bold color={vizColors.muted}>Output ripple, zoomed and AC-coupled</Label>
      {frame(222, 292)}
      <line x1={L} y1={yRip(0)} x2={R} y2={yRip(0)} stroke={vizColors.grid} strokeWidth={1} />
      <path d={polyline(ripPts)} fill="none" stroke={vizColors.cyan} strokeWidth={2.4} />
      <Label x={L - 5} y={yRip(amp)} anchor="end" size={10} mono color={vizColors.muted}>{`+${formatSI(amp, "V")}`}</Label>
      <Label x={L - 5} y={yRip(-amp)} anchor="end" size={10} mono color={vizColors.muted}>{`−${formatSI(amp, "V")}`}</Label>
      <Label x={R} y={228} anchor="end" size={10} mono color={vizColors.cyan}>{`centred on Vout = ${model.vout.toFixed(2)} V`}</Label>
      <circle cx={cx} cy={yRip(rip[ci])} r={4} fill={vizColors.text} />

      <line x1={cx} y1={24} x2={cx} y2={292} stroke={vizColors.amber} strokeWidth={1} strokeOpacity={0.6} />
      {[0, 1, 2, 3].map((p) => (
        <Label key={p} x={x(p)} y={308} size={10} mono color={vizColors.muted}>{p === 0 ? "0" : formatSI(p * T, "s")}</Label>
      ))}
    </>
  );
}

export function BuckConverter() {
  const viz = useViz(true);
  const [vin, setVin] = useState(12);
  const [dutyPct, setDutyPct] = useState(27.5);
  const [loadMa, setLoadMa] = useState(500);
  const [ind, setInd] = useState<Inductance>("22");
  const [freq, setFreq] = useState<Frequency>("500");

  const duty = dutyPct / 100;
  const loadA = loadMa / 1000;
  const model = buckModel({ vin, duty, loadA, lUh: Number(ind), fKhz: Number(freq) });
  const ldo = ldoModel(vin, model.vout, loadA);

  const cycles = viz.t / ANIM_PERIOD;
  const phase = cycles % 1;
  const cursor = (cycles % 3) / 3;
  const on = phase < duty;
  const iNow = inductorCurrent(phase, duty, model.iMin, model.iMax);
  const activeLoop = on ? P_ON : P_OFF;
  const [flow] = useFlowPhases([dotSpeed(iNow, BUCK_REF_A, BUCK_PX_PER_S_AT_REF, BUCK_SPEED_CAP) / activeLoop.length], viz.playing);

  const lossMax = Math.max(ldo.loss, model.loss.total, 1e-9);
  const tj = 25 + ldo.junctionRise;
  const hot = tj > 150;

  return (
    <VizFrame
      title="Buck converter in slow motion"
      description="The duty cycle sets Vout = D · Vin. Watch the two switches alternate, the inductor current ramp up and down around the load current, and what the same job would cost as heat in an LDO."
      controls={
        <>
          <Slider label="Input voltage Vin" value={vin} min={6} max={24} step={0.5} unit="V" onChange={setVin} />
          <Segmented<Inductance>
            label="Inductor"
            options={[
              { value: "10", label: "10 µH" },
              { value: "22", label: "22 µH" },
              { value: "47", label: "47 µH" },
            ]}
            value={ind}
            onChange={setInd}
          />
          <Segmented<Frequency>
            label="Switching frequency"
            options={[
              { value: "250", label: "250 kHz" },
              { value: "500", label: "500 kHz" },
              { value: "1000", label: "1 MHz" },
              { value: "2000", label: "2 MHz" },
            ]}
            value={freq}
            onChange={setFreq}
          />
          <PlayPause playing={viz.playing} onToggle={viz.toggle} onReset={viz.reset} />
        </>
      }
      footer="Loss model: 180 mΩ and 120 mΩ switches, inductor DCR by value, 60 ns edges, 40 nJ gate charge per cycle and 1.5 mA quiescent current. The LDO figure ignores ground-pin current and assumes 60 °C/W for a SOT-223 on a modest copper pad. Below half the ripple current the inductor current dips negative: that is forced-PWM operation."
    >
      <ControlBar>
        <Slider label="Duty cycle D" value={dutyPct} min={5} max={95} step={0.5} unit="%" onChange={setDutyPct} />
        <Slider label="Load current" value={loadMa} min={50} max={2000} step={10} unit="mA" onChange={setLoadMa} />
      </ControlBar>
      <div className="@container">
        <div className="grid gap-3 @3xl:grid-cols-2">
          <SvgCanvas
            viewBox="0 0 480 280"
            className="mx-auto max-w-[480px]"
            title={`Synchronous buck converter: ${vin.toFixed(1)} volts in, ${model.vout.toFixed(2)} volts out at ${loadA.toFixed(2)} amps, high-side switch ${on ? "on" : "off"}`}
          >
            <rect x={0} y={0} width={480} height={280} fill={vizColors.bg} rx={8} />
            <SchematicPanel vin={vin} vout={model.vout} loadA={loadA} lUh={Number(ind)} on={on} iNow={iNow} flow={flow} />
          </SvgCanvas>
          <SvgCanvas
            viewBox="0 0 480 316"
            className="mx-auto max-w-[480px]"
            title="Waveforms over three switching periods: switch node voltage, inductor current and output ripple"
          >
            <rect x={0} y={0} width={480} height={316} fill={vizColors.bg} rx={8} />
            <WaveformPanel model={model} duty={duty} vin={vin} loadA={loadA} fKhz={Number(freq)} cursor={cursor} />
          </SvgCanvas>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Output voltage D · Vin" value={`${model.vout.toFixed(2)} V`} />
        <Stat
          label="Inductor ripple ΔIL"
          value={`${(model.rippleA + 1e-9).toFixed(3)} A`}
          tone={model.rippleA > loadA ? "warn" : "neutral"}
          hint={`${Math.round((model.rippleA / loadA) * 100)}% of the load current`}
        />
        <Stat label="Peak inductor current" value={`${model.iMax.toFixed(2)} A`} hint="Isat must exceed this" />
        <Stat label="Output ripple (ideal C)" value={formatSI(model.rippleV, "V")} hint="ΔI / (8 · f · Cout)" />
      </dl>

      <div className="mt-3 grid gap-3 rounded-lg border border-border bg-bg p-3 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3" aria-label="Heat comparison between an LDO and this buck converter">
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted">LDO from {vin.toFixed(1)} V: (Vin − Vout) · I</span>
              <span className="font-mono text-red-300">{formatSI(ldo.loss, "W")}</span>
            </div>
            <div className="mt-1 h-3 rounded bg-border">
              <div className="h-3 rounded bg-red-400" style={{ width: `${(ldo.loss / lossMax) * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted">{`efficiency ${(ldo.efficiency * 100).toFixed(1)}%`}</p>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted">Buck converter: conduction + switching + gate + quiescent</span>
              <span className="font-mono text-green-300">{formatSI(model.loss.total, "W")}</span>
            </div>
            <div className="mt-1 h-3 rounded bg-border">
              <div className="h-3 rounded bg-green-400" style={{ width: `${(model.loss.total / lossMax) * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted">{`efficiency ${(model.efficiency * 100).toFixed(1)}%`}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 content-start">
          <Stat label="LDO junction rise" value={`+${ldo.junctionRise.toFixed(0)} °C`} tone={hot ? "bad" : "neutral"} hint="at 60 °C/W" />
          <Stat
            label="LDO verdict"
            value={ldo.dropsOut ? "In dropout" : hot ? "Thermal shutdown" : "Survives"}
            tone={ldo.dropsOut || hot ? "bad" : "ok"}
            hint={ldo.dropsOut ? "Vin − Vout is under 1.2 V" : hot ? `about ${tj.toFixed(0)} °C at 25 °C ambient` : undefined}
          />
          <Stat label="Heat saved by the buck" value={formatSI(Math.max(ldo.loss - model.loss.total, 0), "W")} />
          <Stat label="Switching share of buck loss" value={`${Math.round((model.loss.switching / model.loss.total) * 100)}%`} hint="grows with frequency" />
        </dl>
      </div>
    </VizFrame>
  );
}
