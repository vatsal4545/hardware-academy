"use client";

import type { Ref } from "react";
import { vizColors } from "@/components/viz/shared";
import { ROBOT, lineSensorPoints, type Arena, type RobotState, type Sensors, type Vec } from "@/lib/sim/robot";

/** Logical drawing size; the backing store is scaled by devicePixelRatio. */
export const CANVAS_W = 640;
export const CANVAS_H = 427;

const DEG = Math.PI / 180;
/** Radius of the goal zone the presets stop inside, cm. */
export const GOAL_RADIUS = 10;

export interface RobotScene {
  arena: Arena;
  state: RobotState;
  sensors: Sensors;
  trail: Vec[];
}

/** Draws the arena and the robot. A missing canvas or 2-D context (jsdom) is a no-op. */
export function drawRobotScene(canvas: HTMLCanvasElement | null, scene: RobotScene): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const pw = Math.round(CANVAS_W * dpr);
  const ph = Math.round(CANVAS_H * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const { arena, state, sensors, trail } = scene;
  const k = Math.min(CANVAS_W / arena.width, CANVAS_H / arena.height);
  const ox = (CANVAS_W - arena.width * k) / 2;
  const oy = (CANVAS_H - arena.height * k) / 2;
  // world (cm, y up) -> canvas (px, y down)
  const X = (x: number) => ox + x * k;
  const Y = (y: number) => oy + (arena.height - y) * k;

  ctx.globalAlpha = 1;
  ctx.setLineDash([]);
  ctx.fillStyle = vizColors.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // floor grid, 20 cm
  ctx.strokeStyle = vizColors.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= arena.width; x += 20) {
    ctx.moveTo(X(x), Y(0));
    ctx.lineTo(X(x), Y(arena.height));
  }
  for (let y = 0; y <= arena.height; y += 20) {
    ctx.moveTo(X(0), Y(y));
    ctx.lineTo(X(arena.width), Y(y));
  }
  ctx.stroke();

  // tape
  if (arena.line && arena.line.length > 1) {
    ctx.strokeStyle = vizColors.silk;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2 * ROBOT.lineHalfWidth * k;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    arena.line.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // goal zone
  if (arena.goal) {
    const gx = X(arena.goal.x);
    const gy = Y(arena.goal.y);
    ctx.fillStyle = vizColors.amber;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(gx, gy, GOAL_RADIUS * k, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = vizColors.amber;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(gx - 5, gy);
    ctx.lineTo(gx + 5, gy);
    ctx.moveTo(gx, gy - 5);
    ctx.lineTo(gx, gy + 5);
    ctx.stroke();
  }

  // obstacles
  for (const o of arena.obstacles) {
    ctx.beginPath();
    ctx.arc(X(o.c.x), Y(o.c.y), o.r * k, 0, 2 * Math.PI);
    ctx.fillStyle = "#1f2937";
    ctx.fill();
    ctx.strokeStyle = vizColors.muted;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // walls
  ctx.strokeStyle = vizColors.muted;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const w of arena.walls) {
    ctx.moveTo(X(w.a.x), Y(w.a.y));
    ctx.lineTo(X(w.b.x), Y(w.b.y));
  }
  ctx.stroke();

  // trail
  if (trail.length > 1) {
    ctx.strokeStyle = vizColors.cyan;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    trail.forEach((p, i) => (i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ultrasonic rays: green when an echo comes back within the rated range, red (dashed) when open
  const readings = [sensors.ultrasonic.left, sensors.ultrasonic.front, sensors.ultrasonic.right];
  ROBOT.sensorAngles.forEach((deg, i) => {
    const a = state.theta + deg * DEG;
    const reading = readings[i];
    const hit = reading <= ROBOT.sensorRange;
    const len = Math.min(reading, ROBOT.sensorRange);
    const sx = state.x + ROBOT.radius * Math.cos(a);
    const sy = state.y + ROBOT.radius * Math.sin(a);
    const ex = state.x + (ROBOT.radius + len) * Math.cos(a);
    const ey = state.y + (ROBOT.radius + len) * Math.sin(a);
    ctx.strokeStyle = hit ? vizColors.green : vizColors.red;
    ctx.globalAlpha = hit ? 0.85 : 0.5;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(hit ? [] : [5, 4]);
    ctx.beginPath();
    ctx.moveTo(X(sx), Y(sy));
    ctx.lineTo(X(ex), Y(ey));
    ctx.stroke();
    ctx.setLineDash([]);
    if (hit) {
      ctx.fillStyle = vizColors.green;
      ctx.beginPath();
      ctx.arc(X(ex), Y(ey), 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });

  // robot: body, wheels, heading arrow (drawn in a frame where +x is forward and +y is the robot's right)
  const r = ROBOT.radius * k;
  ctx.save();
  ctx.translate(X(state.x), Y(state.y));
  ctx.rotate(-state.theta);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 2 * Math.PI);
  ctx.fillStyle = "#1a2235";
  ctx.fill();
  const wheelLen = 5 * k;
  const wheelW = 1.8 * k;
  ctx.fillStyle = "#4b5563";
  for (const side of [-1, 1]) {
    ctx.fillRect(-wheelLen / 2, side * (ROBOT.wheelBase / 2) * k - wheelW / 2, wheelLen, wheelW);
  }
  ctx.strokeStyle = state.crashed ? vizColors.red : vizColors.cyan;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 2 * Math.PI);
  ctx.stroke();
  // heading arrow, kept inside the body so it does not hide the line sensors at the nose
  ctx.strokeStyle = vizColors.text;
  ctx.fillStyle = vizColors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, 0);
  ctx.lineTo(r * 0.5, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.8, 0);
  ctx.lineTo(r * 0.42, -r * 0.25);
  ctx.lineTo(r * 0.42, r * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // line sensors: amber when over the tape
  const pts = lineSensorPoints(state);
  for (const [p, on] of [
    [pts.left, sensors.line.left],
    [pts.right, sensors.line.right],
  ] as const) {
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), 2, 0, 2 * Math.PI);
    ctx.fillStyle = on ? vizColors.amber : "#4b5563";
    ctx.fill();
  }

  if (state.crashed) {
    ctx.strokeStyle = vizColors.red;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(X(state.x), Y(state.y), r + 6, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export interface RobotCanvasProps {
  ref?: Ref<HTMLCanvasElement>;
  /** accessible description of what the canvas shows */
  label: string;
}

/** The simulator's drawing surface. RobotSim paints it with `drawRobotScene` from its animation loop. */
export function RobotCanvas({ ref, label }: RobotCanvasProps) {
  return (
    <canvas
      ref={ref}
      width={CANVAS_W}
      height={CANVAS_H}
      role="img"
      aria-label={label}
      className="block h-auto w-full rounded-lg border border-border bg-bg"
    >
      {label}
    </canvas>
  );
}
