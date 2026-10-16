"use client";

import { useMemo, useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, polyline, useViz, vizColors } from "@/components/viz/shared";

export type PwmMode = "spwm" | "svpwm";
type Ratio = "9" | "15" | "27";

const TAU = Math.PI * 2;
const SHIFT = TAU / 3;
export const VDC = 400;
/** The dead-time slider is in µs at a real 10 kHz carrier; the waveform uses the same fraction td/Ts. */
export const REAL_FSW_HZ = 10_000;
/** The motor current lags the voltage by 30° (inductive load); its sign decides which diode conducts in dead time. */
const LAG = Math.PI / 6;
const SECONDS_PER_CYCLE = 6;
const PHASE_COLORS = [vizColors.red, vizColors.amber, vizColors.blue] as const;
const LEG_NAMES = ["A", "B", "C"] as const;
const SWITCH_NAMES = [
  ["S1", "S4"],
  ["S3", "S6"],
  ["S5", "S2"],
] as const;

export interface PwmParams {
  m: number;
  mode: PwmMode;
  /** carrier periods per fundamental cycle */
  ratio: number;
  /** dead time as a fraction of the carrier period, td/Ts */
  deadFrac: number;
}

const frac = (v: number) => v - Math.floor(v);

/** Phase references in carrier units (−1..1 is the linear range). SVPWM adds the min-max common-mode offset. */
export function references(theta: number, m: number, mode: PwmMode): [number, number, number] {
  const r: [number, number, number] = [m * Math.sin(theta), m * Math.sin(theta - SHIFT), m * Math.sin(theta + SHIFT)];
  if (mode === "spwm") return r;
  const offset = -(Math.max(r[0], r[1], r[2]) + Math.min(r[0], r[1], r[2])) / 2;
  return [r[0] + offset, r[1] + offset, r[2] + offset];
}

/** Triangular carrier, tau = fraction of one fundamental cycle: −1 at the start of each period, +1 mid-period. */
export function carrier(tau: number, ratio: number): number {
  return 1 - 4 * Math.abs(frac(tau * ratio) - 0.5);
}

export interface LegState {
  high: boolean;
  low: boolean;
  /** pole voltage relative to the DC midpoint, in units of Vdc (±0.5) */
  v: number;
  /** true when the phase current flows out of the leg into the motor */
  currentOut: boolean;
}

/** Gate states of the three legs. Turn-on is delayed by the dead time; while both switches are off a diode sets the output. */
export function legStates(tau: number, p: PwmParams): [LegState, LegState, LegState] {
  const d = p.deadFrac / p.ratio;
  const c = carrier(tau, p.ratio);
  const r = references(TAU * tau, p.m, p.mode);
  const cPrev = carrier(tau - d, p.ratio);
  const rPrev = d > 0 ? references(TAU * (tau - d), p.m, p.mode) : r;
  const leg = (k: 0 | 1 | 2): LegState => {
    const now = r[k] > c;
    const before = d > 0 ? rPrev[k] > cPrev : now;
    const high = now && before;
    const low = !now && !before;
    const currentOut = Math.sin(TAU * tau - k * SHIFT - LAG) > 0;
    // dead time: positive current freewheels through the lower diode (output low), negative through the upper one
    const v = high ? 0.5 : low ? -0.5 : currentOut ? -0.5 : 0.5;
    return { high, low, v, currentOut };
  };
  return [leg(0), leg(1), leg(2)];
}

export interface PwmWaveforms {
  samples: number;
  /** motor phase-to-neutral voltage of phase A, volts */
  van: Float64Array;
  /** van smoothed by two passes of a one-carrier-period moving average, a stand-in for the motor's inductance */
  filtered: Float64Array;
  /** peak of the fundamental of van, volts */
  fundamentalPeak: number;
}

/** Centred, circular moving average over `window` samples (window even). */
function movingAverage(x: Float64Array, window: number): Float64Array {
  const n = x.length;
  const half = window / 2;
  const out = new Float64Array(n);
  let acc = 0;
  for (let j = -half; j < half; j++) acc += x[(j + n) % n];
  for (let j = 0; j < n; j++) {
    out[j] = acc / window;
    acc += x[(j + half) % n] - x[(j - half + n) % n];
  }
  return out;
}

