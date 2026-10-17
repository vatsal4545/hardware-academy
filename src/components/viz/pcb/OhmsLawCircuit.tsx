"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";
import {
  ControlBar,
  dotRate,
  dotRates,
  e12Range,
  FlowDots,
  formatSI,
  makePath,
  nearestIndex,
  parallel,
  Stat,
  useFlowPhases,
} from "./OhmsLawCircuit.helpers";
import { BatterySymbol, GroundSymbol, JunctionDot, ResistorSymbol } from "./SchematicExplorer.symbols";

type Mode = "ohm" | "divider";
type Rating = "0.125" | "0.25" | "1";

/** E12 values, 10 ohm to 10 kohm, for the Ohm's-law resistor; 100 ohm to 1 Mohm for the divider. */
const OHM_R = e12Range(10, 3);
const WIDE_R = e12Range(100, 4);

/** Dot speed scales: this many amps is one loop per second (see dotRate and dotRates). */
const OHM_REF_A = 0.01;
const DIVIDER_REF_A = 300e-6;

const WIRE = "#7b8494";
const OHM_LOOP = makePath(
  [
    [90, 60],
    [400, 60],
    [400, 210],
    [90, 210],
  ],
  true,
);
const DIV_R1 = makePath([
  [150, 36],
  [150, 160],
]);
const DIV_R2 = makePath([
  [150, 160],
  [150, 290],
]);
const DIV_LOAD = makePath([
  [150, 160],
  [340, 160],
  [340, 290],
]);

function heat(ratio: number) {
  const g = Math.min(1, Math.max(0, (ratio - 0.15) / 1.35));
  const color = ratio > 1 ? vizColors.red : ratio > 0.6 ? vizColors.orange : vizColors.amber;
  return { g, color };
}

function OhmDrawing({
  volts,
  resistance,
  current,
  power,
  ratio,
  phase,
}: {
  volts: number;
  resistance: number;
  current: number;
  power: number;
  ratio: number;
  phase: number;
}) {
  const { g, color } = heat(ratio);
  return (
    <>
      {/* wires */}
      <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 90 118 V 60 H 400 V 105" />
        <path d="M 400 165 V 210 H 90 V 130" />
      </g>
      {/* resistor glow, heat scales with P / rating */}
      {[18, 12, 6].map((e, i) => (
        <rect
          key={e}
          x={400 - 14 - e}
          y={135 - 30 - e}
          width={28 + 2 * e}
          height={60 + 2 * e}
          rx={6 + e / 2}
          fill={color}
          opacity={g * (0.1 + 0.08 * i)}
        />
      ))}
      <ResistorSymbol
        cx={400}
        cy={135}
        length={60}
        width={28}
        vertical
        stroke={ratio > 1 ? vizColors.red : vizColors.text}
        fill={color}
        fillOpacity={0.12 + 0.5 * g}
      />
      {/* dots skip the source: it is where charge gains energy */}
      <FlowDots path={OHM_LOOP} phase={phase} count={14} hide={(x, y) => x < 100 && y > 110 && y < 140} />
      <BatterySymbol cx={90} cy={124} />
      <Arrow x1={210} y1={60} x2={275} y2={60} color={vizColors.amber} width={2} />
      <Label x={242} y={42} color={vizColors.amber} bold mono>{`I = ${formatSI(current, "A")}`}</Label>
      <Label x={68} y={124} anchor="end" bold mono>{`${volts.toFixed(1)} V`}</Label>
      <Label x={434} y={126} anchor="start" bold mono>{`R = ${formatSI(resistance, "Ω")}`}</Label>
      <Label x={434} y={146} anchor="start" mono color={ratio > 1 ? vizColors.red : vizColors.muted}>{`P = ${formatSI(power, "W")}`}</Label>
      <Label x={245} y={124} size={12} color={vizColors.muted}>Kirchhoff: source rise = resistor drop</Label>
      <Label x={245} y={146} size={12} mono color={vizColors.muted}>{`+${volts.toFixed(1)} V − ${(current * resistance).toFixed(1)} V = 0`}</Label>
    </>
  );
}

