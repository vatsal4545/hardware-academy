"use client";

import { useId, useMemo, useState } from "react";
import { Segmented, Slider, VizFrame } from "@/components/lesson";
import { Button } from "@/components/ui/Button";
import { Label, SvgCanvas, makeScale, polyline, vizColors } from "@/components/viz/shared";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";
import { simulatePid, type SimulatePidResult } from "@/lib/sim/pid";

const LAB_ID = "pid";
/** Motor model: speed in krpm per volt, mechanical time constant in seconds. */
const PLANT = { gain: 1, tau: 2 };
const DRIVE_LIMIT = 12; // V
const SECONDS = 5;
const DT = 0.005; // the controller samples at 200 Hz
const DISTURB_AT = 3; // s
const TARGET_OVERSHOOT = 10; // %
const TARGET_SETTLING = 1; // s
/** Above this Kd the unfiltered, sampled derivative over-corrects every sample on this plant (Kd·K/τ > 1). */
const KD_LIMIT = PLANT.tau / PLANT.gain;

interface Gains {
  kp: number;
  ki: number;
  kd: number;
}
const START: Gains = { kp: 2, ki: 0, kd: 0 };

type Setpoint = "1" | "2";
const SETPOINTS: { value: Setpoint; label: string }[] = [
  { value: "1", label: "1 krpm" },
  { value: "2", label: "2 krpm" },
];

function simulate(g: Gains, setpoint: number, disturbance: boolean): SimulatePidResult {
  return simulatePid({
    params: { kp: g.kp, ki: g.ki, kd: g.kd, outMin: -DRIVE_LIMIT, outMax: DRIVE_LIMIT },
    setpoint,
    seconds: SECONDS,
    dt: DT,
    plant: PLANT,
    // a load that costs half the steady-state drive
    ...(disturbance ? { disturbanceAt: DISTURB_AT, disturbance: -0.5 * setpoint } : {}),
  });
}

function meetsTarget(r: SimulatePidResult): boolean {
  return r.overshootPct < TARGET_OVERSHOOT && r.settlingTime !== null && r.settlingTime < TARGET_SETTLING;
}

/** True when the drive reverses on most samples near the end of the run. */
function chattering(u: number[]): boolean {
  let flips = 0;
  for (let i = Math.floor(u.length / 2) + 2; i < u.length; i++) {
    const a = u[i] - u[i - 1];
    const b = u[i - 1] - u[i - 2];
    if (a * b < 0 && Math.abs(a) > 0.1) flips++;
  }
  return flips > 50;
}

/** Response to the load step: deepest dip (% of setpoint) and time to get back inside the 2 % band. */
function loadRecovery(r: SimulatePidResult, sp: number): { dipPct: number; recovery: number | null } {
  const start = r.t.findIndex((t) => t >= DISTURB_AT);
  if (start < 0) return { dipPct: 0, recovery: 0 };
  const band = 0.02 * sp;
  let minY = Infinity;
  let lastOut = -1;
  for (let i = start; i < r.y.length; i++) {
    minY = Math.min(minY, r.y[i]);
    if (Math.abs(r.y[i] - sp) > band) lastOut = i;
  }
  const recovery = lastOut < 0 ? 0 : lastOut < r.y.length - 1 ? r.t[lastOut + 1] - DISTURB_AT : null;
  return { dipPct: Math.max(0, ((sp - minY) / sp) * 100), recovery };
}

