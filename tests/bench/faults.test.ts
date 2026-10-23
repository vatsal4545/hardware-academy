import { describe, it, expect } from "vitest";
import { FAULTS, activeFaults } from "@/lib/bench/faults";
import { BLOCKING_FAULTS } from "@/lib/bench/instrument";
import { initialBench } from "@/lib/bench/state";
import { CHANNELS, type BenchState, type FaultId } from "@/lib/bench/types";
import { clipped, poweredBench, readyBench, run } from "./helpers";

const ids = (s: BenchState) => activeFaults(s).map((f) => f.id);

const shuntPads = { "F+": { terminal: "I+" }, "S+": { terminal: "V+" }, "S-": { terminal: "V-" }, "F-": { terminal: "I-" } };

/** One bench per catalogue row that shows that mistake. */
const cases: Array<[FaultId, () => BenchState]> = [
  ["shell-short", () => clipped(poweredBench(), "cell-d-duracell", { "F+": { via: "shell" } })],
  ["offset-stack", () => run(initialBench(1), { type: "stackBoards", alignment: "offset" }, { type: "plugUsb", viaIsolator: false })],
  ["power-order", () => clipped(run(initialBench(1), ...CHANNELS.map((channel) => ({ type: "fitAdapter", channel }) as const)), "cell-d-duracell")],
  ["power-down-connected", () => run(clipped(poweredBench(), "cell-d-duracell"), { type: "unplugUsb" })],
  ["over-range", () => clipped(poweredBench(), "cell-9v")],
  ["wrapper-bite", () => clipped(poweredBench(), "cell-d-duracell", { "S-": { bite: "wrapper" } })],
  ["sense-on-force", () => clipped(poweredBench(), "cell-d-duracell", { "S+": { onForceWire: true } })],
  ["no-calibration", () => clipped(poweredBench(), "cell-d-duracell")],
  ["switching-supply-near", () => run(initialBench(1), { type: "placeSupply", nearLeads: true })],
  ["wrong-baud", () => run(initialBench(1), { type: "openApp", app: "serial" }, { type: "setBaud", baud: 9600 })],
  ["isolator-debug", () => run(initialBench(1), { type: "stackBoards", alignment: "aligned" }, { type: "plugUsb", viaIsolator: true }, { type: "loadFirmware" })],
  ["rcal-wrong", () => run(initialBench(1), { type: "setRcal", value: 0.05 })],
  ["continuity-live", () => run(poweredBench(), { type: "continuity", target: { kind: "board" } })],
  ["two-terminal-wiring", () => clipped(poweredBench(), "shunt-10m", { ...shuntPads, "S+": { terminal: "I+" } })],
  ["not-settled", () => clipped(poweredBench(), "cell-d-duracell")],
  ["loose-shunt", () => clipped(poweredBench(), "shunt-10m", shuntPads)],
];

describe("mistake catalogue", () => {
  it("covers every fault id exactly once", () => {
    expect(cases.map(([id]) => id).sort()).toEqual((Object.keys(FAULTS) as FaultId[]).sort());
  });

  it.each(cases)("%s shows up on a bench that makes that mistake", (id, make) => {
    expect(ids(make())).toContain(id);
  });

  it("shows nothing on a correct, settled, calibrated bench", () => {
    expect(ids(readyBench())).toEqual([]);
  });

  it("puts danger first, then warnings, then information", () => {
    const s = run(clipped(poweredBench(), "cell-d-duracell", { "F+": { via: "shell" }, "S-": { bite: "wrapper" } }), { type: "placeSupply", nearLeads: true });
    const severities = activeFaults(s).map((f) => f.severity);
    expect(severities[0]).toBe("danger");
    expect(severities).toEqual([...severities].sort((a, b) => ["danger", "warning", "info"].indexOf(a) - ["danger", "warning", "info"].indexOf(b)));
  });

  it("blocks measurement on exactly the danger faults", () => {
    const danger = (Object.keys(FAULTS) as FaultId[]).filter((id) => FAULTS[id].severity === "danger");
    expect([...BLOCKING_FAULTS].sort()).toEqual(danger.sort());
  });

  it("gives every fault a message, a fix and a source", () => {
    for (const f of Object.values(FAULTS)) {
      expect(f.message.length).toBeGreaterThan(20);
      expect(f.fix.length).toBeGreaterThan(10);
      expect(f.source).toMatch(/\.(md|html) \(2026-/);
    }
  });
});
