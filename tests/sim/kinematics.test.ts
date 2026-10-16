import { describe, it, expect } from "vitest";
import { fk2, ik2, diffDrive } from "@/lib/sim/kinematics";

describe("kinematics", () => {
  it("fk2 straight arm", () => {
    const p = fk2(1, 1, 0, 0);
    expect(p.x).toBeCloseTo(2);
    expect(p.y).toBeCloseTo(0);
    expect(p.elbow.x).toBeCloseTo(1);
  });

  it("ik2 round-trips", () => {
    for (const [t1, t2] of [
      [0.3, 0.8],
      [1.2, -0.5],
      [-0.4, 1.9],
    ]) {
      const p = fk2(1, 0.8, t1, t2);
      const s = ik2(1, 0.8, p.x, p.y, t2 < 0);
      expect(s).not.toBeNull();
      const q = fk2(1, 0.8, s!.t1, s!.t2);
      expect(q.x).toBeCloseTo(p.x, 6);
      expect(q.y).toBeCloseTo(p.y, 6);
    }
  });

  it("ik2 returns null when unreachable", () => {
    expect(ik2(1, 1, 3, 0)).toBeNull();
    expect(ik2(1, 0.5, 0.1, 0)).toBeNull();
  });

  it("diffDrive", () => {
    expect(diffDrive(1, 1, 0.1)).toEqual({ v: 1, omega: 0 });
    expect(diffDrive(-1, 1, 2).omega).toBeCloseTo(1);
    expect(diffDrive(-1, 1, 2).v).toBeCloseTo(0);
  });
});
