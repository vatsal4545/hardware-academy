"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, makeScale, polyline, useViz, vizColors } from "@/components/viz/shared";
import { ControlBar, e12Range, FlowDots, formatSI, makePath, nearestIndex, Stat, useFlowPhases } from "./OhmsLawCircuit.helpers";
import { BatterySymbol, ResistorSymbol } from "./SchematicExplorer.symbols";

type Rated = "6.3" | "10" | "16" | "25";

/** 100 ohm to 1 Mohm, and 1 nF to 1 mF, both on the E12 series. */
const RES = e12Range(100, 4);
const CAPS = e12Range(1e-9, 6);

const N = 240; // samples across the 5-tau window
const SWEEP = 5.5; // seconds of playback for one 5-tau sweep
const PERIOD = 7.5; // sweep plus a short hold on the final value

const WIRE = "#7b8494";
const PATH_TOP = makePath([
  [70, 124],
  [70, 60],
  [265, 60],
  [265, 100],
]);
const PATH_BOTTOM = makePath([
  [265, 160],
  [265, 200],
  [70, 200],
  [70, 136],
]);
const nearSource = (x: number, y: number) => Math.abs(x - 70) < 8 && y > 112 && y < 148;

/**
 * Fraction of the zero-bias capacitance that survives at x = Vdc / Vrated for a small-case,
 * high-value X7R part: about 82% at a quarter of the rating, 61% at half, 36% at the rating.
 */
export function x7rDerating(x: number): number {
  return 1 / (1 + 1.8 * Math.pow(Math.abs(x), 1.5));
}

function simulateRc(args: { R: number; c0: number; vs: number; v0: number; derate: boolean; vr: number; tMax: number }): number[] {
  const { R, c0, vs, v0, derate, vr, tMax } = args;
  const out: number[] = [];
  if (!derate) {
    const tau = R * c0;
    for (let i = 0; i <= N; i++) out.push(vs + (v0 - vs) * Math.exp(-((i / N) * tMax) / tau));
    return out;
  }
  const sub = 10;
  const h = tMax / (N * sub);
  let v = v0;
  for (let i = 0; i <= N; i++) {
    out.push(v);
    for (let s = 0; s < sub; s++) {
      const c = c0 * x7rDerating(v / vr);
      v += ((vs - v) / (R * c)) * h;
    }
  }
  return out;
}

/** Time at which the response has covered `frac` of the way from v0 to vs (linear interpolation), or null. */
function timeToFraction(samples: number[], v0: number, vs: number, frac: number, tMax: number): number | null {
  const target = v0 + (vs - v0) * frac;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (a !== b && (a - target) * (b - target) <= 0) return ((i - 1 + (target - a) / (b - a)) / N) * tMax;
  }
  return null;
}

/** Seconds with an SI prefix, switching to minutes for long time constants. */
function formatTime(seconds: number): string {
  return seconds >= 120 ? `${+(seconds / 60).toFixed(1)} min` : formatSI(seconds, "s");
}

