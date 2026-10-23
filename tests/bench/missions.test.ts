import { describe, it, expect } from "vitest";
import { MISSIONS, clippedCorrectly, identifiedIntactCell, missionById, missionComplete, newlyDone, resumePoint } from "@/lib/bench/missions";
import { initialBench } from "@/lib/bench/state";
import { CHANNELS } from "@/lib/bench/types";
import { clipped, poweredBench, readyBench, run } from "./helpers";

describe("missions", () => {
  it("has four stage-1 missions with unique step ids and learn cards", () => {
    expect(MISSIONS.map((m) => m.number)).toEqual([1, 2, 3, 4]);
    const ids = MISSIONS.flatMap((m) => m.steps.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MISSIONS) expect(m.learn.length).toBeGreaterThan(0);
  });

  it("has every step not done on a fresh bench (the walkthrough shows each one becoming done)", () => {
    const fresh = { bench: initialBench(1), log: [] };
    for (const step of MISSIONS.flatMap((m) => m.steps)) expect(step.done(fresh), step.id).toBe(false);
  });

  it("ticks steps in order: the strap waits for the mat", () => {
    const strapOnly = run(initialBench(1), { type: "wearStrap" });
    expect(newlyDone({ bench: strapOnly, log: [] })).toEqual([]);
    const both = run(strapOnly, { type: "groundMat" });
    expect(newlyDone({ bench: both, log: [] })).toEqual(["identify.mat", "identify.strap"]);
  });

  it("finishes mission 2 when numbers arrive with nothing connected", () => {
    const s = run(poweredBench(), { type: "measure", freqHz: 1000 });
    const ticked = newlyDone({ bench: s, log: [] });
    expect(ticked).toEqual(missionById("communicate")!.steps.map((st) => st.id));
  });

  it("only accepts an intact, identified cell", () => {
    const identify = (cellId: string) => run(initialBench(1), { type: "chooseDut", dutId: cellId }, { type: "inspectCell", cellId }, { type: "measureOcv", cellId });
    expect(identifiedIntactCell(identify("cell-d-duracell"))).toBe(true);
    expect(identifiedIntactCell(identify("cell-d-generic"))).toBe(false);
    expect(identifiedIntactCell(identify("cell-9v"))).toBe(false);
    expect(identifiedIntactCell(run(initialBench(1), { type: "chooseDut", dutId: "cell-d-duracell" }))).toBe(false);
  });

  it("only counts a correct four-wire hookup as clipped correctly", () => {
    expect(clippedCorrectly(readyBench())).toBe(true);
    expect(clippedCorrectly(clipped(poweredBench(), "cell-d-duracell", { "S+": { onForceWire: true } }))).toBe(false);
    expect(clippedCorrectly(clipped(poweredBench(), "cell-d-duracell", { "F-": { bite: "wrapper" } }))).toBe(false);
    expect(clippedCorrectly(run(readyBench(), { type: "disconnect", channel: "F-" }))).toBe(false);
  });

  it("keeps ticked steps ticked and resumes at the first unticked step", () => {
    const s = run(initialBench(1), { type: "markMission", stepIds: ["identify.mat", "identify.strap"] });
    expect(resumePoint(s)!.step.id).toBe("identify.log");
    expect(missionComplete(s, missionById("identify")!)).toBe(false);
    const everything = run(initialBench(1), { type: "markMission", stepIds: MISSIONS.flatMap((m) => m.steps.map((st) => st.id)) });
    expect(resumePoint(everything)).toBeNull();
  });

  it("doesn't give away the mission question's answer by its length", () => {
    for (const q of MISSIONS.flatMap((m) => m.steps.flatMap((st) => (st.question ? [st.question] : [])))) {
      const lengths = q.choices.map((c) => c.text.length);
      const key = q.choices.find((c) => c.id === q.correct)!.text.length;
      expect(lengths.filter((l) => l >= key).length).toBeGreaterThan(1);
    }
  });

  it("counts a lead left off as not laid out cleanly", () => {
    const s = run(clipped(poweredBench(), "cell-d-duracell"), { type: "layOut" });
    expect(missionById("identify")!.steps.find((st) => st.id === "identify.layout")!.done({ bench: s, log: [] })).toBe(false);
    expect(CHANNELS.every((ch) => s.channels[ch])).toBe(true);
  });
});
