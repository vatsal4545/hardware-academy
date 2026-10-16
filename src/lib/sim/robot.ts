// Differential-drive robot simulator: pure functions, no DOM.
//
// World frame: centimetres and radians, x to the right, y up, angles counter-clockwise
// from +x. A positive yaw rate turns the robot to its left, which is what a faster right
// wheel does on a real robot. Canvas code flips y when drawing.

import { diffDrive } from "./kinematics";

export interface Vec {
  x: number;
  y: number;
}

export interface Segment {
  a: Vec;
  b: Vec;
}

export interface Circle {
  c: Vec;
  r: number;
}

export interface Arena {
  id: string;
  name: string;
  width: number;
  height: number;
  /** every wall, including the four segments of the outer boundary */
  walls: Segment[];
  obstacles: Circle[];
  /** tape for the line sensors; a closed track repeats its first point at the end */
  line?: Vec[];
  goal?: Vec;
  start: { x: number; y: number; theta: number };
}

export interface RobotState {
  x: number;
  y: number;
  theta: number;
  /** wheel speeds applied during the last step, cm/s */
  vl: number;
  vr: number;
  /** encoder counts as floats; `sense` reports whole ticks */
  ticksL: number;
  ticksR: number;
  crashed: boolean;
  t: number;
}

export interface Sensors {
  ultrasonic: { left: number; front: number; right: number };
  line: { left: 0 | 1; right: 0 | 1 };
  encoders: { left: number; right: number };
  yawRate: number;
  pose: { x: number; y: number; theta: number };
  goal?: Vec;
  t: number;
}

/** Wheel commands from -1 (full reverse) to 1 (full forward); out-of-range values are clamped. */
export interface WheelCommand {
  left: number;
  right: number;
}

export const ROBOT: {
  wheelBase: 12;
  radius: 7;
  maxSpeed: 40;
  ticksPerCm: 10;
  sensorRange: 150;
  sensorAngles: [45, 0, -45];
  lineSensorOffset: 6;
  lineSensorSpacing: 5;
  lineHalfWidth: 1.5;
} = {
  wheelBase: 12, // cm between the wheels
  radius: 7, // cm, the body is a circle
  maxSpeed: 40, // cm/s per wheel at command 1
  ticksPerCm: 10,
  sensorRange: 150, // cm, rated echo range of the ultrasonic sensors (rays beyond it count as open)
  sensorAngles: [45, 0, -45], // degrees from the heading: left, front, right
  lineSensorOffset: 6, // cm ahead of the centre
  lineSensorSpacing: 5, // cm between the two line sensors
  lineHalfWidth: 1.5, // cm, half the tape width
};

const DEG = Math.PI / 180;
/** Largest time slice `step` integrates before checking for a collision. */
const MAX_SUBSTEP = 0.01;

/** Wraps an angle to (-π, π]. */
export function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function cross(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

function raySegment(ox: number, oy: number, dx: number, dy: number, s: Segment): number | null {
  const ex = s.b.x - s.a.x;
  const ey = s.b.y - s.a.y;
  const denom = cross(dx, dy, ex, ey);
  if (Math.abs(denom) < 1e-12) return null; // parallel
  const wx = s.a.x - ox;
  const wy = s.a.y - oy;
  const t = cross(wx, wy, ex, ey) / denom;
  const u = cross(wx, wy, dx, dy) / denom;
  return t >= 0 && u >= 0 && u <= 1 ? t : null;
}

function rayCircle(ox: number, oy: number, dx: number, dy: number, c: Circle): number | null {
  const fx = ox - c.c.x;
  const fy = oy - c.c.y;
  const k = fx * fx + fy * fy - c.r * c.r;
  if (k <= 0) return 0; // the origin is inside the circle
  const b = fx * dx + fy * dy;
  const disc = b * b - k;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : null;
}

/** Distance from `origin` along `angleRad` to the first wall or obstacle, capped at `maxRange`. */
export function raycast(origin: Vec, angleRad: number, arena: Arena, maxRange: number): number {
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  let best = maxRange;
  for (const w of arena.walls) {
    const t = raySegment(origin.x, origin.y, dx, dy, w);
    if (t !== null && t < best) best = t;
  }
  for (const o of arena.obstacles) {
    const t = rayCircle(origin.x, origin.y, dx, dy, o);
    if (t !== null && t < best) best = t;
  }
  return Math.max(0, best);
}

/** Shortest distance from point p to the segment ab. */
export function distanceToSegment(p: Vec, a: Vec, b: Vec): number {
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const len2 = ex * ex + ey * ey;
  const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / len2));
  return Math.hypot(p.x - (a.x + u * ex), p.y - (a.y + u * ey));
}

