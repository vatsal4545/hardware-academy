"use client";

import { useMemo, useState } from "react";
import { PlayPause, Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, makeScale, polyline, useAnimationFrame, usePrefersReducedMotion, vizColors } from "@/components/viz/shared";
import {
  CURVE_PACK,
  chargePoint,
  isComplete,
  minutesBetween,
  socRate,
  type ChargeLimit,
  type ChargePoint,
} from "@/components/viz/ev/ChargingCurve.model";

const START_SOC = 0.1;
const PRECONDITION_C = 40;

type Charger = "50" | "150" | "250";
type Speed = "1" | "5";

const limitColor: Record<ChargeLimit, string> = {
  charger: vizColors.cyan,
  bms: vizColors.amber,
  voltage: vizColors.violet,
};

const limitText: Record<ChargeLimit, string> = {
  charger: "the charger's power limit",
  bms: "the BMS current map (temperature and state of charge)",
  voltage: "the 4.2 V per-cell ceiling (constant-voltage phase)",
};

interface Sim {
  soc: number;
  /** simulated seconds since the session started */
  elapsed: number;
}

const START: Sim = { soc: START_SOC, elapsed: 0 };

/** Integrate the session forward by `seconds` of simulated time. */
function advance(sim: Sim, seconds: number, tempC: number, chargerKw: number): Sim {
  let { soc, elapsed } = sim;
  let left = seconds;
  while (left > 1e-9 && !isComplete(soc, tempC, chargerKw)) {
    const h = Math.min(left, 5);
    soc = Math.min(1, soc + socRate(soc, tempC, chargerKw) * h);
    elapsed += h;
    left -= h;
  }
  return { soc, elapsed };
}

const X0 = 64;
const X1 = 700;
const xOf = makeScale([0, 1], [X0, X1]);

type Key = "powerKw" | "currentA" | "voltageV";

interface Panel {
  key: Key;
  title: string;
  top: number;
  bottom: number;
  domain: [number, number];
  ticks: number[];
}

const PANELS: Panel[] = [
  { key: "powerKw", title: "Power, kW", top: 16, bottom: 116, domain: [0, 320], ticks: [0, 100, 200, 300] },
  { key: "currentA", title: "Current, A", top: 136, bottom: 236, domain: [0, 900], ticks: [0, 300, 600, 900] },
  { key: "voltageV", title: "Pack voltage, V", top: 256, bottom: 346, domain: [280, 432], ticks: [300, 350, 400] },
];

function yScale(p: Panel): (v: number) => number {
  const s = makeScale(p.domain, [p.bottom, p.top]);
  return (v) => Math.max(p.top, Math.min(p.bottom, s(v)));
}

/** Split a sampled curve into runs that share the same limiting factor, so each run gets its colour. */
function runs(points: ChargePoint[], key: Key, y: (v: number) => number): Array<{ limit: ChargeLimit; d: string }> {
  const out: Array<{ limit: ChargeLimit; d: string }> = [];
  let run: Array<[number, number]> = [];
  let limit = points[0].limit;
  points.forEach((p, i) => {
    const xy: [number, number] = [xOf(p.soc), y(p[key])];
    if (p.limit !== limit) {
      run.push(xy);
      out.push({ limit, d: polyline(run) });
      run = [xy];
      limit = p.limit;
    } else {
      run.push(xy);
    }
    if (i === points.length - 1) out.push({ limit, d: polyline(run) });
  });
  return out;
}

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

