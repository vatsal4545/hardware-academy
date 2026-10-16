"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, makeScale, polyline, vizColors } from "@/components/viz/shared";
import { simulatePid, type SimulatePidResult } from "@/lib/sim/pid";

/** Wheel speed as a fraction of top speed: a first-order plant with unit gain and τ = 0.3 s. */
export const TUNER_PLANT = { gain: 1, tau: 0.3 };
export const TUNER_SETPOINT = 0.5;
export const TUNER_SECONDS = 4;
export const BUMP_AT = 2.5;
export const BUMP = -0.3;

type Rate = "100" | "50" | "20" | "10";

export interface TunerRun {
  result: SimulatePidResult;
  dt: number;
}

export function runTuner(kp: number, ki: number, kd: number, hz: number, bump: boolean): TunerRun {
  const dt = 1 / hz;
  const result = simulatePid({
    params: { kp, ki, kd, outMin: -1, outMax: 1 },
    setpoint: TUNER_SETPOINT,
    seconds: TUNER_SECONDS,
    dt,
    plant: TUNER_PLANT,
    disturbanceAt: bump ? BUMP_AT : undefined,
    disturbance: bump ? BUMP : undefined,
  });
  return { result, dt };
}

/** Seconds after the bump until the response stays within ±2% again (null if it never does). */
function recoveryTime(r: SimulatePidResult): number | null {
  const band = 0.02 * TUNER_SETPOINT;
  let last = -1;
  for (let i = 0; i < r.y.length; i++) if (r.t[i] >= BUMP_AT && Math.abs(r.y[i] - TUNER_SETPOINT) > band) last = i;
  if (last < 0) return 0;
  return last < r.y.length - 1 ? r.t[last + 1] - BUMP_AT : null;
}

const PRESETS: Array<{ label: string; kp: number; ki: number; kd: number; rate: Rate }> = [
  { label: "P only", kp: 2, ki: 0, kd: 0, rate: "100" },
  { label: "PI, tuned", kp: 2, ki: 8, kd: 0, rate: "100" },
  { label: "Too much I", kp: 1, ki: 20, kd: 0, rate: "100" },
  { label: "Slow loop, high gain", kp: 10, ki: 10, kd: 0, rate: "10" },
];

const VB_W = 720;
const PX0 = 64;
const PX1 = 700;
const Y_TOP = 22;
const Y_BOT = 214;
const U_TOP = 262;
const U_BOT = 346;