/** Shortest distance from point p to an open polyline. */
export function distanceToPolyline(p: Vec, pts: Vec[]): number {
  if (pts.length === 0) return Infinity;
  if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, distanceToSegment(p, pts[i - 1], pts[i]));
  return best;
}

/** True when a robot body centred at (x, y) overlaps a wall or an obstacle. */
export function collides(x: number, y: number, arena: Arena): boolean {
  const p = { x, y };
  for (const w of arena.walls) if (distanceToSegment(p, w.a, w.b) < ROBOT.radius) return true;
  for (const o of arena.obstacles) if (Math.hypot(x - o.c.x, y - o.c.y) < o.r + ROBOT.radius) return true;
  return false;
}

/** Ultrasonic reading for a ray at `offsetDeg` from the heading, measured from the robot's edge. */
function ultrasonic(state: RobotState, offsetDeg: number, arena: Arena): number {
  // Rays travel the whole room, so a reading can exceed ROBOT.sensorRange (the UI shows such rays as "open").
  const reach = Math.hypot(arena.width, arena.height) + ROBOT.radius;
  return Math.max(0, raycast(state, state.theta + offsetDeg * DEG, arena, reach) - ROBOT.radius);
}

/** Line sensor positions in world coordinates. */
export function lineSensorPoints(state: { x: number; y: number; theta: number }): { left: Vec; right: Vec } {
  const c = Math.cos(state.theta);
  const s = Math.sin(state.theta);
  const fx = state.x + ROBOT.lineSensorOffset * c;
  const fy = state.y + ROBOT.lineSensorOffset * s;
  const h = ROBOT.lineSensorSpacing / 2;
  return { left: { x: fx - h * s, y: fy + h * c }, right: { x: fx + h * s, y: fy - h * c } };
}

function onLine(p: Vec, arena: Arena): 0 | 1 {
  return arena.line && distanceToPolyline(p, arena.line) <= ROBOT.lineHalfWidth ? 1 : 0;
}

/** Everything a controller can read this tick. */
export function sense(state: RobotState, arena: Arena): Sensors {
  const [leftDeg, frontDeg, rightDeg] = ROBOT.sensorAngles;
  const pts = lineSensorPoints(state);
  const sensors: Sensors = {
    ultrasonic: {
      left: ultrasonic(state, leftDeg, arena),
      front: ultrasonic(state, frontDeg, arena),
      right: ultrasonic(state, rightDeg, arena),
    },
    line: { left: onLine(pts.left, arena), right: onLine(pts.right, arena) },
    encoders: { left: Math.trunc(state.ticksL), right: Math.trunc(state.ticksR) },
    yawRate: diffDrive(state.vl, state.vr, ROBOT.wheelBase).omega,
    pose: { x: state.x, y: state.y, theta: wrapAngle(state.theta) },
    t: state.t,
  };
  if (arena.goal) sensors.goal = { x: arena.goal.x, y: arena.goal.y };
  return sensors;
}

function clampCommand(v: number): number {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}

function integrate(x: number, y: number, theta: number, v: number, omega: number, dt: number) {
  if (Math.abs(omega) > 1e-6) {
    // exact arc of radius v/ω
    const r = v / omega;
    const next = theta + omega * dt;
    return { x: x + r * (Math.sin(next) - Math.sin(theta)), y: y - r * (Math.cos(next) - Math.cos(theta)), theta: next };
  }
  return { x: x + v * Math.cos(theta) * dt, y: y + v * Math.sin(theta) * dt, theta: theta + omega * dt };
}

