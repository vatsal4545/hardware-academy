import { describe, it, expect } from "vitest";
import { arenas, initialState, step, sense, raycast, compileController, presets, ROBOT } from "@/lib/sim/robot";
const room = arenas.find(a => a.id === "open-room")!;
describe("robot sim", () => {
  it("drives straight at max speed", () => {
    let s = { ...initialState(room), x: 50, y: 50, theta: 0 };
    for (let i = 0; i < 100; i++) s = step(s, { left: 1, right: 1 }, room, 0.01);
    expect(s.x).toBeCloseTo(50 + ROBOT.maxSpeed, 0); expect(s.y).toBeCloseTo(50, 1);
  });
  it("turns in place", () => {
    let s = { ...initialState(room), x: 50, y: 50, theta: 0 };
    for (let i = 0; i < 50; i++) s = step(s, { left: -1, right: 1 }, room, 0.01);
    expect(s.theta).toBeGreaterThan(0.5); expect(s.x).toBeCloseTo(50, 1);
  });
  it("raycasts to the right wall", () => {
    expect(raycast({ x: 50, y: 50 }, 0, { ...room, obstacles: [] }, 500)).toBeCloseTo(room.width - 50, 0);
  });
  it("front ultrasonic matches raycast", () => {
    const s = { ...initialState(room), x: 50, y: 50, theta: 0 };
    expect(sense(s, { ...room, obstacles: [] }).ultrasonic.front).toBeCloseTo(room.width - 50 - ROBOT.radius, 0);
  });
  it("stops and flags crash on wall contact", () => {
    let s = { ...initialState(room), x: room.width - ROBOT.radius - 1, y: 50, theta: 0 };
    s = step(s, { left: 1, right: 1 }, room, 0.1);
    expect(s.crashed).toBe(true);
  });
  it("line sensors see the track", () => {
    const track = arenas.find(a => a.id === "line-track")!;
    const s = initialState(track);                    // start is on the line, heading along it
    const l = sense(s, track).line;
    expect(l.left + l.right).toBeGreaterThanOrEqual(1);
  });
  it("compiles valid and rejects invalid controllers", () => {
    expect(compileController("function control(s){ return {left:1,right:1}; }").control).toBeTypeOf("function");
    expect(compileController("function control(s{").error).toBeTruthy();
  });
  it("every preset runs 15 s in its arena without crashing", () => {
    for (const p of presets) {
      const arena = arenas.find(a => a.id === p.arenaId)!;
      const { control, error } = compileController(p.code);
      expect(error).toBeUndefined();
      let s = initialState(arena); const memory: Record<string, unknown> = {};
      for (let i = 0; i < 1500; i++) s = step(s, control!(sense(s, arena), memory), arena, 0.01);
      expect(s.crashed).toBe(false);
    }
  });
});