function CircuitPanel({
  vin,
  vs,
  R,
  c0,
  cNow,
  cNorm,
  vNow,
  phases,
  rates,
  stepOn,
}: {
  vin: number;
  vs: number;
  R: number;
  c0: number;
  cNow: number;
  cNorm: number;
  vNow: number;
  phases: number[];
  rates: number[];
  stepOn: boolean;
}) {
  const slots = Math.round(3 + 6 * cNorm);
  const filled = Math.round(slots * Math.min(1, Math.max(0, vNow / vin)));
  const x0 = 265 - ((slots - 1) * 8.5) / 2;
  const q = Math.min(1, Math.max(0, vNow / vin));
  const moving = Math.abs(rates[0]) > 0.02;
  return (
    <>
      <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 70 124 V 60 H 124" />
        <path d="M 176 60 H 265 V 100" />
        <path d="M 265 160 V 200 H 70 V 136" />
      </g>
      <BatterySymbol cx={70} cy={130} stroke={stepOn ? vizColors.text : vizColors.muted} />
      <ResistorSymbol cx={150} cy={60} length={52} width={22} />

      {/* capacitor plates, dielectric and stored charge */}
      <rect x={227} y={104} width={76} height={52} fill={vizColors.cyan} opacity={0.04 + 0.12 * q} />
      <line x1={223} y1={100} x2={307} y2={100} stroke={vizColors.text} strokeWidth={4} strokeLinecap="round" />
      <line x1={223} y1={160} x2={307} y2={160} stroke={vizColors.text} strokeWidth={4} strokeLinecap="round" />
      {Array.from({ length: slots }, (_, k) => {
        const x = x0 + k * 8.5;
        const on = k < filled;
        return (
          <g key={k}>
            <circle cx={x} cy={150} r={3.4} fill={on ? vizColors.electron : "none"} stroke={on ? "none" : vizColors.grid} strokeWidth={1.2} />
            {on ? (
              <text x={x} y={113.5} textAnchor="middle" fontSize={11} fontWeight={700} fill={vizColors.hole}>
                +
              </text>
            ) : (
              <circle cx={x} cy={110} r={3.4} fill="none" stroke={vizColors.grid} strokeWidth={1.2} />
            )}
          </g>
        );
      })}
      <g opacity={q}>
        <Arrow x1={247} y1={120} x2={247} y2={140} color={vizColors.violet} width={1.5} head={6} />
        <Arrow x1={265} y1={120} x2={265} y2={140} color={vizColors.violet} width={1.5} head={6} />
        <Arrow x1={283} y1={120} x2={283} y2={140} color={vizColors.violet} width={1.5} head={6} />
      </g>

      {moving && (
        <>
          <FlowDots path={PATH_TOP} phase={phases[0]} count={10} color={vizColors.electron} r={3} hide={nearSource} />
          <FlowDots path={PATH_BOTTOM} phase={phases[1]} count={10} color={vizColors.electron} r={3} hide={nearSource} />
        </>
      )}

      <Label x={150} y={36} mono bold>{`R = ${formatSI(R, "Ω")}`}</Label>
      <Label x={106} y={130} anchor="start" mono bold color={stepOn ? vizColors.amber : vizColors.muted}>{`Vs = ${vs.toFixed(1)} V`}</Label>
      <Label x={316} y={112} anchor="start" mono bold>{`C = ${formatSI(c0, "F")}`}</Label>
      <Label x={316} y={130} anchor="start" size={11} mono color={cNow < c0 * 0.995 ? vizColors.orange : vizColors.muted}>
        {`now ${formatSI(cNow, "F")}`}
      </Label>
      <Label x={316} y={148} anchor="start" size={11} mono color={vizColors.cyan}>{`vC ${vNow.toFixed(2)} V`}</Label>
      <Label x={200} y={232} size={12} color={vizColors.muted}>
        {stepOn ? "Step on: Vs charges C through R" : "Step off: C discharges through R into the 0 V source"}
      </Label>
    </>
  );
}

function VoltagePlot({
  samples,
  ideal,
  vin,
  tau,
  tMax,
  u,
  derate,
  t63,
}: {
  samples: number[];
  ideal: number[];
  vin: number;
  tau: number;
  tMax: number;
  u: number;
  derate: boolean;
  t63: number | null;
}) {
  const L = 54;
  const Rr = 382;
  const T = 30;
  const B = 192;
  const x = makeScale([0, tMax], [L, Rr]);
  const y = makeScale([0, vin], [B, T]);
  const pts = (arr: number[]): Array<[number, number]> => arr.map((v, i) => [x((i / N) * tMax), y(v)]);
  const idx = Math.min(N, Math.max(0, Math.round(u * N)));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <>
      <Label x={L} y={12} anchor="start" size={12} bold color={vizColors.muted}>Capacitor voltage vC(t)</Label>
      {ticks.map((f) => (
        <g key={f}>
          <line x1={L} y1={y(f * vin)} x2={Rr} y2={y(f * vin)} stroke={vizColors.grid} strokeWidth={1} />
          <Label x={L - 6} y={y(f * vin)} anchor="end" size={10} mono color={vizColors.muted}>{`${+(f * vin).toFixed(2)} V`}</Label>
        </g>
      ))}
      {[1, 2, 3, 4, 5].map((k) => (
        <g key={k}>
          <line x1={x(k * tau)} y1={T} x2={x(k * tau)} y2={B} stroke={vizColors.grid} strokeWidth={1} strokeDasharray="3 4" />
          <Label x={x(k * tau)} y={T - 6} size={10} color={vizColors.muted}>{`${k}τ`}</Label>
          <Label x={x(k * tau)} y={B + 12} size={10} mono color={vizColors.muted}>{formatTime(k * tau)}</Label>
        </g>
      ))}
      <line x1={L} y1={B} x2={Rr} y2={B} stroke={vizColors.muted} strokeWidth={1.5} />
      <line x1={L} y1={T} x2={L} y2={B} stroke={vizColors.muted} strokeWidth={1.5} />
      {derate && <path d={polyline(pts(ideal))} fill="none" stroke={vizColors.muted} strokeWidth={1.5} strokeDasharray="5 4" />}
      <path d={polyline(pts(samples))} fill="none" stroke={derate ? vizColors.amber : vizColors.cyan} strokeWidth={2.5} />
      {t63 !== null && (
        <circle cx={x(t63)} cy={y(samples[Math.min(N, Math.round((t63 / tMax) * N))])} r={4} fill="none" stroke={vizColors.green} strokeWidth={2} />
      )}
      <circle cx={x((idx / N) * tMax)} cy={y(samples[idx])} r={5} fill={vizColors.text} stroke={vizColors.bg} strokeWidth={2} />
      <Label x={Rr} y={B + 28} anchor="end" size={10} color={vizColors.muted}>
        {derate ? "amber: derated X7R    dashed: ideal C" : "green ring: 63.2% of the step at t = τ"}
      </Label>
    </>
  );
}