/** Advances the robot by dt seconds with a constant wheel command. A collision reverts the pose,
 *  sets `crashed`, and every later step keeps the robot stopped. */
export function step(state: RobotState, cmd: WheelCommand, arena: Arena, dt: number): RobotState {
  if (!(dt > 0)) return state;
  if (state.crashed) return { ...state, vl: 0, vr: 0, t: state.t + dt };
  const vl = clampCommand(cmd?.left) * ROBOT.maxSpeed;
  const vr = clampCommand(cmd?.right) * ROBOT.maxSpeed;
  const { v, omega } = diffDrive(vl, vr, ROBOT.wheelBase);
  const n = Math.max(1, Math.ceil(dt / MAX_SUBSTEP - 1e-9));
  const h = dt / n;
  let { x, y, theta } = state;
  for (let i = 0; i < n; i++) {
    const next = integrate(x, y, theta, v, omega, h);
    if (collides(next.x, next.y, arena)) {
      const moved = i * h;
      return {
        x,
        y,
        theta,
        vl: 0,
        vr: 0,
        ticksL: state.ticksL + vl * ROBOT.ticksPerCm * moved,
        ticksR: state.ticksR + vr * ROBOT.ticksPerCm * moved,
        crashed: true,
        t: state.t + dt,
      };
    }
    x = next.x;
    y = next.y;
    theta = next.theta;
  }
  return {
    x,
    y,
    theta,
    vl,
    vr,
    ticksL: state.ticksL + vl * ROBOT.ticksPerCm * dt,
    ticksR: state.ticksR + vr * ROBOT.ticksPerCm * dt,
    crashed: false,
    t: state.t + dt,
  };
}

export function initialState(arena: Arena): RobotState {
  const { x, y, theta } = arena.start;
  return { x, y, theta, vl: 0, vr: 0, ticksL: 0, ticksR: 0, crashed: false, t: 0 };
}

// ---------------------------------------------------------------------------------------------
// Arenas (all 300 × 200 cm)

function boundary(width: number, height: number): Segment[] {
  const c = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  return c.map((a, i) => ({ a, b: c[(i + 1) % 4] }));
}

/** Closed counter-clockwise rounded rectangle, starting at the left end of the bottom straight. */
function roundedRect(x0: number, y0: number, x1: number, y1: number, r: number, perCorner = 12): Vec[] {
  const pts: Vec[] = [];
  const corners: Array<[number, number, number]> = [
    [x1 - r, y0 + r, -90],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, 90],
    [x0 + r, y0 + r, 180],
  ];
  pts.push({ x: x0 + r, y: y0 });
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= perCorner; i++) {
      const a = (a0 + (90 * i) / perCorner) * DEG;
      pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  }
  pts.push({ x: x0 + r, y: y0 });
  return pts;
}

export const arenas: Arena[] = [
  {
    id: "open-room",
    name: "Open room",
    width: 300,
    height: 200,
    walls: boundary(300, 200),
    obstacles: [
      { c: { x: 110, y: 140 }, r: 20 },
      { c: { x: 190, y: 80 }, r: 24 },
      { c: { x: 250, y: 155 }, r: 16 },
    ],
    start: { x: 40, y: 40, theta: 0.5 },
  },
  {
    id: "line-track",
    name: "Line track",
    width: 300,
    height: 200,
    walls: boundary(300, 200),
    obstacles: [],
    line: roundedRect(35, 35, 265, 165, 40),
    // the tape runs under the left line sensor (2.5 cm left of centre), heading along the bottom straight
    start: { x: 110, y: 35 - ROBOT.lineSensorSpacing / 2, theta: 0 },
  },
  {
    id: "corridor",
    name: "L corridor",
    width: 300,
    height: 200,
    walls: [
      ...boundary(300, 200),
      // an L-shaped inner wall closes off the top-left block, leaving an L corridor
      { a: { x: 0, y: 80 }, b: { x: 210, y: 80 } },
      { a: { x: 210, y: 80 }, b: { x: 210, y: 200 } },
    ],
    obstacles: [],
    goal: { x: 255, y: 165 },
    start: { x: 30, y: 40, theta: 0 },
  },
];

