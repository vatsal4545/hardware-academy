import { describe, it, expect } from "vitest";
import { CELL_PRESETS, SHUNT_PRESETS, atTemperature, cellModel, randlesImpedance, shuntImpedance } from "@/lib/bench/dut";

describe("cell models", () => {
  it.each(CELL_PRESETS.filter((p) => p.rangeAt1kHz !== null))("$id lands in its runbook range at 1 kHz for every cell", (preset) => {
    const [lo, hi] = preset.rangeAt1kHz!;
    for (const cellId of ["a", "b", "c", "d", "e"]) {
      const re = randlesImpedance(cellModel(preset, cellId, 42, 25), 1000).re * 1000;
      expect(re).toBeGreaterThanOrEqual(lo);
      expect(re).toBeLessThanOrEqual(hi);
    }
  });

  it("traces a semicircle: R plus (R ∥ C) reaches R0 + Rct/2 at the arc's top, at f = 1/(2πRC)", () => {
    const m = { r0: 0.1, rct: 0.05, cdl: 1, sigma: 0 };
    const fTop = 1 / (2 * Math.PI * m.rct * m.cdl);
    const z = randlesImpedance(m, fTop);
    expect(z.re).toBeCloseTo(m.r0 + m.rct / 2, 9);
    expect(-z.im).toBeCloseTo(m.rct / 2, 9);
    expect(randlesImpedance(m, 1e6).re).toBeCloseTo(m.r0, 6);
    expect(randlesImpedance(m, 1e-4).re).toBeCloseTo(m.r0 + m.rct, 4);
  });

  it("adds a 45° diffusion tail at low frequency", () => {
    const m = { r0: 0.1, rct: 0, cdl: 1, sigma: 0.01 };
    const z = randlesImpedance(m, 0.1);
    expect(z.re - m.r0).toBeCloseTo(-z.im, 12);
  });

  it("lowers resistance as the cell warms, within the clamps", () => {
    const m = CELL_PRESETS[4].model;
    expect(atTemperature(m, 35).r0).toBeLessThan(m.r0);
    expect(atTemperature(m, 15).rct).toBeGreaterThan(m.rct);
    expect(atTemperature(m, 1000).r0).toBeCloseTo(m.r0 * 0.5, 12);
  });
});

describe("shunt models", () => {
  it.each(SHUNT_PRESETS)("$id stays inside its tolerance", (preset) => {
    const re = shuntImpedance(preset, 99, 1000).re * 1000;
    expect(Math.abs(re - preset.nominalMilliohm)).toBeLessThanOrEqual(preset.nominalMilliohm * preset.tolerance + 1e-12);
  });

  it("gains reactance with frequency from its series inductance", () => {
    const p = SHUNT_PRESETS[3];
    expect(shuntImpedance(p, 1, 10_000).im).toBeGreaterThan(shuntImpedance(p, 1, 1000).im);
  });
});
