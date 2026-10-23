import { describe, it, expect } from "vitest";
import { between, gaussian, unit } from "@/lib/bench/random";

describe("seeded randomness", () => {
  it("gives the same draw for the same seed and name, and different draws for different names", () => {
    expect(unit(7, "contact:F+:1")).toBe(unit(7, "contact:F+:1"));
    expect(unit(7, "contact:F+:1")).not.toBe(unit(7, "contact:F+:2"));
    expect(unit(7, "contact:F+:1")).not.toBe(unit(8, "contact:F+:1"));
  });

  it("stays inside [0, 1) and inside the requested range", () => {
    for (let i = 0; i < 200; i++) {
      const u = unit(3, `k${i}`);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      const b = between(3, `b${i}`, 4, 10);
      expect(b).toBeGreaterThanOrEqual(4);
      expect(b).toBeLessThan(10);
    }
  });

  it("draws a roughly normal spread around the mean", () => {
    const xs = Array.from({ length: 2000 }, (_, i) => gaussian(11, `g${i}`, 5, 2));
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
    expect(mean).toBeGreaterThan(4.8);
    expect(mean).toBeLessThan(5.2);
    expect(sd).toBeGreaterThan(1.8);
    expect(sd).toBeLessThan(2.2);
  });
});