/** Capacitance versus DC bias for the derated X7R part; shown only while "X7R DC-bias derating" is on. */
function BiasPlot({ rated, vin, vNow, cFracNow }: { rated: number; vin: number; vNow: number; cFracNow: number }) {
  const L = 54;
  const Rr = 382;
  const T = 30;
  const B = 192;
  const vMax = Math.max(rated, vin) * 1.1;
  const x = makeScale([0, vMax], [L, Rr]);
  const y = makeScale([0, 1], [B, T]);
  const curve: Array<[number, number]> = Array.from({ length: 41 }, (_, i) => {
    const v = (i / 40) * vMax;
    return [x(v), y(x7rDerating(v / rated))];
  });
  return (
    <>
      <Label x={L} y={12} anchor="start" size={12} bold color={vizColors.muted}>
        {`Capacitance vs DC bias (X7R, ${rated} V rated)`}
      </Label>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={L} y1={y(f)} x2={Rr} y2={y(f)} stroke={vizColors.grid} strokeWidth={1} />
          <Label x={L - 6} y={y(f)} anchor="end" size={10} mono color={vizColors.muted}>{`${Math.round(f * 100)}%`}</Label>
        </g>
      ))}
      <line x1={L} y1={B} x2={Rr} y2={B} stroke={vizColors.muted} strokeWidth={1.5} />
      <line x1={L} y1={T} x2={L} y2={B} stroke={vizColors.muted} strokeWidth={1.5} />
      <line x1={x(rated)} y1={T} x2={x(rated)} y2={B} stroke={vizColors.red} strokeWidth={1.2} strokeDasharray="4 4" />
      <Label x={x(rated)} y={T - 6} size={10} color={vizColors.red}>rated</Label>
      <line x1={x(vin)} y1={T} x2={x(vin)} y2={B} stroke={vizColors.green} strokeWidth={1.2} strokeDasharray="4 4" />
      <Label x={x(vin)} y={B + 12} size={10} mono color={vizColors.green}>{`${vin.toFixed(1)} V`}</Label>
      <path d={polyline(curve)} fill="none" stroke={vizColors.amber} strokeWidth={2.5} />
      <circle cx={x(Math.min(vNow, vMax))} cy={y(cFracNow)} r={5} fill={vizColors.text} stroke={vizColors.bg} strokeWidth={2} />
      <Label x={(L + Rr) / 2} y={B + 28} size={10} color={vizColors.muted}>DC bias across the capacitor (V)</Label>
    </>
  );
}