export function PidLab() {
  const [gains, setGains] = useState<Gains>(START);
  const [sp, setSp] = useState<Setpoint>("1");
  const [disturb, setDisturb] = useState(false);
  const { state: progress, markLab } = useProgress();
  const done = Boolean(progress.labs[LAB_ID]);
  const setpoint = Number(sp);

  // Step-response metrics come from an undisturbed run; the plot adds the load step when it is on.
  const stepRun = useMemo(() => simulate(gains, setpoint, false), [gains, setpoint]);
  const shown = useMemo(() => (disturb ? simulate(gains, setpoint, true) : stepRun), [disturb, gains, setpoint, stepRun]);
  const met = meetsTarget(stepRun);
  const chatter = chattering(shown.u);
  const load = disturb ? loadRecovery(shown, setpoint) : null;

  const apply = (next: Gains, nextSp: Setpoint = sp) => {
    setGains(next);
    setSp(nextSp);
    if (!done && meetsTarget(simulate(next, Number(nextSp), false))) markLab(LAB_ID);
  };

  const sse = stepRun.steadyStateError;
  const metrics: Array<{ label: string; value: string; ok?: boolean }> = [
    {
      label: "Overshoot",
      value: `${stepRun.overshootPct.toFixed(1)} %`,
      ok: stepRun.overshootPct < TARGET_OVERSHOOT,
    },
    {
      label: "Settling time (2 %)",
      value: stepRun.settlingTime === null ? "not settled" : `${stepRun.settlingTime.toFixed(2)} s`,
      ok: stepRun.settlingTime !== null && stepRun.settlingTime < TARGET_SETTLING,
    },
    {
      label: "Steady-state error",
      value: `${sse.toFixed(3)} krpm (${((Math.abs(sse) / setpoint) * 100).toFixed(1)} %)`,
    },
  ];
  if (load) {
    metrics.push(
      { label: "Load dip", value: `${load.dipPct.toFixed(1)} %` },
      { label: "Load recovery", value: load.recovery === null ? "not within 2 s" : `${load.recovery.toFixed(2)} s` },
    );
  }

  return (
    <VizFrame
      title="Motor speed loop"
      description={`First-order motor: ${PLANT.gain} krpm per volt, τ = ${PLANT.tau} s, drive limited to ±${DRIVE_LIMIT} V, PID sampled at ${1 / DT} Hz.`}
      controls={
        <>
          <Slider label="Kp" value={gains.kp} min={0} max={20} step={0.1} onChange={(kp) => apply({ ...gains, kp })} />
          <Slider label="Ki" value={gains.ki} min={0} max={20} step={0.1} onChange={(ki) => apply({ ...gains, ki })} />
          <Slider label="Kd" value={gains.kd} min={0} max={5} step={0.05} onChange={(kd) => apply({ ...gains, kd })} />
          <Segmented label="Setpoint" options={SETPOINTS} value={sp} onChange={(v) => apply(gains, v)} />
          <div className="flex flex-wrap items-end gap-2">
            <Button size="sm" variant="secondary" aria-pressed={disturb} onClick={() => setDisturb(!disturb)}>
              Load step at t = {DISTURB_AT} s
            </Button>
            <Button size="sm" variant="ghost" onClick={() => apply(START)}>
              Reset gains
            </Button>
          </div>
        </>
      }
      footer={
        <div className="space-y-2">
          <p>
            Start with Kp, add Ki to remove the steady-state error, then trim overshoot. Hint: put the integral zero (Ki / Kp)
            near the motor&apos;s 1/τ = {(1 / PLANT.tau).toFixed(1)} s⁻¹.
          </p>
          {chatter && (
            <p role="alert" className="text-amber-300">
              The drive is chattering between its limits. With Kd above about {KD_LIMIT} on this motor, the derivative of a
              measurement sampled every {DT * 1000} ms over-corrects every sample. Real controllers low-pass filter the
              derivative; here, lower Kd.
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            Target: overshoot under {TARGET_OVERSHOOT} % and settling under {TARGET_SETTLING} s.
          </p>
          <span
            role="status"
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              met ? "bg-green-500/15 text-green-300" : "bg-surface-2 text-muted",
            )}
          >
            {met ? "Target met" : "Target not met yet"}
          </span>
        </div>
        <ResponsePlot result={shown} setpoint={setpoint} disturbance={disturb} settlingTime={stepRun.settlingTime} />
        <dl className="grid gap-3 sm:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-border bg-bg px-3 py-2">
              <dt className="text-xs text-muted">{m.label}</dt>
              <dd
                className={cn(
                  "font-mono text-sm tabular-nums",
                  m.ok === true && "text-green-300",
                  m.ok === false && "text-text",
                )}
              >
                {m.value}
              </dd>
            </div>
          ))}
        </dl>
        {done && <p className="text-xs text-green-300">Lab complete. Keep experimenting.</p>}
      </div>
    </VizFrame>
  );
}

