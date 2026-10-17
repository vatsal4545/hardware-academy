"use client";

import { useId, useMemo, useState } from "react";
import { PlayPause, Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, makeScale, polyline, useViz, vizColors } from "@/components/viz/shared";

/* ---------- physical model (SI units internally, ns / mA / V on screen) ---------- */

const V0 = 3.3; // rail voltage, V
const WINDOW_NS = 200;
const SAMPLE_NS = 0.5;
const DT = 0.02e-9; // integration step, 20 ps
const SOURCE_RES = 0.15; // ohm: regulator output plus copper
const SOURCE_IND = 25e-9; // H: roughly 25 mm of thin trace back to the regulator
const PKG_IND = 2e-9; // H: bond wire plus package lead
const DIE_CAP = 5e-9; // F: on-die and in-package capacitance
const DIE_ESR = 0.5; // ohm: on-die grid resistance, damps the ringing
const CAP_ESR = 0.03; // ohm
const BASE_A = 0.02; // A: idle current
const PERIOD_NS = 80;
const EDGE_NS = 3;
const START_NS = 15;

/** Trapezoidal burst train: idle current plus `stepA` for half of each period. */
function loadCurrent(tNs: number, stepA: number): number {
  if (tNs < START_NS) return BASE_A;
  const x = (tNs - START_NS) % PERIOD_NS;
  const high = PERIOD_NS / 2;
  let f = 0;
  if (x < EDGE_NS) f = x / EDGE_NS;
  else if (x < high) f = 1;
  else if (x < high + EDGE_NS) f = 1 - (x - high) / EDGE_NS;
  return BASE_A + stepA * f;
}

/** Equivalent series inductance of the capacitor body: bigger packages are worse. */
function capEsl(capF: number): number {
  if (capF <= 10e-9) return 0.4e-9;
  if (capF <= 100e-9) return 0.5e-9;
  return 0.8e-9;
}

interface SimResult {
  t: number[];
  i: number[];
  bare: number[];
  dec: number[];
}

/** Semi-implicit Euler on two small circuits: regulator -> die, and regulator -> capacitor -> die. */
function simulate(stepA: number, loopH: number, capF: number): SimResult {
  const n = Math.round((WINDOW_NS * 1e-9) / DT);
  const every = Math.round((SAMPLE_NS * 1e-9) / DT);
  const t: number[] = [];
  const iOut: number[] = [];
  const bare: number[] = [];
  const dec: number[] = [];

  // Without a local capacitor: the die pulls current through the whole path back to the regulator.
  {
    const la = SOURCE_IND + PKG_IND;
    let il = BASE_A;
    let vd = V0 - SOURCE_RES * BASE_A;
    for (let k = 0; k <= n; k++) {
      const load = loadCurrent(k * DT * 1e9, stepA);
      const vdie = vd + DIE_ESR * (il - load);
      if (k % every === 0) {
        t.push(k * DT * 1e9);
        iOut.push(load);
        bare.push(vdie);
      }
      il += (DT / la) * (V0 - SOURCE_RES * il - vdie);
      vd += (DT / DIE_CAP) * (il - load);
    }
  }

  // With a capacitor `loopH` away from the pin (plus its own ESL).
  {
    const lc = loopH + capEsl(capF) + PKG_IND;
    let is = BASE_A;
    let ic = BASE_A;
    let vc = V0 - SOURCE_RES * BASE_A;
    let vd = vc;
    for (let k = 0; k <= n; k++) {
      const load = loadCurrent(k * DT * 1e9, stepA);
      const vx = vc + CAP_ESR * (is - ic);
      const vdie = vd + DIE_ESR * (ic - load);
      if (k % every === 0) dec.push(vdie);
      is += (DT / SOURCE_IND) * (V0 - SOURCE_RES * is - vx);
      ic += (DT / lc) * (vx - vdie);
      vc += (DT / capF) * (is - ic);
      vd += (DT / DIE_CAP) * (ic - load);
    }
  }
  return { t, i: iOut, bare, dec };
}

function metrics(v: number[]): { min: number; max: number; pp: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const x of v) {
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return { min, max, pp: (max - min) * 1000 };
}

/* ---------- drawing ---------- */

const X0 = 64;
const X1 = 624;
const I_TOP = 28;
const I_BOT = 108;
const V_TOP = 158;
const V_BOT = 338;
const xs = makeScale([0, WINDOW_NS], [X0, X1]);
const yi = makeScale([0, 160], [I_BOT, I_TOP]);
const yv = makeScale([2.5, 4.0], [V_BOT, V_TOP]);