/** Samples one fundamental cycle of the phase-A motor voltage and extracts its fundamental. */
export function pwmWaveforms(p: PwmParams, perCarrier = 240): PwmWaveforms {
  const n = Math.round(p.ratio * perCarrier);
  const van = new Float64Array(n);
  let s1 = 0;
  let c1 = 0;
  for (let j = 0; j < n; j++) {
    const tau = j / n;
    const [a, b, c] = legStates(tau, p);
    const v = ((2 * a.v - b.v - c.v) / 3) * VDC;
    van[j] = v;
    s1 += v * Math.sin(TAU * tau);
    c1 += v * Math.cos(TAU * tau);
  }
  const filtered = movingAverage(movingAverage(van, perCarrier), perCarrier);
  return { samples: n, van, filtered, fundamentalPeak: (2 / n) * Math.hypot(s1, c1) };
}

// Layout (viewBox 760 × 500)
const PX0 = 300;
const PX1 = 744;
const P1Y = 100;
const P1A = 58;
const P2Y = 262;
const P2K = 64 / ((2 / 3) * VDC); // px per volt: ±2/3·Vdc fills ±64 px
const IX0 = 76;
const IX1 = 744;
const xOf = (tau: number) => PX0 + tau * (PX1 - PX0);
const LEG_X = [96, 156, 216];

function Diode({ x, y, on }: { x: number; y: number; on: boolean }) {
  // anode below, cathode above: freewheel diodes conduct upward, from DC− towards DC+
  const color = on ? vizColors.amber : "#4b5563";
  return (
    <g>
      <polygon points={`${x - 6},${y + 5} ${x + 6},${y + 5} ${x},${y - 5}`} fill={on ? color : "none"} stroke={color} strokeWidth={1.5} />
      <line x1={x - 6} y1={y - 5} x2={x + 6} y2={y - 5} stroke={color} strokeWidth={1.5} />
    </g>
  );
}

