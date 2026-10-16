import { describe, it, expect } from "vitest";
import { traceWidth } from "@/lib/sim/traceWidth";

describe("traceWidth (IPC-2221)", () => {
  it("1 A, 10 °C rise, 1 oz external is about 12 mil", () => {
    const r = traceWidth({ currentA: 1, tempRiseC: 10, copperOz: 1, layer: "external" });
    expect(r.widthMil).toBeGreaterThan(11);
    expect(r.widthMil).toBeLessThan(13);
    expect(r.widthMm).toBeCloseTo(r.widthMil * 0.0254, 3);
  });

  it("internal layers need roughly 2.6x the width", () => {
    const e = traceWidth({ currentA: 1, tempRiseC: 10, copperOz: 1, layer: "external" });
    const i = traceWidth({ currentA: 1, tempRiseC: 10, copperOz: 1, layer: "internal" });
    expect(i.widthMil / e.widthMil).toBeGreaterThan(2.4);
    expect(i.widthMil / e.widthMil).toBeLessThan(2.8);
  });

  it("2 oz copper halves the width", () => {
    const a = traceWidth({ currentA: 3, tempRiseC: 20, copperOz: 1, layer: "external" });
    const b = traceWidth({ currentA: 3, tempRiseC: 20, copperOz: 2, layer: "external" });
    expect(b.widthMil).toBeCloseTo(a.widthMil / 2, 3);
  });
});
