import { describe, it, expect } from "vitest";
import { LEAD_MILLIOHM, contactMilliohm, jumpMilliohm, residualMilliohm, senseOffsetMilliohm, wiringOf } from "@/lib/bench/contacts";
import type { Channel, ChannelContact } from "@/lib/bench/types";

const bare = (terminal: string, made: number, onForceWire = false): ChannelContact => ({ terminal, via: "centre", bite: "bare", onForceWire, made });

const fourWire: Partial<Record<Channel, ChannelContact>> = { "F+": bare("+", 1), "S+": bare("+", 2), "S-": bare("-", 3), "F-": bare("-", 4) };

describe("leads and contacts", () => {
  it("gives bare contacts a few milliohms and wrapper bites tens to hundreds", () => {
    for (let made = 1; made <= 50; made++) {
      const b = contactMilliohm(5, "F+", bare("+", made));
      expect(b).toBeGreaterThanOrEqual(4);
      expect(b).toBeLessThan(10);
      const w = contactMilliohm(5, "F+", { ...bare("+", made), bite: "wrapper" });
      expect(w).toBeGreaterThanOrEqual(50);
      expect(w).toBeLessThan(400);
    }
  });

  it("adds nothing to a correct four-wire hookup", () => {
    expect(senseOffsetMilliohm(5, fourWire)).toBe(0);
    expect(wiringOf(fourWire)).toBe("4-wire");
  });

  it("makes a 10 mΩ part read 2-3× high when one sense jaw sits on the force wire", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const extra = senseOffsetMilliohm(seed, { ...fourWire, "S+": bare("+", 2, true) });
      const ratio = (10 + extra) / 10;
      expect(ratio).toBeGreaterThanOrEqual(2.4);
      expect(ratio).toBeLessThanOrEqual(3);
    }
  });

  it("makes two-wire add 28 to 40 mΩ of leads and contacts: the beginner guide's 40 mΩ is the top of that range", () => {
    const twoWire = { ...fourWire, "S+": bare("+", 2, true), "S-": bare("-", 3, true) };
    expect(wiringOf(twoWire)).toBe("2-wire");
    for (let seed = 1; seed <= 30; seed++) {
      const extra = senseOffsetMilliohm(seed, twoWire);
      expect(extra).toBeGreaterThanOrEqual(2 * (4 + LEAD_MILLIOHM));
      expect(extra).toBeLessThanOrEqual(2 * (10 + LEAD_MILLIOHM));
    }
  });

  it("calls one sense jaw on the force wire mixed wiring", () => {
    expect(wiringOf({ ...fourWire, "S-": bare("-", 3, true) })).toBe("mixed");
  });

  it("jumps by milliohms between reconnections only when a jaw bites the wrapper", () => {
    expect(jumpMilliohm(5, fourWire)).toBe(0);
    const jumps = Array.from({ length: 20 }, (_, i) => jumpMilliohm(5, { ...fourWire, "F+": { ...bare("+", 10 + i), bite: "wrapper" } }));
    expect(Math.max(...jumps) - Math.min(...jumps)).toBeGreaterThan(10);
  });

  it("keeps the four-wire residual small and tied to the set of connections", () => {
    const r = residualMilliohm(5, fourWire);
    expect(Math.abs(r)).toBeLessThan(0.3);
    expect(residualMilliohm(5, fourWire)).toBe(r);
    expect(residualMilliohm(5, { ...fourWire, "F+": bare("+", 9) })).not.toBe(r);
  });
});