// ---------------------------------------------------------------------------------------------
// Controllers

export type Controller = ((s: Sensors, memory: Record<string, unknown>) => WheelCommand) & {
  /** message of the most recent error thrown by the learner's code (the call returned a stop command) */
  lastError?: string;
};

function messageOf(e: unknown): string {
  if (e instanceof Error) {
    if (e instanceof ReferenceError && /\bcontrol\b/.test(e.message)) {
      return `${e.name}: ${e.message}. Define function control(sensors, memory) that returns { left, right }.`;
    }
    return `${e.name}: ${e.message}`;
  }
  return String(e);
}

function sampleSensors(): Sensors {
  return {
    ultrasonic: { left: 100, front: 100, right: 100 },
    line: { left: 0, right: 0 },
    encoders: { left: 0, right: 0 },
    yawRate: 0,
    pose: { x: 50, y: 50, theta: 0 },
    goal: { x: 150, y: 100 },
    t: 0,
  };
}

const SHAPE_ERROR = "control(sensors, memory) must return an object like { left: 0.5, right: 0.5 }.";

/** Compiles learner code that defines `function control(sensors, memory)`. The code runs with
 *  `new Function` in the learner's own browser. Syntax errors and errors thrown by a first dry
 *  call come back as `error`; at run time the returned controller never throws: a failing call
 *  returns a stop command and records the message in `control.lastError`. */
export function compileController(code: string): { control?: Controller; error?: string } {
  let fn: (sensors: Sensors, memory: Record<string, unknown>) => unknown;
  try {
    fn = new Function("sensors", "memory", `${code}\nreturn control(sensors, memory);`) as typeof fn;
  } catch (e) {
    return { error: messageOf(e) };
  }
  try {
    const probe = fn(sampleSensors(), {});
    if (probe === null || typeof probe !== "object") return { error: SHAPE_ERROR };
  } catch (e) {
    return { error: messageOf(e) };
  }
  const control: Controller = (s, memory) => {
    try {
      const out = fn(s, memory);
      if (out === null || typeof out !== "object") {
        control.lastError = SHAPE_ERROR;
        return { left: 0, right: 0 };
      }
      const cmd = out as Partial<WheelCommand>;
      return { left: Number(cmd.left) || 0, right: Number(cmd.right) || 0 };
    } catch (e) {
      control.lastError = messageOf(e);
      return { left: 0, right: 0 };
    }
  };
  return { control };
}

// ---------------------------------------------------------------------------------------------
// Presets

export interface Preset {
  id: string;
  name: string;
  description: string;
  arenaId: string;
  code: string;
}