type CapChoice = "10" | "100" | "1000";

function verdict(m: { min: number; pp: number }): { text: string; ok: boolean } {
  if (m.min < 3.0) return { text: "dips below the 3.0 V minimum: brown-out risk", ok: false };
  if (m.pp > 165) return { text: "outside a 5 % (165 mV) ripple budget", ok: false };
  return { text: "inside a 5 % (165 mV) ripple budget", ok: true };
}

export function DecouplingDemo() {
  const [capOn, setCapOn] = useState(true);
  const [loopNh, setLoopNh] = useState(4);
  const [capNf, setCapNf] = useState<CapChoice>("100");
  const [stepMa, setStepMa] = useState(80);
  const viz = useViz(true);
  const uid = useId().replace(/:/g, "");

  const sim = useMemo(() => simulate(stepMa / 1000, loopNh * 1e-9, Number(capNf) * 1e-9), [stepMa, loopNh, capNf]);
  const paths = useMemo(
    () => ({
      i: polyline(sim.t.map((t, k): [number, number] => [xs(t), yi(sim.i[k] * 1000)])),
      bare: polyline(sim.t.map((t, k): [number, number] => [xs(t), yv(sim.bare[k])])),
      dec: polyline(sim.t.map((t, k): [number, number] => [xs(t), yv(sim.dec[k])])),
    }),
    [sim],
  );
  const mBare = useMemo(() => metrics(sim.bare), [sim]);
  const mDec = useMemo(() => metrics(sim.dec), [sim]);
  const vBare = verdict(mBare);
  const vDec = verdict(mDec);

  const cursorNs = (viz.t * 40) % WINDOW_NS;
  const idx = Math.min(sim.t.length - 1, Math.round(cursorNs / SAMPLE_NS));
  const cx = xs(cursorNs);
  const capLabel = capNf === "1000" ? "1 µF" : `${capNf} nF`;

  return (
    <VizFrame
      title="Decoupling demo: why the capacitor has to be close"
      description="An MCU draws current in nanosecond bursts. The loop inductance between the supply and the pin turns each burst into a voltage spike. Move the capacitor away and watch its benefit disappear."
      controls={
        <>
          <Toggle label="Fit a decoupling capacitor" checked={capOn} onChange={setCapOn} />
          <Slider
            label="Loop inductance, capacitor to pin"
            value={loopNh}
            min={0.5}
            max={20}
            step={0.5}
            onChange={setLoopNh}
            format={(v) => `${v.toFixed(1)} nH`}
          />
          <Slider label="MCU current step" value={stepMa} min={20} max={120} step={5} unit="mA" onChange={setStepMa} />
          <Segmented<CapChoice>
            label="Capacitor value"
            options={[
              { value: "10", label: "10 nF" },
              { value: "100", label: "100 nF" },
              { value: "1000", label: "1 µF" },
            ]}
            value={capNf}
            onChange={setCapNf}
          />
          <PlayPause playing={viz.playing} onToggle={viz.toggle} onReset={viz.reset} />
        </>
      }
      footer={
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-bg/60 p-3">
              <p className="font-mono text-xs tracking-wide text-red-300">No local capacitor (25 nH to the regulator)</p>
              <p className="mt-1 text-text" data-testid="bare-readout">
                min {mBare.min.toFixed(2)} V, {mBare.pp.toFixed(0)} mV peak to peak
              </p>
              <p className={vBare.ok ? "text-green-300" : "text-red-300"}>{vBare.text}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg/60 p-3">
              <p className="font-mono text-xs tracking-wide text-green-300">
                {capOn ? `${capLabel} capacitor, ${loopNh.toFixed(1)} nH loop` : "Capacitor not fitted"}
              </p>
              {capOn ? (
                <>
                  <p className="mt-1 text-text" data-testid="decoupled-readout">
                    min {mDec.min.toFixed(2)} V, {mDec.pp.toFixed(0)} mV peak to peak
                  </p>
                  <p className={vDec.ok ? "text-green-300" : "text-red-300"}>{vDec.text}</p>
                </>
              ) : (
                <p className="mt-1 text-muted">Switch the capacitor on to compare.</p>
              )}
            </div>
          </div>
          <p className="font-mono text-xs">
            Scope cursor {cursorNs.toFixed(1)} ns: load {(sim.i[idx] * 1000).toFixed(0)} mA, no cap {sim.bare[idx].toFixed(2)} V
            {capOn ? `, with cap ${sim.dec[idx].toFixed(2)} V` : ""}
          </p>
          <p>
            Rule of thumb: about 1 nH per millimetre of thin trace and about 1 nH per via. The ringing is the loop inductance resonating with the
            chip&apos;s own 5 nF of on-die capacitance.
          </p>
        </div>
      }
    >
      <SvgCanvas viewBox="0 0 640 372" title="Load current bursts and the resulting rail voltage with and without a decoupling capacitor">
        <defs>
          <clipPath id={`${uid}-clip`}>
            <rect x={X0} y={V_TOP} width={X1 - X0} height={V_BOT - V_TOP} />
          </clipPath>
        </defs>
        <rect x="0" y="0" width="640" height="372" rx="8" fill={vizColors.bg} />

        {/* current plot */}
        <Label x={X0} y={14} anchor="start" size={12} color={vizColors.amber} bold>
          MCU load current
        </Label>
        {[0, 80, 160].map((v) => (
          <g key={`gi${v}`}>
            <line x1={X0} x2={X1} y1={yi(v)} y2={yi(v)} stroke={vizColors.grid} />
            <Label x={X0 - 8} y={yi(v)} anchor="end" size={11} color={vizColors.muted}>
              {v}
            </Label>
          </g>
        ))}
        <Label x={X0 - 8} y={I_TOP - 12} anchor="end" size={11} color={vizColors.muted}>
          mA
        </Label>
        <path d={paths.i} fill="none" stroke={vizColors.amber} strokeWidth={2} />

        {/* voltage plot */}
        <Label x={X0} y={V_TOP - 14} anchor="start" size={12} color={vizColors.text} bold>
          Rail voltage at the MCU pin
        </Label>
        <rect x={X0} y={yv(3.6)} width={X1 - X0} height={yv(3.0) - yv(3.6)} fill={vizColors.green} opacity={0.1} />
        {[2.5, 3.0, 3.5, 4.0].map((v) => (
          <g key={`gv${v}`}>
            <line x1={X0} x2={X1} y1={yv(v)} y2={yv(v)} stroke={vizColors.grid} />
            <Label x={X0 - 8} y={yv(v)} anchor="end" size={11} color={vizColors.muted}>
              {v.toFixed(1)}
            </Label>
          </g>
        ))}
        <Label x={X0 - 8} y={V_TOP - 14} anchor="end" size={11} color={vizColors.muted}>
          V
        </Label>
        <line x1={X0} x2={X1} y1={yv(V0)} y2={yv(V0)} stroke={vizColors.muted} strokeDasharray="5 5" />
        <line x1={X0} x2={X1} y1={yv(3.0)} y2={yv(3.0)} stroke={vizColors.red} strokeDasharray="3 4" opacity={0.7} />
        <Label x={X0 + 6} y={yv(3.0) + 11} anchor="start" size={11} color={vizColors.red}>
          3.0 V minimum supply (ESP32)
        </Label>
        <g clipPath={`url(#${uid}-clip)`}>
          <path d={paths.bare} fill="none" stroke={vizColors.red} strokeWidth={1.8} />
          {capOn && <path d={paths.dec} fill="none" stroke={vizColors.green} strokeWidth={2} />}
        </g>

        {/* time axis */}
        {[0, 50, 100, 150, 200].map((v) => (
          <Label key={`tx${v}`} x={xs(v)} y={V_BOT + 14} size={11} color={vizColors.muted}>
            {v}
          </Label>
        ))}
        <Label x={X1} y={V_BOT + 30} anchor="end" size={11} color={vizColors.muted}>
          time, ns
        </Label>

        {/* scope cursor */}
        <line x1={cx} x2={cx} y1={I_TOP - 4} y2={V_BOT} stroke={vizColors.muted} strokeDasharray="2 4" />
        <circle cx={cx} cy={yv(sim.bare[idx])} r={3.5} fill={vizColors.red} />
        {capOn && <circle cx={cx} cy={yv(sim.dec[idx])} r={3.5} fill={vizColors.green} />}

        {/* legend */}
        <g transform={`translate(${X0 + 8}, ${V_BOT - 30})`}>
          <line x1={0} x2={22} y1={0} y2={0} stroke={vizColors.red} strokeWidth={2} />
          <Label x={28} y={0} anchor="start" size={11} color={vizColors.red}>
            no local capacitor
          </Label>
          {capOn && (
            <>
              <line x1={150} x2={172} y1={0} y2={0} stroke={vizColors.green} strokeWidth={2} />
              <Label x={178} y={0} anchor="start" size={11} color={vizColors.green}>
                with {capLabel}
              </Label>
            </>
          )}
        </g>
      </SvgCanvas>
    </VizFrame>
  );
}