export function ThreePhaseInverterPwm() {
  const { playing, toggle, t, reset } = useViz();
  const [m, setM] = useState(0.8);
  const [mode, setMode] = useState<PwmMode>("spwm");
  const [deadUs, setDeadUs] = useState(1);
  const [ratio, setRatio] = useState<Ratio>("15");
  const n = Number(ratio);
  const deadFrac = deadUs * 1e-6 * REAL_FSW_HZ;

  const wave = useMemo(() => {
    const params: PwmParams = { m, mode, ratio: n, deadFrac };
    const w = pwmWaveforms(params);
    const step = w.samples / 240;
    const toY = (v: number) => P2Y - v * P2K;
    const pwm: Array<[number, number]> = [[xOf(0), toY(w.van[0])]];
    for (let j = 1; j < w.samples; j++) {
      if (w.van[j] !== w.van[j - 1]) {
        const x = xOf(j / w.samples);
        pwm.push([x, toY(w.van[j - 1])], [x, toY(w.van[j])]);
      }
    }
    pwm.push([xOf(1), toY(w.van[w.samples - 1])]);
    const avg = Array.from({ length: 241 }, (_, i) => [xOf(i / 240), toY(w.filtered[Math.round(i * step) % w.samples])] as [number, number]);
    const ideal = Array.from({ length: 241 }, (_, i) => [xOf(i / 240), toY(m * (VDC / 2) * Math.sin((TAU * i) / 240))] as [number, number]);
    const refs = [0, 1, 2].map((k) =>
      polyline(Array.from({ length: 241 }, (_, i) => [xOf(i / 240), P1Y - references((TAU * i) / 240, m, mode)[k] * P1A] as [number, number])),
    );
    const carrierPath = polyline(Array.from({ length: 2 * n + 1 }, (_, i) => [xOf(i / (2 * n)), P1Y - (i % 2 === 0 ? -1 : 1) * P1A] as [number, number]));
    return { fundamental: w.fundamentalPeak, pwm: polyline(pwm), avg: polyline(avg), ideal: polyline(ideal), refs, carrierPath };
  }, [m, mode, n, deadFrac]);

  const params: PwmParams = { m, mode, ratio: n, deadFrac };
  const tau = frac(t / SECONDS_PER_CYCLE);
  const legs = legStates(tau, params);
  const period = Math.min(n - 1, Math.floor(tau * n));

  // zoom on leg A over the carrier period that contains the cursor
  const inset = useMemo(() => {
    const p: PwmParams = { m, mode, ratio: n, deadFrac };
    const W = IX1 - IX0;
    const t0 = period / n;
    const xs = (i: number) => IX0 + i;
    const carrierPts: Array<[number, number]> = [];
    const refPts: Array<[number, number]> = [];
    const hi: Array<[number, number]> = [];
    const lo: Array<[number, number]> = [];
    const gaps: Array<{ x0: number; x1: number }> = [];
    let gapStart = -1;
    for (let i = 0; i <= W; i++) {
      const tt = t0 + (i / W) / n;
      carrierPts.push([xs(i), 404 - carrier(tt, n) * 22]);
      refPts.push([xs(i), 404 - Math.max(-1.25, Math.min(1.25, references(TAU * tt, m, mode)[0])) * 22]);
      const a = legStates(tt, p)[0];
      hi.push([xs(i), a.high ? 438 : 452]);
      lo.push([xs(i), a.low ? 468 : 482]);
      const dead = !a.high && !a.low;
      if (dead && gapStart < 0) gapStart = i;
      if ((!dead || i === W) && gapStart >= 0) {
        gaps.push({ x0: xs(gapStart), x1: xs(dead ? i : i - 1) + 1 });
        gapStart = -1;
      }
    }
    return { carrier: polyline(carrierPts), ref: polyline(refPts), hi: polyline(hi), lo: polyline(lo), gaps };
  }, [m, mode, n, deadFrac, period]);

  const linearLimit = mode === "spwm" ? 1 : 2 / Math.sqrt(3);
  const overmod = m > linearLimit + 1e-9;
  const cursorX = xOf(tau);

  return (
    <VizFrame
      title="Six switches making three sine waves"
      description="A triangular carrier is compared with each phase's sine reference; the leg is high whenever its reference is above the carrier. The motor sees the average of the pulses. The zoom below shows the dead time between one switch turning off and the other turning on."
      controls={
        <>
          <Slider label="Modulation index m" value={m} min={0.1} max={1.2} step={0.01} onChange={setM} />
          <Segmented<PwmMode>
            label="Modulation"
            options={[
              { value: "spwm", label: "Sine PWM" },
              { value: "svpwm", label: "SVPWM" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Slider label="Dead time (at 10 kHz)" value={deadUs} min={0} max={4} step={0.25} unit="µs" onChange={setDeadUs} />
          <Segmented<Ratio>
            label="Carrier frequency / fundamental"
            options={[
              { value: "9", label: "9×" },
              { value: "15", label: "15×" },
              { value: "27", label: "27×" },
            ]}
            value={ratio}
            onChange={setRatio}
          />
          <PlayPause playing={playing} onToggle={toggle} onReset={reset} />
        </>
      }
      footer={`DC link ${VDC} V. A real drive runs its carrier 50-200 times faster than the fundamental (for example 10 kHz against 100 Hz); 9-27× keeps the pulses visible. The motor current lags the voltage by 30°, which decides which diode carries the current during dead time.`}
    >
      <SvgCanvas viewBox="0 0 760 500" title="Three-phase inverter: switch states, PWM carrier and references, motor phase voltage and a zoom on dead time">
        <rect x={0} y={0} width={760} height={500} fill={vizColors.bg} rx={10} />

        {/* ---------- bridge ---------- */}
        <Label x={136} y={16} size={12} color={vizColors.muted}>
          Switch states at the cursor
        </Label>
        <line x1={30} y1={40} x2={246} y2={40} stroke={vizColors.orange} strokeWidth={2.5} />
        <line x1={30} y1={232} x2={246} y2={232} stroke={vizColors.orange} strokeWidth={2.5} />
        <Label x={250} y={40} anchor="start" size={10} color={vizColors.orange}>
          DC+
        </Label>
        <Label x={250} y={232} anchor="start" size={10} color={vizColors.orange}>
          DC−
        </Label>
        {/* DC-link capacitor */}
        <line x1={30} y1={40} x2={30} y2={131} stroke={vizColors.orange} strokeWidth={2} />
        <line x1={20} y1={131} x2={40} y2={131} stroke={vizColors.orange} strokeWidth={3} />
        <line x1={20} y1={141} x2={40} y2={141} stroke={vizColors.orange} strokeWidth={3} />
        <line x1={30} y1={141} x2={30} y2={232} stroke={vizColors.orange} strokeWidth={2} />
        <Label x={30} y={248} size={10} color={vizColors.muted}>
          {`${VDC} V`}
        </Label>

        {LEG_X.map((x, k) => {
          const s = legs[k];
          const dead = !s.high && !s.low;
          const nodeColor = s.v > 0 ? vizColors.orange : "#64748b";
          return (
            <g key={x}>
              <line x1={x} y1={40} x2={x} y2={232} stroke="#4b5563" strokeWidth={2} />
              {[
                { y: 62, on: s.high, name: SWITCH_NAMES[k][0] },
                { y: 170, on: s.low, name: SWITCH_NAMES[k][1] },
              ].map((sw) => (
                <g key={sw.name}>
                  <rect
                    x={x - 16}
                    y={sw.y}
                    width={32}
                    height={40}
                    rx={5}
                    fill={sw.on ? vizColors.green : "#111827"}
                    stroke={sw.on ? vizColors.green : "#4b5563"}
                    strokeWidth={1.5}
                  />
                  <Label x={x} y={sw.y + 14} size={10} bold color={sw.on ? vizColors.bg : vizColors.muted}>
                    {sw.name}
                  </Label>
                  <Label x={x} y={sw.y + 28} size={9} color={sw.on ? vizColors.bg : vizColors.muted}>
                    {sw.on ? "ON" : "off"}
                  </Label>
                </g>
              ))}
              <Diode x={x + 25} y={82} on={dead && !s.currentOut} />
              <Diode x={x + 25} y={190} on={dead && s.currentOut} />
              <circle cx={x} cy={136} r={5} fill={nodeColor} />
              <line x1={x} y1={136} x2={x + 20} y2={136} stroke={PHASE_COLORS[k]} strokeWidth={2} />
              <Label x={x + 28} y={136} size={11} bold color={PHASE_COLORS[k]}>
                {LEG_NAMES[k]}
              </Label>
              <Label x={x} y={152} size={10} mono color={nodeColor}>
                {s.v > 0 ? "+" : "−"}
              </Label>
              {dead && (
                <Label x={x} y={118} size={9} color={vizColors.amber}>
                  dead
                </Label>
              )}
            </g>
          );
        })}
        <Label x={16} y={266} anchor="start" size={10} color={vizColors.muted}>
          Green: switch on.
        </Label>
        <Label x={16} y={280} anchor="start" size={10} color={vizColors.muted}>
          Amber diode: carries the current in dead time.
        </Label>

        {/* ---------- plot 1: carrier vs references ---------- */}
        <Label x={PX0} y={16} anchor="start" size={12} color={vizColors.muted}>
          Carrier (grey) vs phase references
        </Label>
        <rect x={xOf(period / n)} y={P1Y - 70} width={(PX1 - PX0) / n} height={140} fill={vizColors.violet} opacity={0.1} />
        {[1, -1].map((lv) => (
          <line key={lv} x1={PX0} y1={P1Y - lv * P1A} x2={PX1} y2={P1Y - lv * P1A} stroke={vizColors.grid} strokeDasharray="3 4" />
        ))}
        <path d={wave.carrierPath} fill="none" stroke={vizColors.muted} strokeWidth={1} opacity={0.8} />
        {wave.refs.map((d, k) => (
          <path key={k} d={d} fill="none" stroke={PHASE_COLORS[k]} strokeWidth={k === 0 ? 2.5 : 1.5} opacity={k === 0 ? 1 : 0.6} />
        ))}
        <Label x={PX0 - 6} y={P1Y - P1A} anchor="end" size={10} color={vizColors.muted}>
          +1
        </Label>
        <Label x={PX0 - 6} y={P1Y + P1A} anchor="end" size={10} color={vizColors.muted}>
          −1
        </Label>

        {/* ---------- plot 2: motor phase voltage ---------- */}
        <Label x={PX0} y={186} anchor="start" size={12} color={vizColors.muted}>
          Phase A voltage at the motor: pulses and their average
        </Label>
        <line x1={PX0} y1={P2Y} x2={PX1} y2={P2Y} stroke={vizColors.grid} />
        {[200, -200].map((v) => (
          <g key={v}>
            <line x1={PX0} y1={P2Y - v * P2K} x2={PX1} y2={P2Y - v * P2K} stroke={vizColors.grid} strokeDasharray="3 4" />
            <Label x={PX0 - 6} y={P2Y - v * P2K} anchor="end" size={10} color={vizColors.muted}>
              {`${v > 0 ? "+" : "−"}200 V`}
            </Label>
          </g>
        ))}
        <path d={wave.pwm} fill="none" stroke={vizColors.muted} strokeWidth={0.8} opacity={0.7} />
        <path d={wave.ideal} fill="none" stroke={vizColors.text} strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
        <path d={wave.avg} fill="none" stroke={vizColors.red} strokeWidth={2.5} />

        {/* cursor */}
        <line x1={cursorX} y1={P1Y - 72} x2={cursorX} y2={P2Y + 70} stroke={vizColors.violet} strokeWidth={1.5} />

        {/* ---------- zoom: one carrier period of leg A ---------- */}
        <Label x={16} y={360} anchor="start" size={12} color={vizColors.muted}>
          {`Leg A over one carrier period (shaded above). Dead time ${deadUs} µs = ${(deadFrac * 100).toFixed(1)}% of the period.`}
        </Label>
        {inset.gaps.map((g) => (
          <rect key={g.x0} x={g.x0} y={430} width={Math.max(1.5, g.x1 - g.x0)} height={58} fill={vizColors.red} opacity={0.45} />
        ))}
        <path d={inset.carrier} fill="none" stroke={vizColors.muted} strokeWidth={1.2} />
        <path d={inset.ref} fill="none" stroke={vizColors.red} strokeWidth={2} />
        <path d={inset.hi} fill="none" stroke={vizColors.green} strokeWidth={2} />
        <path d={inset.lo} fill="none" stroke={vizColors.cyan} strokeWidth={2} />
        <Label x={IX0 - 8} y={404} anchor="end" size={10} color={vizColors.muted}>
          carrier
        </Label>
        <Label x={IX0 - 8} y={445} anchor="end" size={10} color={vizColors.green}>
          S1 gate
        </Label>
        <Label x={IX0 - 8} y={475} anchor="end" size={10} color={vizColors.cyan}>
          S4 gate
        </Label>
        {inset.gaps.length > 0 && (
          <Label x={Math.min(IX1 - 40, inset.gaps[0].x1 + 6)} y={494} anchor="start" size={10} color={vizColors.red}>
            both off: dead time
          </Label>
        )}
      </SvgCanvas>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted">Fundamental, phase peak</dt>
          <dd className="font-mono">{`${wave.fundamental.toFixed(0)} V`}</dd>
        </div>
        <div>
          <dt className="text-muted">Line-to-line RMS</dt>
          <dd className="font-mono">{`${((wave.fundamental * Math.sqrt(3)) / Math.SQRT2).toFixed(0)} V`}</dd>
        </div>
        <div>
          <dt className="text-muted">Linear range</dt>
          <dd className="font-mono">{mode === "spwm" ? "m ≤ 1.00 (200 V)" : "m ≤ 1.155 (231 V)"}</dd>
        </div>
        <div>
          <dt className="text-muted">Dead-time voltage error</dt>
          <dd className="font-mono">{`${(deadFrac * VDC).toFixed(1)} V per leg`}</dd>
        </div>
      </dl>
      <p className="mt-2 text-sm text-muted">
        {overmod
          ? "Overmodulating: the reference is taller than the carrier, so pulses drop out and the output is no longer a clean sine."
          : `Linear: the average follows the dashed command, ${(m * (VDC / 2)).toFixed(0)} V peak, minus the small dead-time loss.`}
      </p>
    </VizFrame>
  );
}