export const presets: Preset[] = [
  {
    id: "obstacle-avoid",
    name: "Obstacle avoid",
    description: "Cruise, slow down when something is ahead, and turn away from the nearest short ray.",
    arenaId: "open-room",
    code: `// Obstacle avoidance with three ultrasonic rays (cm from the robot's edge).
// Wheel commands run from -1 (full reverse) to 1 (full forward, 40 cm/s).
function control(s, memory) {
  const { left, front, right } = s.ultrasonic;
  const nearest = Math.min(left, front, right);
  const speed = front < 30 ? 0.2 : 0.6;           // slow down when something is ahead

  if (nearest > 40) {                              // nothing close: cruise straight
    memory.turn = 0;
    return { left: speed, right: speed };
  }

  let turn;                                        // +1 turns left, -1 turns right
  if (nearest === front) {
    // Wall ahead: pick the more open side once and keep it until the front clears,
    // so the robot does not flip-flop in front of the wall.
    if (!memory.turn) memory.turn = left < right ? -1 : 1;
    turn = memory.turn;
  } else {
    turn = nearest === left ? -1 : 1;              // turn away from the nearest side ray
    memory.turn = 0;
  }
  const v = front < 15 || nearest < 10 ? 0 : speed; // very close: spin in place
  return { left: v - 0.45 * turn, right: v + 0.45 * turn };
}
`,
  },
  {
    id: "line-follow",
    name: "Line follow",
    description:
      "P control on the left/right line-sensor difference; spin toward the side that saw the tape last when it is lost.",
    arenaId: "line-track",
    code: `// Line following with two downward sensors 5 cm apart over a 3 cm tape.
// On a straight the tape sits between the sensors, so both read 0.
function control(s, memory) {
  const { left, right } = s.line;
  const error = left - right;                      // +1 tape under the left sensor, -1 under the right
  if (error !== 0) {
    memory.side = error;                           // remember where the tape was
    memory.seenAt = s.t;
  }
  const side = memory.side || 1;

  if (s.t - (memory.seenAt || 0) > 1) {            // lost for a second: spin to search
    return { left: -0.3 * side, right: 0.3 * side };
  }

  // P on the sensor difference, plus a gentle pull toward the side that saw the tape last
  const base = 0.6;
  const turn = 0.35 * error + 0.06 * side;
  return { left: base - turn, right: base + turn };
}
`,
  },
  {
    id: "wall-follow",
    name: "Wall follow",
    description: "Keep the right ray near 25 cm with P control; turn left on the spot when the front ray drops below 25 cm.",
    arenaId: "corridor",
    code: `// Right-hand wall following.
function control(s, memory) {
  const { front, right } = s.ultrasonic;
  if (front < 25) {                                // wall ahead: turn left on the spot
    return { left: -0.3, right: 0.3 };
  }
  const error = Math.min(right, 60) - 25;          // + means too far from the wall
  const turn = Math.max(-0.3, Math.min(0.3, 0.03 * error));
  return { left: 0.5 + turn, right: 0.5 - turn };  // too far: steer right, toward the wall
}
`,
  },
  {
    id: "go-to-goal",
    name: "Go to goal",
    description:
      "Steer at twice the heading error toward the goal and stop within 10 cm; follow any wall that blocks the way.",
    arenaId: "corridor",
    code: `// Go to goal on the pose estimate. When a wall blocks the way, follow it
// until the goal is ahead and the path is clear (a simple "bug" algorithm).
function control(s, memory) {
  if (!s.goal) return { left: 0, right: 0 };       // this arena has no goal
  const dx = s.goal.x - s.pose.x;
  const dy = s.goal.y - s.pose.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) return { left: 0, right: 0 };     // arrived

  let error = Math.atan2(dy, dx) - s.pose.theta;
  error = Math.atan2(Math.sin(error), Math.cos(error));   // wrap to -pi..pi
  const { left, front, right } = s.ultrasonic;

  // something close: follow that wall, keeping it on whichever side is nearer
  if (!memory.wall && (front < 30 || Math.min(left, right) < 20)) {
    memory.wall = left < right ? 1 : -1;           // +1 wall on the left, -1 on the right
  }
  // goal roughly ahead and nothing in the way: leave the wall
  if (memory.wall && Math.abs(error) < 0.3 && front > Math.min(dist, 60) && Math.min(left, right) > 30) {
    memory.wall = 0;
  }

  let v, omega;
  if (memory.wall) {
    const side = memory.wall;
    const gap = Math.min(side > 0 ? left : right, 60) - 25;   // + means too far from the wall
    omega = front < 30 ? -1.5 * side : side * Math.max(-1, Math.min(1, 0.06 * gap));
    v = front < 15 ? 0 : 18;
  } else {
    omega = 2 * error;                             // rad/s
    v = 25 * Math.max(0, Math.cos(error));         // cm/s, slow while facing away
  }
  // wheel speeds from (v, omega): wheel base 12 cm, top speed 40 cm/s
  return { left: (v - omega * 6) / 40, right: (v + omega * 6) / 40 };
}
`,
  },
];