function DividerDrawing({
  vin,
  r1,
  r2,
  rl,
  loaded,
  vout,
  vth,
  rth,
  phases,
  rates,
}: {
  vin: number;
  r1: number;
  r2: number;
  rl: number;
  loaded: boolean;
  vout: number;
  vth: number;
  rth: number;
  phases: number[];
  rates: number[];
}) {
  const showR1 = rates[0] > 0;
  return (
    <>
      <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 150 36 V 60" />
        <path d="M 150 120 V 200" />
        <path d="M 150 260 V 290" />
        <path d={loaded ? "M 150 160 H 340 V 200" : "M 150 160 H 295"} />
        {loaded && <path d="M 340 260 V 290 H 150" />}
      </g>
      <circle cx={150} cy={31} r={5} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
      <GroundSymbol x={150} y={290} />
      <ResistorSymbol cx={150} cy={90} length={60} width={28} vertical />
      <ResistorSymbol cx={150} cy={230} length={60} width={28} vertical />
      {loaded && <ResistorSymbol cx={340} cy={230} length={60} width={28} vertical stroke={vizColors.orange} />}
      <JunctionDot x={150} y={160} />
      {loaded ? <JunctionDot x={300} y={160} /> : <circle cx={300} cy={160} r={5} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2} />}
      {showR1 && <FlowDots path={DIV_R1} phase={phases[0]} count={6} />}
      {rates[1] > 0 && <FlowDots path={DIV_R2} phase={phases[1]} count={6} />}
      {loaded && rates[2] > 0 && <FlowDots path={DIV_LOAD} phase={phases[2]} count={9} color={vizColors.orange} />}
      <Label x={138} y={31} anchor="end" bold mono>{`Vin ${vin.toFixed(1)} V`}</Label>
      <Label x={118} y={90} anchor="end" mono>{`R1 ${formatSI(r1, "Ω")}`}</Label>
      <Label x={118} y={230} anchor="end" mono>{`R2 ${formatSI(r2, "Ω")}`}</Label>
      {loaded && <Label x={372} y={230} anchor="start" mono color={vizColors.orange}>{`RL ${formatSI(rl, "Ω")}`}</Label>}
      <Label x={225} y={142} bold mono color={vizColors.cyan}>{`Vout ${vout.toFixed(2)} V`}</Label>

      {/* Thevenin equivalent of what the divider looks like from the output */}
      <Label x={475} y={20} size={12} color={vizColors.muted}>Thevenin equivalent</Label>
      <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 420 85 V 60 H 452" />
        <path d="M 498 60 H 535" />
        <path d="M 420 115 V 170 H 535" />
        {loaded && <path d="M 535 60 V 108 M 535 152 V 170" />}
      </g>
      <circle cx={420} cy={100} r={15} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
      <Label x={420} y={100} size={11} bold>Vth</Label>
      <ResistorSymbol cx={475} cy={60} length={46} width={18} />
      {loaded && <ResistorSymbol cx={535} cy={130} length={44} width={18} vertical stroke={vizColors.orange} />}
      <GroundSymbol x={477} y={170} />
      {loaded ? <JunctionDot x={535} y={60} /> : <circle cx={535} cy={60} r={5} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2} />}
      <Label x={428} y={140} anchor="start" size={11} mono>{formatSI(vth, "V")}</Label>
      {loaded && <Label x={520} y={130} anchor="end" size={11} mono color={vizColors.orange}>{`RL ${formatSI(rl, "Ω")}`}</Label>}
      <Label x={475} y={82} size={11} mono>{`Rth ${formatSI(rth, "Ω")}`}</Label>
      <Label x={555} y={42} anchor="end" size={11} mono color={vizColors.cyan}>{`Vout ${vout.toFixed(2)} V`}</Label>
    </>
  );
}

