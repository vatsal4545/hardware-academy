import { describe, it, expect } from "vitest";
import { pointSeconds, softwareLink, sweepFrequencies } from "@/lib/bench/instrument";
import { initialBench } from "@/lib/bench/state";
import { clipped, justClipped, last, poweredBench, readyBench, reclip, run, spread } from "./helpers";

describe("instrument", () => {
  it("delivers data with nothing connected once the software is set up", () => {
    const r = last(run(poweredBench(), { type: "measure", freqHz: 1000 }));
    expect(r.dataArrived).toBe(true);
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("open-force");
    expect(r.dutId).toBeNull();
  });

  it("delivers nothing before the boards are stacked, powered and running firmware", () => {
    expect(softwareLink(initialBench(1))).toEqual({ ok: false, reason: "no-power" });
    const plugged = run(initialBench(1), { type: "plugUsb", viaIsolator: false });
    expect(softwareLink(plugged)).toEqual({ ok: false, reason: "not-stacked" });
    const stacked = run(plugged, { type: "stackBoards", alignment: "aligned" });
    expect(softwareLink(stacked)).toEqual({ ok: false, reason: "no-firmware" });
    const r = last(run(stacked, { type: "measure", freqHz: 1000 }));
    expect(r.dataArrived).toBe(false);
  });

  it("gets no output on a serial terminal unless it runs at 230400 baud", () => {
    const serial = run(
      initialBench(1),
      { type: "stackBoards", alignment: "aligned" },
      { type: "plugUsb", viaIsolator: false },
      { type: "loadFirmware" },
      { type: "openApp", app: "serial" },
      { type: "setBaud", baud: 115200 },
    );
    expect(softwareLink(serial)).toEqual({ ok: false, reason: "no-output" });
    expect(softwareLink(run(serial, { type: "setBaud", baud: 230400 }))).toEqual({ ok: true });
  });

  it("reads a cell four-wire inside its runbook range", () => {
    const r = last(run(readyBench(7, "cell-d-duracell"), { type: "measure", freqHz: 1000 }));
    expect(r.valid).toBe(true);
    expect(r.wiring).toBe("4-wire");
    expect(r.calibrated).toBe(true);
    expect(r.z!.re).toBeGreaterThan(300);
    expect(r.z!.re).toBeLessThan(1000);
  });

  it("gives no valid reading on a loose shunt, because the current sink needs a bias", () => {
    const r = last(run(clipped(poweredBench(), "shunt-10m", { "F+": { terminal: "I+" }, "S+": { terminal: "V+" }, "S-": { terminal: "V-" }, "F-": { terminal: "I-" } }), { type: "measure", freqHz: 1000 }));
    expect(r.valid).toBe(false);
    expect(r.dataArrived).toBe(true);
    expect(r.reason).toBe("no-bias");
  });

  it("reports missing sense leads and miswired leads", () => {
    const noSense = run(poweredBench(), { type: "chooseDut", dutId: "cell-d-duracell" }, { type: "connect", channel: "F+", contact: { terminal: "+", via: "centre", bite: "bare", onForceWire: false } }, { type: "connect", channel: "F-", contact: { terminal: "-", via: "centre", bite: "bare", onForceWire: false } }, { type: "measure", freqHz: 1000 });
    expect(last(noSense).reason).toBe("open-sense");
    const swapped = run(clipped(poweredBench(), "cell-d-duracell", { "S+": { terminal: "-" } }), { type: "measure", freqHz: 1000 });
    expect(last(swapped).reason).toBe("miswired");
  });

  it("adds a constant offset when the reference hasn't been measured", () => {
    const calibrated = last(run(readyBench(), { type: "measure", freqHz: 1000 })).z!.re;
    const uncal = clipped(poweredBench(), "cell-d-duracell");
    const offset = last(run(uncal, { type: "wait", seconds: 60 }, { type: "measure", freqHz: 1000 })).z!.re;
    expect(offset - calibrated).toBeGreaterThan(2);
    expect(offset - calibrated).toBeLessThan(3);
  });

  it("makes results 1000 times too small when RcalVal is entered as 0.05", () => {
    const good = last(run(readyBench(), { type: "measure", freqHz: 1000 })).z!.re;
    const wrong = last(run(readyBench(), { type: "setRcal", value: 0.05 }, { type: "measure", freqHz: 1000 })).z!.re;
    expect(wrong / good).toBeCloseTo(0.001, 4);
  });

  it("keeps the reconnection spread under 0.5 mΩ with bare bites, and lets wrapper bites jump", () => {
    let bare = readyBench(3);
    const bareReadings: number[] = [];
    let wrapper = reclip(readyBench(3), { "F+": { bite: "wrapper" } });
    const wrapperReadings: number[] = [];
    for (let i = 0; i < 10; i++) {
      bare = run(reclip(bare), { type: "measure", freqHz: 1000 });
      bareReadings.push(last(bare).z!.re);
      wrapper = run(reclip(wrapper, { "F+": { bite: "wrapper" } }), { type: "measure", freqHz: 1000 });
      wrapperReadings.push(last(wrapper).z!.re);
    }
    expect(spread(bareReadings)).toBeLessThan(0.5);
    expect(spread(wrapperReadings)).toBeGreaterThan(5);
  });

  it("adds about 30-40 mΩ two-wire, against the same cell read four-wire", () => {
    const four = last(run(readyBench(), { type: "measure", freqHz: 1000 })).z!.re;
    const two = last(run(clipped(run(poweredBench(), { type: "measureReference" }), "cell-d-duracell", { "S+": { onForceWire: true }, "S-": { onForceWire: true } }), { type: "wait", seconds: 60 }, { type: "measure", freqHz: 1000 }));
    expect(two.wiring).toBe("2-wire");
    expect(two.z!.re - four).toBeGreaterThan(27);
    expect(two.z!.re - four).toBeLessThan(41);
  });

  it("drifts right after clipping and settles after a minute", () => {
    const early = run(clipped(run(poweredBench(5), { type: "measureReference" }), "cell-d-duracell"), { type: "measure", freqHz: 1000 });
    const settled = run(early, { type: "wait", seconds: 60 }, { type: "measure", freqHz: 1000 });
    const drift = Math.abs(early.readings[early.readings.length - 1].z!.re - last(settled).z!.re);
    expect(drift).toBeGreaterThan(0.05);
    expect(drift).toBeLessThan(0.6);
  });

  it("gets noisier near a switching supply", () => {
    const sample = (near: boolean) => {
      let s = run(readyBench(9), { type: "placeSupply", nearLeads: near });
      const xs: number[] = [];
      for (let i = 0; i < 60; i++) {
        s = run(s, { type: "measure", freqHz: 1000 });
        xs.push(last(s).z!.re);
      }
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
    };
    const ratio = sample(true) / sample(false);
    expect(ratio).toBeGreaterThan(2.5);
    expect(ratio).toBeLessThan(6);
  });

  it("takes over 40 s for a 0.1 Hz point and sweeps from high to low frequency", () => {
    expect(pointSeconds(0.1)).toBeGreaterThan(40);
    expect(pointSeconds(1000)).toBe(1);
    const f = sweepFrequencies(10_000, 0.1, 5);
    expect(f[0]).toBe(10_000);
    expect(f[f.length - 1]).toBe(0.1);
    expect(f).toHaveLength(26);
  });

  it("sweeps one point, without a duplicate or a crash, when the range is empty or reaches zero", () => {
    expect(sweepFrequencies(1000, 0, 5)).toEqual([1000]);
    expect(sweepFrequencies(0, 1000, 5)).toEqual([1000]);
    expect(sweepFrequencies(1000, -10, 5)).toEqual([1000]);
    expect(sweepFrequencies(1000, 1000, 5)).toEqual([1000]);
  });

  it("records a sweep as one reading per frequency and advances bench time", () => {
    const before = readyBench();
    const after = run(before, { type: "sweep", fromHz: 1000, toHz: 1, perDecade: 2 });
    expect(after.readings.length - before.readings.length).toBe(7);
    expect(after.clock - before.clock).toBeGreaterThan(5);
  });

  it("marks a reading settled only a minute after a clip last moved, point by point in a sweep", () => {
    const early = run(justClipped(), { type: "measure", freqHz: 1000 });
    expect(last(early).valid).toBe(true);
    expect(last(early).settled).toBe(false);
    expect(last(run(early, { type: "wait", seconds: 60 }, { type: "measure", freqHz: 1000 })).settled).toBe(true);
    const swept = run(justClipped(), { type: "wait", seconds: 52 }, { type: "sweep", fromHz: 10_000, toHz: 1, perDecade: 2 });
    const flags = swept.readings.map((r) => r.settled);
    expect(flags.slice(0, 3)).toEqual([false, false, false]);
    expect(flags.slice(3).every(Boolean)).toBe(true);
  });

  it("reads the same whatever the thermometer showed: the cell sits at room temperature", () => {
    const s = readyBench();
    const plain = last(run(s, { type: "measure", freqHz: 1000 }));
    const warm = { ...s, cells: { ...s.cells, "cell-d-duracell": { inspected: true, ocv: null, tempC: 35 } } };
    const read = last(run(warm, { type: "measure", freqHz: 1000 }));
    expect(read.tempC).toBe(35);
    expect(read.z).toEqual(plain.z);
  });
});
