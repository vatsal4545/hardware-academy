import { describe, it, expect } from "vitest";
import { arenas, initialState, step, sense, raycast, compileController, presets, ROBOT, instrumentLoops } from "@/lib/sim/robot";
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

describe("controller loop guard", () => {
  const budgetError = /looped more than 1,000,000 times in one tick \(sensors do not change inside a call\)/;

  it("rewrites loop conditions, including brace-less loops, and leaves strings and comments alone", () => {
    expect(instrumentLoops('while (x) y(); const s = "while (z)"; // for (;;)', "G")).toBe(
      'while (G() && (x)) y(); const s = "while (z)"; // for (;;)',
    );
    expect(instrumentLoops("for (;;) {} for (let i = 0; i < n; i++) f(i);", "G")).toBe(
      "for (; G();) {} for (let i = 0; G() && ( i < n); i++) f(i);",
    );
    expect(instrumentLoops("do k--; while (k > 0); for (const v of a) { use(v); }", "G")).toBe(
      "do k--; while (G() && (k > 0)); for (const v of a) { G(); use(v); }",
    );
  });

  it("stops a runaway finite loop that is over the budget", () => {
    const { control, error } = compileController(
      "function control(s){ let n = 0; for (let i = 0; i < 5000000; i++) n++; return { left: 1, right: 1 }; }",
    );
    expect(control).toBeUndefined();
    expect(error).toMatch(budgetError);
  });

  it("stops a while (true) loop at the dry call instead of hanging", () => {
    const { control, error } = compileController("function control(s){ while (true) {} return { left: 1, right: 1 }; }");
    expect(control).toBeUndefined();
    expect(error).toMatch(budgetError);
  });

  it("reports a sensor-polling loop that only spins at run time through lastError", () => {
    const { control, error } = compileController(
      "function control(s){ while (s.ultrasonic.front < 30) {} return { left: 1, right: 1 }; }",
    );
    expect(error).toBeUndefined();
    const nearWall = sense({ ...initialState(room), x: room.width - 20, y: 50, theta: 0 }, room);
    expect(nearWall.ultrasonic.front).toBeLessThan(30);
    expect(control!(nearWall, {})).toEqual({ left: 0, right: 0 });
    expect(control!.lastError).toMatch(budgetError);
  });

  it("cannot be swallowed by a try/catch in the learner's code", () => {
    expect(compileController("function control(s){ while (true) { try {} catch (e) {} } }").error).toMatch(budgetError);
    expect(
      compileController("function control(s){ try { while (true) {} } catch (e) {} return { left: 1, right: 1 }; }").error,
    ).toMatch(budgetError);
  });

  it("still runs legitimate loops and resets the budget on every call", () => {
    const code = `function control(s, memory) {
      let sum = 0;
      for (let i = 0; i < 600000; i++) sum += 1;
      let k = 0;
      while (k < 10) k++;
      do k--; while (k > 0);
      for (const v of [1, 2, 3]) { sum += v; }
      for (const key in { a: 1 }) sum += key.length;
      const text = "while (true) {}";
      // for (;;) {}
      return { left: sum === 600007 ? 1 : 0, right: k === 0 && text.length === 15 ? 1 : 0 };
    }`;
    const { control, error } = compileController(code);
    expect(error).toBeUndefined();
    // three calls of 600,000 passes each: only fine if the budget resets per call
    for (let call = 0; call < 3; call++) expect(control!(sense(initialState(room), room), {})).toEqual({ left: 1, right: 1 });
    expect(control!.lastError).toBeUndefined();
  });
});
