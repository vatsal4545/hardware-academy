import { describe, it, expect } from "vitest";
import { cellPreset, shuntPreset } from "@/lib/bench/dut";
import { PARTS, SOURCES, partById, partsOfKind } from "@/lib/bench/parts";

describe("parts catalogue", () => {
  it("has unique ids", () => {
    expect(new Set(PARTS.map((p) => p.id)).size).toBe(PARTS.length);
  });

  it("names a source document for every part", () => {
    const sources = Object.values(SOURCES) as string[];
    for (const p of PARTS) expect(sources, p.id).toContain(p.source);
  });

  it("keeps the real status: the Korad isn't bought, the adapters and lithium cells are pending", () => {
    expect(partById("korad")).toMatchObject({ status: "not-bought" });
    expect(partById("korad")!.note).toMatch(/First Board/);
    expect(partById("bnc-banana-adapters")).toMatchObject({ status: "pending" });
    expect(partById("cell-18650")).toMatchObject({ status: "pending" });
    expect(partById("cell-26650")).toMatchObject({ status: "pending" });
    expect(partById("eval-ad5941batz")).toMatchObject({ status: "owned" });
  });

  it("has the six shunts from the order list, with their values", () => {
    const values = partsOfKind("shunt").map((p) => shuntPreset(p.preset!)!.nominalMilliohm);
    expect(values).toEqual([1, 2, 7.5, 10, 25, 100]);
  });

  it("gives every cell and shunt a preset the simulator knows", () => {
    for (const p of PARTS.filter((x) => x.kind === "cell")) expect(cellPreset(p.preset ?? ""), p.id).toBeDefined();
    for (const p of PARTS.filter((x) => x.kind === "shunt")) expect(shuntPreset(p.preset ?? ""), p.id).toBeDefined();
  });

  it("marks simulated conditions as simulated", () => {
    for (const p of PARTS.filter((x) => x.leaking)) expect(p.note).toMatch(/Simulated/);
  });
});
