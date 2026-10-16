import { describe, it, expect } from "vitest";
import { simulatePid, pidStep } from "@/lib/sim/pid";

const plant = { gain: 1, tau: 0.5 };

describe("pid", () => {
  it("P-only leaves steady-state error", () => {
    const r = simulatePid({ params: { kp: 2, ki: 0, kd: 0 }, setpoint: 1, seconds: 6, dt: 0.01, plant });
    expect(r.steadyStateError).toBeGreaterThan(0.2);
  });

  it("PI removes steady-state error", () => {
    const r = simulatePid({ params: { kp: 2, ki: 2, kd: 0 }, setpoint: 1, seconds: 8, dt: 0.01, plant });
    expect(Math.abs(r.steadyStateError)).toBeLessThan(0.02);
  });

  it("clamps output", () => {
    const { output } = pidStep(
      { kp: 100, ki: 0, kd: 0, outMin: -1, outMax: 1 },
      { integral: 0, prevMeasurement: 0 },
      10,
      0,
      0.01,
    );
    expect(output).toBe(1);
  });

  it("reports overshoot for an aggressive loop", () => {
    const r = simulatePid({ params: { kp: 2, ki: 50, kd: 0 }, setpoint: 1, seconds: 4, dt: 0.005, plant });
    expect(r.overshootPct).toBeGreaterThan(5);
  });

  it("returns aligned sample arrays", () => {
    const r = simulatePid({ params: { kp: 1, ki: 1, kd: 0 }, setpoint: 1, seconds: 1, dt: 0.1, plant });
    expect(r.t.length).toBe(r.y.length);
    expect(r.t.length).toBe(r.u.length);
    expect(r.t[0]).toBe(0);
  });
});