export function OhmsLawCircuit() {
  const viz = useViz(true);
  const [mode, setMode] = useState<Mode>("ohm");
  const [volts, setVolts] = useState(5);
  const [rIdx, setRIdx] = useState(() => nearestIndex(OHM_R, 1000));
  const [rating, setRating] = useState<Rating>("0.25");
  const [vin, setVin] = useState(12);
  const [r1Idx, setR1Idx] = useState(() => nearestIndex(WIDE_R, 27000));
  const [r2Idx, setR2Idx] = useState(() => nearestIndex(WIDE_R, 10000));
  const [loaded, setLoaded] = useState(false);
  const [rlIdx, setRlIdx] = useState(() => nearestIndex(WIDE_R, 100000));

  // Ohm's law mode
  const R = OHM_R[rIdx];
  const current = volts / R;
  const power = volts * current;
  const ratingW = Number(rating);
  const ratio = power / ratingW;

  // divider mode
  const R1 = WIDE_R[r1Idx];
  const R2 = WIDE_R[r2Idx];
  const RL = WIDE_R[rlIdx];
  const vth = (vin * R2) / (R1 + R2);
  const rth = parallel(R1, R2);
  const r2eff = loaded ? parallel(R2, RL) : R2;
  const vout = (vin * r2eff) / (R1 + r2eff);
  const iR1 = vin / (R1 + r2eff);
  const iR2 = vout / R2;
  const iLoad = loaded ? vout / RL : 0;
  const errPct = (1 - vout / vth) * 100;

  const rates = mode === "ohm" ? [dotRate(current, OHM_REF_A), 0, 0] : dotRates([iR1, iR2, iLoad], DIVIDER_REF_A);
  const phases = useFlowPhases(rates, viz.playing);

  const heatTone = ratio > 1 ? "bad" : ratio > 0.5 ? "warn" : "ok";
  const errTone = Math.abs(errPct) < 1 ? "ok" : Math.abs(errPct) < 5 ? "warn" : "bad";
  const rthTone = rth <= 10_000 ? "ok" : "warn";

  const title =
    mode === "ohm"
      ? `Series circuit: a ${volts.toFixed(1)} volt source drives a ${formatSI(R, "ohm")} resistor, current ${formatSI(current, "A")}, power ${formatSI(power, "W")}.`
      : `Voltage divider: ${vin.toFixed(1)} volts across ${formatSI(R1, "ohm")} and ${formatSI(R2, "ohm")} gives ${vout.toFixed(2)} volts${loaded ? ` with a ${formatSI(RL, "ohm")} load` : " unloaded"}.`;

  const controls = (
    <>
      <Segmented<Mode>
        label="Circuit"
        options={[
          { value: "ohm", label: "Ohm's law" },
          { value: "divider", label: "Voltage divider" },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === "ohm" ? (
        <>
          <Slider label="Source voltage V" value={volts} min={0.5} max={12} step={0.5} unit="V" onChange={setVolts} />
          <Slider
            label="Resistance R (E12 values)"
            value={rIdx}
            min={0}
            max={OHM_R.length - 1}
            step={1}
            onChange={setRIdx}
            format={(i) => formatSI(OHM_R[i], "Ω")}
          />
          <Segmented<Rating>
            label="Resistor power rating"
            options={[
              { value: "0.125", label: "1/8 W" },
              { value: "0.25", label: "1/4 W" },
              { value: "1", label: "1 W" },
            ]}
            value={rating}
            onChange={setRating}
          />
        </>
      ) : (
        <>
          <Slider label="Input voltage Vin" value={vin} min={1} max={24} step={0.5} unit="V" onChange={setVin} />
          <Slider
            label="R1 (top)"
            value={r1Idx}
            min={0}
            max={WIDE_R.length - 1}
            step={1}
            onChange={setR1Idx}
            format={(i) => formatSI(WIDE_R[i], "Ω")}
          />
          <Slider
            label="R2 (bottom)"
            value={r2Idx}
            min={0}
            max={WIDE_R.length - 1}
            step={1}
            onChange={setR2Idx}
            format={(i) => formatSI(WIDE_R[i], "Ω")}
          />
          <Toggle label="Attach a load to Vout" checked={loaded} onChange={setLoaded} />
          <Slider
            label="Load resistance RL"
            value={rlIdx}
            min={0}
            max={WIDE_R.length - 1}
            step={1}
            onChange={setRlIdx}
            format={(i) => formatSI(WIDE_R[i], "Ω")}
          />
        </>
      )}
      <PlayPause playing={viz.playing} onToggle={viz.toggle} />
    </>
  );

  return (
    <VizFrame
      title="Ohm's law and the loaded divider"
      description={
        mode === "ohm"
          ? "Change V and R: the dots circulate faster as the current rises, and the resistor heats up as P = V · I approaches its rating."
          : "Tap a divider output and attach a load: watch Vout sag by the Thevenin factor RL / (RL + Rth) and the current split at the node."
      }
      footer={
        mode === "ohm"
          ? "Dot speed is proportional to current: 10 mA is one loop per second, up to a cap of 2.4 loops per second (from 24 mA up, more current no longer looks faster). Real resistors are rated at 70 °C ambient; running them at half rating or less keeps them cool."
          : "ADC rule of thumb: keep the Thevenin resistance below about 10 kΩ, or add a 100 nF capacitor at the pin. The three streams of dots share one speed scale (300 µA is one loop per second), so a stream that moves ten times slower carries a tenth of the current; the divider current is the same on both resistors until a load steals some at the node."
      }
    >
      <ControlBar>{controls}</ControlBar>
      <div className="overflow-x-auto">
        <SvgCanvas viewBox={mode === "ohm" ? "0 0 560 270" : "0 0 560 320"} title={title} className="min-w-[520px]">
          <rect x={0} y={0} width={560} height={mode === "ohm" ? 270 : 320} fill={vizColors.bg} rx={8} />
          {mode === "ohm" ? (
            <OhmDrawing volts={volts} resistance={R} current={current} power={power} ratio={ratio} phase={phases[0]} />
          ) : (
            <DividerDrawing
              vin={vin}
              r1={R1}
              r2={R2}
              rl={RL}
              loaded={loaded}
              vout={vout}
              vth={vth}
              rth={rth}
              phases={phases}
              rates={rates}
            />
          )}
        </SvgCanvas>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-live="polite">
        {mode === "ohm" ? (
          <>
            <Stat label="Current  I = V / R" value={formatSI(current, "A")} />
            <Stat label="Power  P = V · I" value={formatSI(power, "W")} tone={heatTone} />
            <Stat label="Share of rating" value={`${(ratio * 100).toFixed(ratio < 0.1 ? 1 : 0)}%`} tone={heatTone} />
            <Stat
              label="Verdict"
              value={ratio > 1 ? "Over rating" : ratio > 0.5 ? "Hot: derate" : "Comfortable"}
              tone={heatTone}
              hint={ratio > 1 ? "This part would overheat and fail." : undefined}
            />
          </>
        ) : (
          <>
            <Stat label="Vout, unloaded" value={`${vth.toFixed(3)} V`} />
            <Stat label="Vout, as drawn" value={`${vout.toFixed(3)} V`} tone={loaded ? errTone : "neutral"} />
            <Stat label="Loading error" value={`${errPct.toFixed(1)}%`} tone={errTone} />
            <Stat label="Thevenin Rth = R1 ∥ R2" value={formatSI(rth, "Ω")} tone={rthTone} />
            <Stat label="Current in R1" value={formatSI(iR1, "A")} />
            <Stat label="Current in R2" value={formatSI(iR2, "A")} />
            <Stat label="Current into load" value={formatSI(iLoad, "A")} hint="KCL: I(R1) = I(R2) + I(load)" />
            <Stat label="Divider dissipation" value={formatSI(vin * iR1, "W")} />
          </>
        )}
      </dl>
    </VizFrame>
  );
}