export function ChargingCurve() {
  const reduced = usePrefersReducedMotion();
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const [sim, setSim] = useState<Sim>(START);
  const [temp, setTemp] = useState(25);
  const [precondition, setPrecondition] = useState(false);
  const [charger, setCharger] = useState<Charger>("250");
  const [speed, setSpeed] = useState<Speed>("1");

  const tempC = precondition ? PRECONDITION_C : temp;
  const chargerKw = Number(charger);
  const done = isComplete(sim.soc, tempC, chargerKw);
  const playing = (userPlaying ?? !reduced) && !done;

  // 1 real second = 1 or 5 simulated minutes
  useAnimationFrame((dt) => setSim((s) => advance(s, dt * 60 * Number(speed), tempC, chargerKw)), playing);

  const curve = useMemo(() => Array.from({ length: 201 }, (_, i) => chargePoint(i / 200, tempC, chargerKw)), [tempC, chargerKw]);
  const tenTo80 = useMemo(() => minutesBetween(0.1, 0.8, tempC, chargerKw), [tempC, chargerKw]);
  const now = chargePoint(sim.soc, tempC, chargerKw);
  const x = xOf(sim.soc);
  const addedKWh = Math.max(0, sim.soc - START_SOC) * CURVE_PACK.energyKWh;

  const stats: Array<{ label: string; value: string }> = [
    { label: "State of charge", value: `${(sim.soc * 100).toFixed(0)} %` },
    { label: "Power", value: `${now.powerKw.toFixed(0)} kW` },
    { label: "Current", value: `${now.currentA.toFixed(0)} A` },
    { label: "Pack voltage", value: `${now.voltageV.toFixed(0)} V` },
    { label: "C-rate", value: `${now.cRate.toFixed(2)}C` },
    { label: "Elapsed", value: clock(sim.elapsed) },
  ];

  return (
    <VizFrame
      title="DC fast-charging curve"
      description={`A 96s46p pack of 2170 cells (${CURVE_PACK.energyKWh.toFixed(1)} kWh) charging from 10 %. The colour shows which limit sets the current at each moment. Cool the pack, then precondition it, and compare the 10-80 % time.`}
      controls={
        <>
          <PlayPause
            playing={playing}
            onToggle={() => {
              if (done) {
                setSim(START);
                setUserPlaying(true);
              } else {
                setUserPlaying(!playing);
              }
            }}
            onReset={() => setSim(START)}
          />
          <Slider
            label="Pack temperature"
            value={temp}
            min={-10}
            max={50}
            step={1}
            onChange={setTemp}
            format={(v) => (precondition ? `${v} °C → ${PRECONDITION_C} °C` : `${v} °C`)}
          />
          <Toggle label={`Precondition pack to ${PRECONDITION_C} °C`} checked={precondition} onChange={setPrecondition} />
          <Segmented
            label="Charger"
            options={[
              { value: "50", label: "50 kW" },
              { value: "150", label: "150 kW" },
              { value: "250", label: "250 kW" },
            ]}
            value={charger}
            onChange={setCharger}
          />
          <Segmented
            label="Playback"
            options={[
              { value: "1", label: "1 s = 1 min" },
              { value: "5", label: "1 s = 5 min" },
            ]}
            value={speed}
            onChange={setSpeed}
          />
        </>
      }
      footer={
        <span>
          Teaching model: open-circuit voltage plus resistance per cell, an illustrative BMS map and a constant pack temperature. Real packs warm up
          while they charge, and every manufacturer&apos;s map is different.
        </span>
      }
    >
      <SvgCanvas viewBox="0 0 720 390" title={`Charging power, current and voltage against state of charge at ${tempC} °C on a ${chargerKw} kW charger`}>
        <rect x={0} y={0} width={720} height={390} rx={8} fill={vizColors.bg} />
        <rect x={xOf(0.1)} y={16} width={xOf(0.8) - xOf(0.1)} height={330} fill={vizColors.green} opacity={0.05} />
        {PANELS.map((p) => {
          const y = yScale(p);
          return (
            <g key={p.key}>
              <rect x={X0} y={p.top} width={X1 - X0} height={p.bottom - p.top} fill="#0e1422" stroke={vizColors.grid} />
              {p.ticks.map((t) => (
                <g key={t}>
                  <line x1={X0} x2={X1} y1={y(t)} y2={y(t)} stroke={vizColors.grid} strokeDasharray="2 4" />
                  <Label x={X0 - 8} y={y(t)} anchor="end" size={10} mono color={vizColors.muted}>
                    {t}
                  </Label>
                </g>
              ))}
              <Label x={X0 + 8} y={p.top + 11} anchor="start" size={11} color={vizColors.muted}>
                {p.title}
              </Label>
              {runs(curve, p.key, y).map((r, i) => (
                <path key={i} d={r.d} fill="none" stroke={limitColor[r.limit]} strokeWidth={2.5} strokeLinejoin="round" />
              ))}
              <circle cx={x} cy={y(now[p.key])} r={5} fill={limitColor[now.limit]} stroke={vizColors.bg} strokeWidth={2} />
            </g>
          );
        })}
        <line
          x1={X0}
          x2={X1}
          y1={yScale(PANELS[0])(chargerKw)}
          y2={yScale(PANELS[0])(chargerKw)}
          stroke={vizColors.cyan}
          strokeDasharray="6 4"
          opacity={0.6}
        />
        <Label x={X1 - 6} y={yScale(PANELS[0])(chargerKw) - 8} anchor="end" size={10} color={vizColors.cyan}>
          {`charger limit ${chargerKw} kW`}
        </Label>
        <line
          x1={X0}
          x2={X1}
          y1={yScale(PANELS[2])(CURVE_PACK.series * CURVE_PACK.cellMaxV)}
          y2={yScale(PANELS[2])(CURVE_PACK.series * CURVE_PACK.cellMaxV)}
          stroke={vizColors.violet}
          strokeDasharray="6 4"
          opacity={0.7}
        />
        <Label x={X0 + 140} y={yScale(PANELS[2])(CURVE_PACK.series * CURVE_PACK.cellMaxV) + 10} anchor="start" size={10} color={vizColors.violet}>
          96 × 4.2 V = 403 V ceiling
        </Label>
        <line x1={x} x2={x} y1={16} y2={346} stroke={vizColors.text} strokeWidth={1} opacity={0.5} />
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((s) => (
          <Label key={s} x={xOf(s)} y={362} size={10} mono color={vizColors.muted}>
            {`${s * 100}%`}
          </Label>
        ))}
        <Label x={(xOf(0.1) + xOf(0.8)) / 2} y={379} size={11} color={vizColors.green}>
          {Number.isFinite(tenTo80) ? `state of charge · 10-80 % takes about ${Math.round(tenTo80)} min here` : "state of charge"}
        </Label>
      </SvgCanvas>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted" aria-label="Legend">
        {(Object.keys(limitColor) as ChargeLimit[]).map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-1 w-5 rounded" style={{ background: limitColor[k] }} />
            {k === "charger" ? "Charger power limit" : k === "bms" ? "BMS current map" : "Constant voltage (4.2 V per cell)"}
          </li>
        ))}
      </ul>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-md border border-border bg-bg px-3 py-2">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="font-mono text-sm text-text">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-muted">
        {done
          ? `Charge complete: in the constant-voltage phase the current fell below C/20. About ${addedKWh.toFixed(1)} kWh added in ${clock(sim.elapsed)}.`
          : `Now limited by ${limitText[now.limit]}. About ${addedKWh.toFixed(1)} kWh added so far.`}
      </p>
    </VizFrame>
  );
}
