import { describe, it, expect } from "vitest";
import { rowFromReading, repeatability, type LogRow } from "@/lib/bench/log";
import { MISSIONS, newlyDone, resumePoint } from "@/lib/bench/missions";
import { partsOfKind } from "@/lib/bench/parts";
import { benchReducer, initialBench } from "@/lib/bench/state";
import { CHANNELS, type BenchAction, type BenchState } from "@/lib/bench/types";
import { GOOD } from "./helpers";

/**
 * Plays the page's loop: apply an action, log every new valid reading (as the page will), then tick whatever
 * missions the bench now satisfies.
 */
class Session {
  bench: BenchState = initialBench(2026);
  log: LogRow[] = [];
  private lastConnection = new Map<string, number>();

  do(...actions: BenchAction[]) {
    for (const action of actions) {
      const before = this.bench.readings.length ? this.bench.readings[this.bench.readings.length - 1].seq : 0;
      this.bench = benchReducer(this.bench, action);
      for (const r of this.bench.readings.filter((x) => x.seq > before)) {
        const row = rowFromReading(r, this.bench, { date: "2026-10-22", time: "12:00:00" }, r.dutId ? (this.lastConnection.get(r.dutId) ?? null) : null);
        if (row && r.dutId) {
          this.log.push(row);
          this.lastConnection.set(r.dutId, r.connection);
        }
      }
      this.bench = benchReducer(this.bench, { type: "markMission", stepIds: newlyDone({ bench: this.bench, log: this.log }) });
    }
  }

  reclip() {
    this.do(...CHANNELS.map((channel): BenchAction => ({ type: "disconnect", channel })));
    this.do(...CHANNELS.map((channel): BenchAction => ({ type: "connect", channel, contact: GOOD[channel] })), { type: "wait", seconds: 60 });
  }
}

describe("guided walkthrough of missions 1-4", () => {
  it("can be completed with the right actions, in order", () => {
    const s = new Session();
    const cell = "cell-d-duracell";

    // Mission 1: Identify.
    s.do(
      { type: "groundMat" },
      { type: "wearStrap" },
      { type: "createLog" },
      { type: "layOut" },
      { type: "identify", partId: "eval-ad5941batz" },
      { type: "identify", partId: "eval-adicup3029" },
      ...partsOfKind("shunt").map((p): BenchAction => ({ type: "identify", partId: p.id })),
      ...CHANNELS.map((channel): BenchAction => ({ type: "continuity", target: { kind: "lead", channel } })),
      ...CHANNELS.map((channel): BenchAction => ({ type: "fitAdapter", channel })),
    );
    expect(resumePoint(s.bench)!.mission.id).toBe("communicate");

    // Mission 2: Communicate.
    s.do(
      { type: "inspectBoards" },
      { type: "stackBoards", alignment: "aligned" },
      { type: "plugUsb", viaIsolator: false },
      { type: "openApp", app: "sensorpal" },
      { type: "loadFirmware" },
      { type: "selectDevice" },
      { type: "powerCycle" },
      { type: "measure", freqHz: 1000 },
    );
    expect(resumePoint(s.bench)!.mission.id).toBe("first-response");

    // Mission 3: First response.
    s.do(
      { type: "chooseDut", dutId: cell },
      { type: "inspectCell", cellId: cell },
      { type: "measureOcv", cellId: cell },
      ...CHANNELS.map((channel): BenchAction => ({ type: "connect", channel, contact: GOOD[channel] })),
      { type: "measureReference" },
      { type: "readTemperature", cellId: cell },
      { type: "measure", freqHz: 1000 },
    );
    expect(resumePoint(s.bench)!.mission.id).toBe("repeat");

    // Mission 4: Repeat.
    s.do({ type: "wait", seconds: 60 });
    for (let i = 0; i < 10; i++) s.do({ type: "measure", freqHz: 1000 });
    for (let i = 0; i < 10; i++) {
      s.reclip();
      s.do({ type: "readTemperature", cellId: cell }, { type: "measure", freqHz: 1000 });
    }
    s.do({ type: "answer", questionId: "repeat.cause", choice: "contact" });

    expect(resumePoint(s.bench)).toBeNull();
    expect(Object.keys(s.bench.missions)).toHaveLength(MISSIONS.flatMap((m) => m.steps).length);
    expect(s.bench.faults).toEqual([]);

    const r = repeatability(s.log, cell);
    expect(r.stationary!.n).toBeGreaterThanOrEqual(10);
    expect(r.reconnection!.n).toBe(10);
    expect(r.reconnection!.spread).toBeGreaterThan(r.stationary!.spread);
  });
});