function ResponsePlot({
  result,
  setpoint,
  disturbance,
  settlingTime,
}: {
  result: SimulatePidResult;
  setpoint: number;
  disturbance: boolean;
  settlingTime: number | null;
}) {
  const clipId = `pid-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const left = 56;
  const right = 624;
  const top = 14;
  const bottom = 210;
  const uTop = 240;
  const uBottom = 306;
  const peak = Math.max(...result.y);
  const yMax = Math.max(1.5 * setpoint, Math.min(peak, 3 * setpoint) * 1.08);
  const x = makeScale([0, SECONDS], [left, right]);
  const y = makeScale([0, yMax], [bottom, top]);
  const u = makeScale([-DRIVE_LIMIT, DRIVE_LIMIT], [uBottom, uTop]);
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += setpoint / 2) yTicks.push(v);
  const tTicks = Array.from({ length: SECONDS + 1 }, (_, i) => i);
  const response = polyline(result.t.map((t, i): [number, number] => [x(t), y(result.y[i])]));
  const effort = polyline(result.t.map((t, i): [number, number] => [x(t), u(result.u[i])]));

  return (
    <SvgCanvas viewBox="0 0 640 344" title="Motor speed and drive voltage over time">
      <defs>
        <clipPath id={clipId}>
          <rect x={left} y={top} width={right - left} height={bottom - top} />
        </clipPath>
      </defs>
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={left} x2={right} y1={y(v)} y2={y(v)} stroke={vizColors.grid} />
          <Label x={left - 8} y={y(v)} anchor="end" size={11} color={vizColors.muted} mono>
            {v.toFixed(1)}
          </Label>
        </g>
      ))}
      {tTicks.map((t) => (
        <g key={`t${t}`}>
          <line x1={x(t)} x2={x(t)} y1={top} y2={uBottom} stroke={vizColors.grid} />
          <Label x={x(t)} y={uBottom + 13} size={11} color={vizColors.muted} mono>
            {t}
          </Label>
        </g>
      ))}
      <Label x={14} y={(top + bottom) / 2} size={11} color={vizColors.muted} rotate={-90}>
        speed (krpm)
      </Label>
      <Label x={14} y={(uTop + uBottom) / 2} size={11} color={vizColors.muted} rotate={-90}>
        drive (V)
      </Label>
      <Label x={right} y={uBottom + 29} anchor="end" size={11} color={vizColors.muted}>
        time (s)
      </Label>

      {/* ±2 % settling band and setpoint */}
      <rect
        x={left}
        y={y(setpoint * 1.02)}
        width={right - left}
        height={Math.max(1, y(setpoint * 0.98) - y(setpoint * 1.02))}
        fill={vizColors.green}
        opacity={0.15}
      />
      <line x1={left} x2={right} y1={y(setpoint)} y2={y(setpoint)} stroke={vizColors.green} strokeDasharray="6 5" />
      <Label x={right - 4} y={y(setpoint) - 10} anchor="end" size={11} color={vizColors.green}>
        setpoint
      </Label>

      {settlingTime !== null && settlingTime > 0 && settlingTime <= SECONDS && (
        <g>
          <line x1={x(settlingTime)} x2={x(settlingTime)} y1={top} y2={bottom} stroke={vizColors.green} strokeDasharray="2 4" />
          <Label x={x(settlingTime) + 4} y={bottom - 10} anchor="start" size={11} color={vizColors.green}>
            settled {settlingTime.toFixed(2)} s
          </Label>
        </g>
      )}
      {disturbance && (
        <g>
          <line x1={x(DISTURB_AT)} x2={x(DISTURB_AT)} y1={top} y2={uBottom} stroke={vizColors.orange} strokeDasharray="6 4" />
          <Label x={x(DISTURB_AT) + 4} y={top + 10} anchor="start" size={11} color={vizColors.orange}>
            load step
          </Label>
        </g>
      )}

      <path d={response} fill="none" stroke={vizColors.cyan} strokeWidth={2} clipPath={`url(#${clipId})`} />

      {/* drive voltage panel */}
      <rect x={left} y={uTop} width={right - left} height={uBottom - uTop} fill="none" stroke={vizColors.grid} />
      <line x1={left} x2={right} y1={u(0)} y2={u(0)} stroke={vizColors.grid} />
      <path d={effort} fill="none" stroke={vizColors.amber} strokeWidth={1.25} />
      <Label x={left - 8} y={u(DRIVE_LIMIT)} anchor="end" size={10} color={vizColors.muted} mono>
        +{DRIVE_LIMIT}
      </Label>
      <Label x={left - 8} y={u(-DRIVE_LIMIT)} anchor="end" size={10} color={vizColors.muted} mono>
        −{DRIVE_LIMIT}
      </Label>
    </SvgCanvas>
  );
}