export function RcCharging() {
  const viz = useViz(true);
  const [rIdx, setRIdx] = useState(() => nearestIndex(RES, 100_000));
  const [cIdx, setCIdx] = useState(() => nearestIndex(CAPS, 10e-6));
  const [vin, setVin] = useState(5);
  const [stepOn, setStepOn] = useState(true);
  const [derate, setDerate] = useState(false);
  const [rated, setRated] = useState<Rated>("10");

  const R = RES[rIdx];
  const c0 = CAPS[cIdx];
  const vr = Number(rated);
  const tau = R * c0;
  const tMax = 5 * tau;
  const vs = stepOn ? vin : 0;
  const v0 = stepOn ? 0 : vin;

  const samples = simulateRc({ R, c0, vs, v0, derate, vr, tMax });
  const ideal = derate ? simulateRc({ R, c0, vs, v0, derate: false, vr, tMax }) : samples;

  const cycle = viz.t % PERIOD;
  const u = Math.min(1, cycle / SWEEP);
  const idx = Math.min(N, Math.round(u * N));
  const vNow = samples[idx];
  const iNow = (vs - vNow) / R;
  const i0 = Math.max(Math.abs(vs - v0) / R, 1e-12);
  const cFracNow = derate ? x7rDerating(vNow / vr) : 1;
  const cNow = c0 * cFracNow;
  const cNorm = (Math.log10(c0) - Math.log10(CAPS[0])) / (Math.log10(CAPS[CAPS.length - 1]) - Math.log10(CAPS[0]));

  // electrons travel against the conventional current, so the rate is negative while charging
  const speed = 1.5 * (iNow / i0);
  const rates = [-speed, -speed * (PATH_TOP.length / PATH_BOTTOM.length)];
  const phases = useFlowPhases(rates, viz.playing);

  const t63 = timeToFraction(samples, v0, vs, 0.632, tMax);
  const tau63Text = t63 === null ? "n/a" : formatTime(t63);
  const stress = derate && vin > 0.8 * vr;

  return (
    <VizFrame
      title="RC charging and the DC-bias trap"
      description="Step a voltage onto a resistor and capacitor and watch the plates fill. Turn on X7R derating to see the real capacitance shrink as the voltage rises."
      controls={
        <>
          <Slider label="Step voltage Vs" value={vin} min={1} max={12} step={0.5} unit="V" onChange={setVin} />
          <Toggle label="X7R DC-bias derating" checked={derate} onChange={setDerate} />
          {derate ? (
            <Segmented<Rated>
              label="Capacitor voltage rating"
              options={[
                { value: "6.3", label: "6.3 V" },
                { value: "10", label: "10 V" },
                { value: "16", label: "16 V" },
                { value: "25", label: "25 V" },
              ]}
              value={rated}
              onChange={setRated}
            />
          ) : (
            <div />
          )}
          <PlayPause playing={viz.playing} onToggle={viz.toggle} onReset={viz.reset} />
        </>
      }
      footer="The time axis always spans 5τ, so changing R or C stretches the labels while the curve keeps its shape; the electrons slow down as the current decays. Playback is slowed so one 5τ window lasts about five seconds."
    >
      <ControlBar>
        <Slider
          label="Resistance R"
          value={rIdx}
          min={0}
          max={RES.length - 1}
          step={1}
          onChange={setRIdx}
          format={(i) => formatSI(RES[i], "Ω")}
        />
        <Slider
          label="Capacitance C (zero-bias value)"
          value={cIdx}
          min={0}
          max={CAPS.length - 1}
          step={1}
          onChange={setCIdx}
          format={(i) => formatSI(CAPS[i], "F")}
        />
        <Toggle label="Step input applied (off = discharge)" checked={stepOn} onChange={setStepOn} />
      </ControlBar>
      <div className="@container">
        <div className="grid gap-3 @3xl:grid-cols-2">
          <SvgCanvas
            viewBox="0 0 400 250"
            className="mx-auto max-w-[440px]"
            title={`RC circuit: a ${stepOn ? vin.toFixed(1) : "0"} volt step through ${formatSI(R, "ohm")} into ${formatSI(c0, "farad")}, time constant ${formatSI(tau, "second")}`}
          >
            <rect x={0} y={0} width={400} height={250} fill={vizColors.bg} rx={8} />
            <CircuitPanel
              vin={vin}
              vs={vs}
              R={R}
              c0={c0}
              cNow={cNow}
              cNorm={cNorm}
              vNow={vNow}
              phases={phases}
              rates={rates}
              stepOn={stepOn}
            />
          </SvgCanvas>
          <SvgCanvas viewBox="0 0 400 250" className="mx-auto max-w-[440px]" title="Capacitor voltage over five time constants">
            <rect x={0} y={0} width={400} height={250} fill={vizColors.bg} rx={8} />
            <VoltagePlot samples={samples} ideal={ideal} vin={vin} tau={tau} tMax={tMax} u={u} derate={derate} t63={t63} />
          </SvgCanvas>
          {derate && (
            <SvgCanvas viewBox="0 0 400 250" className="mx-auto max-w-[440px]" title="Capacitance versus DC bias voltage">
              <rect x={0} y={0} width={400} height={250} fill={vizColors.bg} rx={8} />
              <BiasPlot rated={vr} vin={vin} vNow={vNow} cFracNow={cFracNow} />
            </SvgCanvas>
          )}
          <dl className="grid grid-cols-2 content-start gap-2">
            <Stat label="Time constant τ = R · C" value={formatTime(tau)} hint={derate ? "Uses the zero-bias capacitance." : undefined} />
            <Stat label="5τ (99.3% settled)" value={formatTime(5 * tau)} />
            <Stat
              label="Time to 63.2% of the step"
              value={tau63Text}
              tone={derate && t63 !== null && t63 < tau * 0.95 ? "warn" : "neutral"}
              hint={derate ? "Shorter than τ: the real C is smaller than its label." : undefined}
            />
            <Stat label="Capacitor voltage now" value={`${vNow.toFixed(2)} V`} />
            <Stat
              label="Capacitance now"
              value={`${formatSI(cNow, "F")} (${Math.round(cFracNow * 100)}%)`}
              tone={stress ? "bad" : cFracNow < 0.7 ? "warn" : "neutral"}
              hint={stress ? "Bias is above 80% of the rating: pick a higher voltage rating." : undefined}
            />
            <Stat label="Current now" value={formatSI(iNow, "A")} />
          </dl>
        </div>
      </div>
    </VizFrame>
  );
}
