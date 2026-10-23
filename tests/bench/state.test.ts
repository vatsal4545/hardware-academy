import { describe, it, expect } from "vitest";
import { benchReducer, connectBlocker, initialBench } from "@/lib/bench/state";
import { CHANNELS } from "@/lib/bench/types";
import { GOOD, clipped, last, poweredBench, readyBench, run } from "./helpers";

describe("bench state", () => {
  it("starts empty, in guided mode, with RcalVal at 50.0", () => {
    const s = initialBench(4);
    expect(s.mode).toBe("guided");
    expect(s.software.rcalVal).toBe(50);
    expect(s.readings).toEqual([]);
    expect(s.faults).toEqual([]);
  });

  it("refuses to clip a lead before an adapter is fitted and a device is chosen", () => {
    const s = initialBench(4);
    expect(connectBlocker(s, "F+")).toMatch(/device/);
    const chosen = run(s, { type: "chooseDut", dutId: "cell-d-duracell" });
    expect(connectBlocker(chosen, "F+")).toMatch(/adapter/);
    expect(run(chosen, { type: "connect", channel: "F+", contact: GOOD["F+"] }).channels["F+"]).toBeUndefined();
  });

  it("counts connections, stamps each contact and resets the settling clock", () => {
    const s = clipped(poweredBench(), "cell-d-duracell");
    expect(s.connections).toBe(4);
    expect(CHANNELS.map((ch) => s.channels[ch]!.made)).toEqual([1, 2, 3, 4]);
    expect(s.lastContactAt).toBe(s.clock - 5);
  });

  it("won't change the device while leads are clipped to it", () => {
    const s = clipped(poweredBench(), "cell-d-duracell");
    expect(run(s, { type: "chooseDut", dutId: "cell-aa-amazon" }).dutId).toBe("cell-d-duracell");
  });

  it("records a power-order fault when a cell is clipped before the boards are powered", () => {
    const s = clipped(run(initialBench(2), ...CHANNELS.map((channel) => ({ type: "fitAdapter", channel }) as const)), "cell-d-duracell");
    expect(s.faults.map((f) => f.id)).toContain("power-order");
  });

  it("records a short when a BNC shell touches the cell", () => {
    const s = clipped(poweredBench(), "cell-d-duracell", { "F-": { via: "shell" } });
    expect(s.faults.map((f) => f.id)).toContain("shell-short");
    expect(last(run(s, { type: "measure", freqHz: 1000 })).reason).toBe("fault-active");
  });

  it("refuses a 9 V battery", () => {
    const s = clipped(poweredBench(), "cell-9v");
    expect(s.faults.map((f) => f.id)).toContain("over-range");
  });

  it("kills the board when it is powered while stacked offset, in either order", () => {
    const stackedFirst = run(initialBench(1), { type: "stackBoards", alignment: "offset" }, { type: "plugUsb", viaIsolator: false });
    const pluggedFirst = run(initialBench(1), { type: "plugUsb", viaIsolator: false }, { type: "stackBoards", alignment: "offset" });
    for (const s of [stackedFirst, pluggedFirst]) {
      expect(s.boards.dead).toBe(true);
      expect(s.faults.map((f) => f.id)).toContain("offset-stack");
    }
  });

  it("records powering down or cycling with the cell connected", () => {
    const s = clipped(poweredBench(), "cell-d-duracell");
    expect(run(s, { type: "unplugUsb" }).faults.map((f) => f.id)).toContain("power-down-connected");
    expect(run(s, { type: "powerCycle" }).faults.map((f) => f.id)).toContain("power-down-connected");
  });

  it("fails to load firmware through the isolator", () => {
    const s = run(initialBench(1), { type: "stackBoards", alignment: "aligned" }, { type: "plugUsb", viaIsolator: true }, { type: "loadFirmware" });
    expect(s.software.firmware).toBe(false);
    expect(s.faults.map((f) => f.id)).toContain("isolator-debug");
  });

  it("maps a lead with continuity when it is disconnected, and flags continuity on live parts", () => {
    const mapped = run(initialBench(1), { type: "continuity", target: { kind: "lead", channel: "S+" } });
    expect(mapped.continuityMapped["S+"]).toBe(true);
    const live = clipped(poweredBench(), "cell-d-duracell");
    expect(run(live, { type: "continuity", target: { kind: "lead", channel: "S+" } }).faults.map((f) => f.id)).toContain("continuity-live");
    expect(run(live, { type: "continuity", target: { kind: "cell", cellId: "cell-d-duracell" } }).faults.map((f) => f.id)).toContain("continuity-live");
    expect(run(poweredBench(), { type: "continuity", target: { kind: "board" } }).faults.map((f) => f.id)).toContain("continuity-live");
  });

  it("records a cell's voltage and temperature", () => {
    const s = run(initialBench(1), { type: "inspectCell", cellId: "cell-aa-amazon" }, { type: "measureOcv", cellId: "cell-aa-amazon" }, { type: "readTemperature", cellId: "cell-aa-amazon" });
    const c = s.cells["cell-aa-amazon"];
    expect(c.inspected).toBe(true);
    expect(c.ocv).toBeGreaterThan(1.1);
    expect(c.ocv).toBeLessThan(1.4);
    expect(c.tempC).toBeGreaterThan(22);
    expect(c.tempC).toBeLessThan(26);
  });

  it("carries the cell's temperature into its readings", () => {
    const s = run(readyBench(), { type: "readTemperature", cellId: "cell-d-duracell" }, { type: "measure", freqHz: 1000 });
    expect(last(s).tempC).toBe(s.cells["cell-d-duracell"].tempC);
  });

  it("returns to a safe state on reset: power off, leads unclipped, faults cleared, a working board", () => {
    const broken = clipped(run(initialBench(1), { type: "stackBoards", alignment: "offset" }, { type: "plugUsb", viaIsolator: false }, ...CHANNELS.map((channel) => ({ type: "fitAdapter", channel }) as const)), "cell-d-duracell");
    const reset = run(broken, { type: "resetAfterFault" });
    expect(reset.faults).toEqual([]);
    expect(reset.boards.dead).toBe(false);
    expect(reset.boards.stack).toBe("apart");
    expect(reset.usb.plugged).toBe(false);
    expect(reset.channels).toEqual({});
  });

  it("is deterministic: the same seed and actions give the same readings", () => {
    const a = run(readyBench(21), { type: "measure", freqHz: 1000 }, { type: "measure", freqHz: 10 });
    const b = run(readyBench(21), { type: "measure", freqHz: 1000 }, { type: "measure", freqHz: 10 });
    expect(b.readings).toEqual(a.readings);
  });

  it("keeps at most 500 readings", () => {
    let s = readyBench();
    for (let i = 0; i < 26; i++) s = benchReducer(s, { type: "sweep", fromHz: 10_000, toHz: 0.1, perDecade: 5 });
    expect(s.readings).toHaveLength(500);
    expect(s.readings[499].seq).toBe(s.seq);
  });

  it("ticks mission steps it is told about and records answers", () => {
    const s = run(initialBench(1), { type: "markMission", stepIds: ["identify.mat", "identify.strap"] }, { type: "answer", questionId: "q", choice: "c" });
    expect(s.missions).toEqual({ "identify.mat": true, "identify.strap": true });
    expect(s.answers.q).toBe("c");
  });
});
