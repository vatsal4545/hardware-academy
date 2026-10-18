import { describe, it, expect } from "vitest";
import { parts, partBox, nets, connectorPins } from "@/components/viz/pcb/SchematicToLayoutBoard";
import { allNets, allParts, IO35_PAD, PART_ROLES, revBNets, revBParts, STATIONS } from "@/components/viz/pcb/BoardInAction.board";
import { BOARD_DEFAULTS, boardModel } from "@/lib/sim/board";

const overlaps = (a: ReturnType<typeof partBox>, b: ReturnType<typeof partBox>) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe("Rev B board data", () => {
  it("adds R4, R5 and C9 without overlapping any existing part", () => {
    expect(revBParts.map((p) => p.ref)).toEqual(["R4", "R5", "C9"]);
    for (const p of revBParts) for (const q of parts) expect(overlaps(partBox(p), partBox(q)), `${p.ref} vs ${q.ref}`).toBe(false);
    expect(allParts).toHaveLength(parts.length + 3);
    expect(allNets).toHaveLength(nets.length + revBNets.length);
  });

  it("the divider nets start on the VM trace and end on the IO35 pad", () => {
    const feed = revBNets.find((n) => n.id === "VBAT_SENSE_FEED")!;
    expect(feed.routes[0].pts[0]).toEqual([15.0, 26.75]);
    const node = revBNets.find((n) => n.id === "VBAT_SENSE")!;
    expect(node.taps.some((t) => t.ref === "U1" && t.pin === "IO35")).toBe(true);
    expect(node.routes.some((r) => r.pts[r.pts.length - 1][0] === IO35_PAD[0] && r.pts[r.pts.length - 1][1] === IO35_PAD[1])).toBe(true);
  });

  it("every station names real parts and real nets, in the lesson's order", () => {
    const refs = new Set(allParts.map((p) => p.ref));
    const netIds = new Set(allNets.map((n) => n.id));
    expect(STATIONS.map((s) => s.id)).toEqual(["fet", "kcl", "ldo", "led", "divider", "en", "decoupling", "winding"]);
    for (const s of STATIONS) {
      for (const r of s.parts) expect(refs.has(r), `${s.id}: ${r}`).toBe(true);
      for (const n of s.nets) expect(netIds.has(n), `${s.id}: ${n}`).toBe(true);
      expect(s.controls.length).toBeGreaterThan(0);
      expect(s.flows.length).toBeGreaterThan(0);
    }
  });

  it("every part except the mounting holes has a role with readings that are real numbers", () => {
    const m = boardModel(BOARD_DEFAULTS);
    const expected = allParts.filter((p) => p.kind !== "hole").map((p) => p.ref).sort();
    expect(expected).toHaveLength(28);
    expect(Object.keys(PART_ROLES).sort()).toEqual(expected);
    for (const [ref, role] of Object.entries(PART_ROLES)) {
      expect(role.role.length, ref).toBeGreaterThan(20);
      const readings = role.readings(m, BOARD_DEFAULTS);
      expect(readings.length, ref).toBeGreaterThan(0);
      for (const r of readings) expect(r.value, `${ref}: ${r.label}`).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it("leaves the shared board data untouched (J1 still has two pins, 29 parts)", () => {
    expect(connectorPins(parts.find((p) => p.ref === "J1")!)).toHaveLength(2);
    expect(parts).toHaveLength(29);
  });
});