const pct = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(Math.round(v * 100))}%`;
/** One decimal, without printing "-0.0". */
const fixed1 = (v: number) => (Math.abs(v) < 0.05 ? "0.0" : v.toFixed(1));
const btn =
  "rounded-md border border-border bg-surface px-3 py-1 text-sm text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

export function PidTuner() {
  const [kp, setKp] = useState(2);
  const [ki, setKi] = useState(0);
  const [kd, setKd] = useState(0);
  const [rate, setRate] = useState<Rate>("100");
  const [bump, setBump] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const hz = Number(rate);
  const step = runTuner(kp, ki, kd, hz, false).result;
  const shown = bump ? runTuner(kp, ki, kd, hz, true).result : step;
  const rec = bump ? recoveryTime(shown) : null;

  const yMax = Math.max(0.8, Math.ceil(Math.max(...shown.y) * 10) / 10);
  const yMin = Math.min(0, Math.floor(Math.min(...shown.y) * 10) / 10);
  const sx = makeScale([0, TUNER_SECONDS], [PX0, PX1]);
  const sy = makeScale([yMin, yMax], [Y_BOT, Y_TOP]);
  const su = makeScale([-1, 1], [U_BOT, U_TOP]);

  const yPts = shown.t.map((t, i): [number, number] => [sx(t), sy(shown.y[i])]);
  // The controller holds its output for a whole period (zero-order hold), so draw u as steps.
  const uPts = shown.t.flatMap((t, i): Array<[number, number]> => {
    const next = i + 1 < shown.t.length ? shown.t[i + 1] : t;
    return [
      [sx(t), su(shown.u[i])],
      [sx(next), su(shown.u[i])],
    ];
  });
  const peakIdx = step.y.indexOf(Math.max(...step.y));
  const yTicks = Array.from({ length: Math.round((yMax - yMin) / 0.2) + 1 }, (_, i) => yMin + i * 0.2);

  const n = shown.t.length;
  const hi = hover === null ? null : Math.max(0, Math.min(n - 1, hover));
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width <= 0) return;
    const vx = ((e.clientX - r.left) / r.width) * VB_W;
    const t = ((vx - PX0) / (PX1 - PX0)) * TUNER_SECONDS;
    setHover(t < 0 || t > TUNER_SECONDS ? null : Math.round(t * hz));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const jump = Math.max(1, Math.round(hz / 20));
    setHover((h) => Math.max(0, Math.min(n - 1, (h ?? 0) + (e.key === "ArrowRight" ? jump : -jump))));
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setKp(p.kp);
    setKi(p.ki);
    setKd(p.kd);
    setRate(p.rate);
  };

  const tipX = hi === null ? 0 : Math.min(sx(shown.t[hi]) + 8, PX1 - 150);

  return (
    <VizFrame
      title="PID tuner: wheel-speed step response"
      description="The plant is the course robot's wheel speed, modelled as first order (τ = 0.3 s), asked to go from 0 to 50% of top speed. The controller is simulatePid: output clamped to ±100% duty, anti-windup, derivative on measurement."
      controls={
        <>
          <Slider label="Kp (proportional)" value={kp} min={0} max={20} step={0.1} onChange={setKp} format={(v) => v.toFixed(1)} />
          <Slider label="Ki (integral, per s)" value={ki} min={0} max={40} step={0.5} onChange={setKi} format={(v) => v.toFixed(1)} />
          <Slider label="Kd (derivative, s)" value={kd} min={0} max={0.5} step={0.01} onChange={setKd} format={(v) => v.toFixed(2)} />
          <Segmented
            label="Loop rate"
            options={[
              { value: "100", label: "100 Hz" },
              { value: "50", label: "50 Hz" },
              { value: "20", label: "20 Hz" },
              { value: "10", label: "10 Hz" },
            ]}
            value={rate}
            onChange={setRate}
          />
          <div className="text-sm">
            <span className="mb-1 block text-muted">Disturbance</span>
            <button type="button" className={btn} aria-pressed={bump} onClick={() => setBump((b) => !b)}>
              {bump ? "Remove load bump" : "Add load bump at 2.5 s"}
            </button>
          </div>
          <div className="text-sm">
            <span className="mb-1 block text-muted">Presets</span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button key={p.label} type="button" className={btn} onClick={() => applyPreset(p)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </>
      }
      footer={
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide">Overshoot</dt>
            <dd className="font-mono text-text" data-testid="pid-overshoot">
              {step.overshootPct.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Settling time (±2%)</dt>
            <dd className="font-mono text-text" data-testid="pid-settling">
              {step.settlingTime === null ? "never settles" : `${step.settlingTime.toFixed(2)} s`}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Steady-state error</dt>
            <dd className="font-mono text-text" data-testid="pid-sse">
              {fixed1((step.steadyStateError / TUNER_SETPOINT) * 100)}% of setpoint
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">After the load bump</dt>
            <dd className="font-mono text-text">
              {!bump
                ? "add the bump to test"
                : rec === null
                  ? `offset ${fixed1((shown.steadyStateError / TUNER_SETPOINT) * 100)}%, never recovers`
                  : `back within 2% in ${rec.toFixed(2)} s`}
            </dd>
          </div>
        </dl>
      }
    >
      <SvgCanvas
        viewBox={`0 0 ${VB_W} 372`}
        title="Wheel speed and controller output over four seconds after a step in setpoint"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        tabIndex={0}
        className="focus-visible:outline-2 focus-visible:outline-cyan-400"
      >
        {/* speed plot */}
        {yTicks.map((v) => (
          <g key={v.toFixed(2)}>
            <line x1={PX0} x2={PX1} y1={sy(v)} y2={sy(v)} stroke={vizColors.grid} strokeWidth={1} />
            <Label x={PX0 - 8} y={sy(v)} size={10} anchor="end" color={vizColors.muted}>
              {pct(v)}
            </Label>
          </g>
        ))}
        <Label x={PX0} y={10} size={11} anchor="start" color={vizColors.muted}>
          wheel speed, % of top speed
        </Label>
        <line x1={PX1 - 166} x2={PX1 - 146} y1={10} y2={10} stroke={vizColors.amber} strokeWidth={1.5} strokeDasharray="6 5" />
        <Label x={PX1} y={10} size={11} anchor="end" color={vizColors.muted}>
          setpoint 50%, ±2% band
        </Label>
        <rect
          x={PX0}
          y={sy(TUNER_SETPOINT * 1.02)}
          width={PX1 - PX0}
          height={sy(TUNER_SETPOINT * 0.98) - sy(TUNER_SETPOINT * 1.02)}
          fill={vizColors.amber}
          opacity={0.15}
        />
        <line x1={PX0} x2={PX1} y1={sy(TUNER_SETPOINT)} y2={sy(TUNER_SETPOINT)} stroke={vizColors.amber} strokeWidth={1.5} strokeDasharray="6 5" />
        {bump && (
          <g>
            <line x1={sx(BUMP_AT)} x2={sx(BUMP_AT)} y1={Y_TOP} y2={U_BOT} stroke={vizColors.red} strokeWidth={1.5} strokeDasharray="4 4" />
            <Label x={sx(BUMP_AT) + 6} y={Y_TOP + 8} size={10.5} anchor="start" color={vizColors.text}>
              load bump: −30% duty
            </Label>
          </g>
        )}
        <path d={polyline(yPts)} fill="none" stroke={vizColors.cyan} strokeWidth={2} strokeLinejoin="round" />
        {step.overshootPct >= 0.5 && (
          <g>
            <circle cx={sx(step.t[peakIdx])} cy={sy(step.y[peakIdx])} r={4.5} fill={vizColors.cyan} stroke={vizColors.bg} strokeWidth={2} />
            <Label x={sx(step.t[peakIdx]) + 8} y={sy(step.y[peakIdx]) - 10} size={10.5} anchor="start" color={vizColors.text}>
              {`peak +${step.overshootPct.toFixed(1)}%`}
            </Label>
          </g>
        )}
        {step.settlingTime !== null && (
          <g>
            <line x1={sx(step.settlingTime)} x2={sx(step.settlingTime)} y1={Y_BOT - 6} y2={Y_BOT + 6} stroke={vizColors.green} strokeWidth={2.5} />
            <Label x={sx(step.settlingTime)} y={Y_BOT - 14} size={10.5} color={vizColors.text}>
              {`settled ${step.settlingTime.toFixed(2)} s`}
            </Label>
          </g>
        )}
        {[0, 1, 2, 3, 4].map((t) => (
          <Label key={t} x={sx(t)} y={Y_BOT + 16} size={10} color={vizColors.muted}>
            {t === 4 ? "4 s" : String(t)}
          </Label>
        ))}

        {/* controller output plot */}
        <Label x={PX0} y={U_TOP - 14} size={11} anchor="start" color={vizColors.muted}>
          controller output u, % duty (clamped to ±100%)
        </Label>
        {[-1, 0, 1].map((v) => (
          <g key={v}>
            <line x1={PX0} x2={PX1} y1={su(v)} y2={su(v)} stroke={vizColors.grid} strokeWidth={1} />
            <Label x={PX0 - 8} y={su(v)} size={10} anchor="end" color={vizColors.muted}>
              {pct(v)}
            </Label>
          </g>
        ))}
        <path d={polyline(uPts)} fill="none" stroke={vizColors.violet} strokeWidth={2} strokeLinejoin="round" />
        {[0, 1, 2, 3, 4].map((t) => (
          <Label key={t} x={sx(t)} y={U_BOT + 16} size={10} color={vizColors.muted}>
            {t === 4 ? "4 s" : String(t)}
          </Label>
        ))}

        {/* hover crosshair */}
        {hi !== null && (
          <g pointerEvents="none">
            <line x1={sx(shown.t[hi])} x2={sx(shown.t[hi])} y1={Y_TOP} y2={U_BOT} stroke={vizColors.text} strokeWidth={1} opacity={0.6} />
            <circle cx={sx(shown.t[hi])} cy={sy(shown.y[hi])} r={4} fill={vizColors.cyan} stroke={vizColors.bg} strokeWidth={2} />
            <circle cx={sx(shown.t[hi])} cy={su(shown.u[hi])} r={4} fill={vizColors.violet} stroke={vizColors.bg} strokeWidth={2} />
            <rect x={tipX} y={Y_TOP + 18} width={142} height={58} rx={6} fill={vizColors.bg} stroke={vizColors.grid} />
            <Label x={tipX + 10} y={Y_TOP + 32} size={10.5} anchor="start" color={vizColors.muted}>
              {`t = ${shown.t[hi].toFixed(2)} s`}
            </Label>
            <line x1={tipX + 10} x2={tipX + 22} y1={Y_TOP + 48} y2={Y_TOP + 48} stroke={vizColors.cyan} strokeWidth={2} />
            <Label x={tipX + 28} y={Y_TOP + 48} size={11} anchor="start" bold>
              {`${(shown.y[hi] * 100).toFixed(1)}% speed`}
            </Label>
            <line x1={tipX + 10} x2={tipX + 22} y1={Y_TOP + 64} y2={Y_TOP + 64} stroke={vizColors.violet} strokeWidth={2} />
            <Label x={tipX + 28} y={Y_TOP + 64} size={11} anchor="start" bold>
              {`${(shown.u[hi] * 100).toFixed(0)}% duty`}
            </Label>
          </g>
        )}
      </SvgCanvas>
    </VizFrame>
  );
}
