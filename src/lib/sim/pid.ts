export interface PidParams {
  kp: number;
  ki: number;
  kd: number;
  outMin?: number;
  outMax?: number;
}

export interface PidState {
  integral: number;
  prevMeasurement: number;
}

export interface PidStepResult {
  output: number;
  state: PidState;
}

/** One discrete PID update. Derivative acts on the measurement (no derivative kick);
 *  the integral stops accumulating while the output is saturated in the same direction (anti-windup). */
export function pidStep(p: PidParams, s: PidState, setpoint: number, measurement: number, dt: number): PidStepResult {
  const outMin = p.outMin ?? -Infinity;
  const outMax = p.outMax ?? Infinity;
  const error = setpoint - measurement;
  const derivative = dt > 0 ? -(measurement - s.prevMeasurement) / dt : 0;
  let integral = s.integral + error * dt;
  let output = p.kp * error + p.ki * integral + p.kd * derivative;
  if (output > outMax) {
    if (error > 0) integral = s.integral;
    output = outMax;
  } else if (output < outMin) {
    if (error < 0) integral = s.integral;
    output = outMin;
  }
  return { output, state: { integral, prevMeasurement: measurement } };
}

export interface PlantModel {
  /** steady-state output per unit input */
  gain: number;
  /** time constant in seconds */
  tau: number;
}

export interface SimulatePidOptions {
  params: PidParams;
  setpoint: number;
  seconds: number;
  dt: number;
  plant: PlantModel;
  disturbanceAt?: number;
  disturbance?: number;
  initial?: number;
}

export interface SimulatePidResult {
  t: number[];
  y: number[];
  u: number[];
  overshootPct: number;
  settlingTime: number | null;
  steadyStateError: number;
}

/** Simulate a PID loop around a first-order plant y' = (gain·u − y)/tau with forward Euler. */
export function simulatePid(o: SimulatePidOptions): SimulatePidResult {
  const n = Math.max(1, Math.round(o.seconds / o.dt));
  const t: number[] = [];
  const y: number[] = [];
  const u: number[] = [];
  let state: PidState = { integral: 0, prevMeasurement: o.initial ?? 0 };
  let out = o.initial ?? 0;
  for (let k = 0; k <= n; k++) {
    const time = k * o.dt;
    const step = pidStep(o.params, state, o.setpoint, out, o.dt);
    state = step.state;
    t.push(time);
    y.push(out);
    u.push(step.output);
    const disturbed =
      o.disturbanceAt !== undefined && time >= o.disturbanceAt ? step.output + (o.disturbance ?? 0) : step.output;
    out += (o.dt * (o.plant.gain * disturbed - out)) / o.plant.tau;
  }

  const sp = o.setpoint;
  const peak = Math.max(...y);
  const overshootPct = sp !== 0 ? Math.max(0, ((peak - sp) / Math.abs(sp)) * 100) : 0;

  const band = 0.02 * Math.abs(sp);
  let lastOutside = -1;
  for (let i = 0; i < y.length; i++) if (Math.abs(y[i] - sp) > band) lastOutside = i;
  const settlingTime = lastOutside < 0 ? 0 : lastOutside < y.length - 1 ? t[lastOutside + 1] : null;

  const tail = Math.max(1, Math.floor(y.length * 0.05));
  const mean = y.slice(-tail).reduce((a, b) => a + b, 0) / tail;
  const steadyStateError = sp - mean;

  return { t, y, u, overshootPct, settlingTime, steadyStateError };
}
