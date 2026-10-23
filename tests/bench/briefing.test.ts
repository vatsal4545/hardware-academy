import { describe, it, expect } from "vitest";
import { assistantBriefing, benchSnapshot } from "@/lib/bench/briefing";
import { MISSIONS } from "@/lib/bench/missions";
import { rowFromReading, type LogRow } from "@/lib/bench/log";
import { clipped, last, poweredBench, readyBench, run } from "./helpers";

describe("assistant briefing", () => {
  const text = assistantBriefing();

  it("tells the assistant each part's real status, including the Korad", () => {
    expect(text).toMatch(/Korad KA3005DE bench supply \(linear\): not bought yet/);
    expect(text).toMatch(/BNC male to dual 4 mm banana adapters: pending/);
  });

  it("carries the corrected rules", () => {
    expect(text).toMatch(/RcalVal is entered in milliohms: 50\.0/);
    expect(text).toMatch(/Power the boards before connecting the cell/);
    expect(text).toMatch(/current sink/);
    expect(text).toMatch(/beginner guide of 2026-09-07 wins/);
  });

  it("lists every mission", () => {
    for (const m of MISSIONS) expect(text).toContain(`Mission ${m.number}, ${m.title}`);
  });

  it("is the same every time, so it can be cached", () => {
    expect(assistantBriefing()).toBe(text);
  });

  it("never contains a key or an environment variable name", () => {
    expect(text).not.toMatch(/sk-ant|ANTHROPIC|PASSCODE/i);
  });
});

describe("bench snapshot", () => {
  it("captures the mission step, the leads and the active faults", () => {
    const s = clipped(poweredBench(), "cell-d-duracell", { "S+": { onForceWire: true } });
    const snap = benchSnapshot(s, []);
    expect(snap.dut!.id).toBe("cell-d-duracell");
    expect(snap.leads["S+"]).toMatchObject({ onForceWire: true });
    expect(snap.faults.join(" ")).toMatch(/force wire/);
    expect(snap.mission).toMatchObject({ mission: "Identify" });
  });

  it("stays small: at most 30 log rows and 3 readings", () => {
    let s = readyBench();
    const log: LogRow[] = [];
    for (let i = 0; i < 40; i++) {
      s = run(s, { type: "measure", freqHz: 1000 });
      log.push(rowFromReading(last(s), s, { date: "2026-10-22", time: "12:00:00" }, null)!);
    }
    const snap = benchSnapshot(s, log);
    expect(snap.log).toHaveLength(30);
    expect(snap.recentReadings).toHaveLength(3);
    expect(snap.recentReadings.every((r) => r.settled)).toBe(true);
    expect(JSON.stringify(snap).length).toBeLessThan(12_000);
  });
});
